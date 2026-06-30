import api from './axios'
import type { ParkingSession, RecordEntryDto, RecordExitDto, PaginatedResponse, PaginationParams } from '@/types'

type SessionParams = PaginationParams & {
  status?: string
  numberPlate?: string
  userId?: string
  startDate?: string
  endDate?: string
}

export const getSessions     = (p?: SessionParams) =>
  api.get<PaginatedResponse<ParkingSession>>('/sessions', { params: p })

export const getActiveSessions = () =>
  api.get<{ data: ParkingSession[]; success: boolean }>('/sessions/active')

export const getSessionById  = (id: string) =>
  api.get<{ data: ParkingSession; success: boolean }>(`/sessions/${id}`)

export const recordEntry     = (d: RecordEntryDto) =>
  api.post<{ data: ParkingSession; success: boolean }>('/sessions/entry', d)

export const recordExit      = (d: RecordExitDto) =>
  api.post<{ data: ParkingSession; success: boolean }>('/sessions/exit', d)

export const deleteSession   = (id: string) =>
  api.delete<{ success: boolean; message: string }>(`/sessions/${id}`)

export type PlateLookupResult = {
  plate: string
  isAlreadyParked: boolean
  activeSessionId: string | null
  registered: boolean
  vehicle: { id: string; vehicleName: string; vehicleModel: string; vehicleType: string } | null
  user: { id: string; name: string; phone: string; email: string } | null
}

export const lookupByPlate = (plate: string) =>
  api.get<{ data: PlateLookupResult; success: boolean }>('/sessions/lookup', { params: { plate } })
