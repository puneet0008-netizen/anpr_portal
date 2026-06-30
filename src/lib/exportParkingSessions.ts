import ExcelJS from 'exceljs'
import JSZip from 'jszip'

import * as sessionsApi from '@/api/parking-sessions.api'
import { formatDateTime, resolveImageUrl } from '@/lib/utils'
import type { ParkingSession } from '@/types'

type SessionListParams = Parameters<typeof sessionsApi.getSessions>[0]

const IMAGE_FIELDS = [
  { key: 'entryPlateImageUrl' as const, suffix: 'entry_plate' },
  { key: 'entryCarImageUrl' as const, suffix: 'entry_car' },
  { key: 'exitPlateImageUrl' as const, suffix: 'exit_plate' },
  { key: 'exitCarImageUrl' as const, suffix: 'exit_car' },
]

function sessionStatusLabel(s: ParkingSession) {
  const st = String(s.status ?? '')
  if (st === 'active' || st === 'IN' || !s.exitTime) return 'IN'
  return 'OUT'
}

function safeBaseName(plate: string, id: string) {
  return `${plate}_${id.slice(0, 8)}`.replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase()
}

function imageExtension(url: string) {
  const lower = url.split('?')[0].toLowerCase()
  if (lower.endsWith('.png')) return 'png'
  if (lower.endsWith('.webp')) return 'webp'
  return 'jpg'
}

async function fetchImageBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null
    const headers: HeadersInit = {}
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(url, { credentials: 'include', headers })
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

export async function fetchAllSessions(params?: SessionListParams): Promise<ParkingSession[]> {
  const limit = 200
  let page = 1
  const rows: ParkingSession[] = []

  while (true) {
    const res = await sessionsApi.getSessions({ ...params, page, limit })
    rows.push(...res.data.data)
    const { total } = res.data.meta
    if (rows.length >= total || res.data.data.length === 0) break
    page += 1
  }

  return rows
}

export async function exportParkingSessionsZip(
  sessions: ParkingSession[],
  fileLabel: string,
  onProgress?: (message: string) => void,
): Promise<void> {
  if (!sessions.length) {
    throw new Error('No parking sessions to export')
  }

  const zip = new JSZip()
  const imagesFolder = zip.folder('images')
  if (!imagesFolder) throw new Error('Could not create images folder')

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'ANPR Portal'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Parking Sessions')
  sheet.columns = [
    { header: 'Session ID', key: 'id', width: 38 },
    { header: 'Plate', key: 'numberPlate', width: 14 },
    { header: 'User Name', key: 'userName', width: 22 },
    { header: 'User Phone', key: 'userPhone', width: 16 },
    { header: 'Vehicle', key: 'vehicleName', width: 18 },
    { header: 'Entry Time', key: 'entryTime', width: 20 },
    { header: 'Exit Time', key: 'exitTime', width: 20 },
    { header: 'Duration', key: 'durationFormatted', width: 14 },
    { header: 'Status', key: 'status', width: 8 },
    { header: 'Fee (INR)', key: 'fee', width: 10 },
    { header: 'Entry Plate Image', key: 'entryPlateImage', width: 28 },
    { header: 'Entry Car Image', key: 'entryCarImage', width: 28 },
    { header: 'Exit Plate Image', key: 'exitPlateImage', width: 28 },
    { header: 'Exit Car Image', key: 'exitCarImage', width: 28 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8F0FE' },
  }

  for (let i = 0; i < sessions.length; i += 1) {
    const s = sessions[i]
    onProgress?.(`Processing ${i + 1} of ${sessions.length}…`)

    const base = safeBaseName(s.numberPlate, s.id)
    const imagePaths: Record<string, string> = {}

    for (const { key, suffix } of IMAGE_FIELDS) {
      const url = resolveImageUrl(s[key])
      if (!url) continue

      const buffer = await fetchImageBuffer(url)
      if (!buffer) continue

      const ext = imageExtension(url)
      const fileName = `${base}_${suffix}.${ext}`
      imagesFolder.file(fileName, buffer)
      imagePaths[suffix] = `images/${fileName}`
    }

    sheet.addRow({
      id: s.id,
      numberPlate: s.numberPlate,
      userName: s.userName ?? '',
      userPhone: s.userPhone ?? '',
      vehicleName: [s.vehicleName, s.vehicleModel].filter(Boolean).join(' '),
      entryTime: formatDateTime(s.entryTime),
      exitTime: s.exitTime ? formatDateTime(s.exitTime) : 'Still parked',
      durationFormatted: s.durationFormatted ?? '',
      status: sessionStatusLabel(s),
      fee: s.fee ?? 0,
      entryPlateImage: imagePaths.entry_plate ?? '',
      entryCarImage: imagePaths.entry_car ?? '',
      exitPlateImage: imagePaths.exit_plate ?? '',
      exitCarImage: imagePaths.exit_car ?? '',
    })
  }

  onProgress?.('Building Excel file…')
  const xlsxBuffer = await workbook.xlsx.writeBuffer()
  const stamp = new Date().toISOString().slice(0, 10)
  zip.file(`parking-sessions-${fileLabel}-${stamp}.xlsx`, xlsxBuffer)

  onProgress?.('Preparing download…')
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `parking-sessions-${fileLabel}-${stamp}.zip`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
