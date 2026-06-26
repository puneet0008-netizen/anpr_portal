import api from './axios'
import type {
  Vendor, VendorDetail, CreateVendorDto, PaginatedResponse,
  PaginationParams, SearchParams, PrimaryService,
} from '@/types'

type P = PaginationParams & SearchParams

/** Raw API row — Mongo `_id` and/or snake_case field names. */
type VendorSnakeRow = {
  _id?: string
  vendor_name?: string
  contact_person?: string
  registered_address?: string
  primary_service?: PrimaryService
  contract_start_date?: string
  assigned_site_id?: string
  assigned_site_name?: string
  created_at?: string
  updated_at?: string
}

const normalizeVendorBase = (row: Vendor & VendorSnakeRow): Vendor => ({
  ...row,
  id:               row.id || row._id || '',
  vendorName:       row.vendorName || row.vendor_name || '',
  contactPerson:    row.contactPerson || row.contact_person || '',
  assignedSiteId:   row.assignedSiteId || row.assigned_site_id,
  assignedSiteName: row.assignedSiteName || row.assigned_site_name,
  createdAt:        row.createdAt || row.created_at || '',
  updatedAt:        row.updatedAt || row.updated_at || '',
})

const normalizeVendorDetail = (row: VendorDetail & VendorSnakeRow): VendorDetail => ({
  ...normalizeVendorBase(row),
  gstin:                row.gstin ?? '',
  registeredAddress:    row.registeredAddress ?? row.registered_address ?? '',
  primaryService:       row.primaryService ?? row.primary_service ?? 'Other',
  contractStartDate:    row.contractStartDate ?? row.contract_start_date ?? '',
  assignedParkingSites: row.assignedParkingSites ?? [],
  cameraIds:            row.cameraIds ?? [],
  contractDocuments:    row.contractDocuments ?? [],
})

export const getVendors = (p?: P) =>
  api.get<PaginatedResponse<Vendor>>('/vendors', { params: p }).then((r) => ({
    ...r,
    data: {
      ...r.data,
      data: r.data.data.map((v) => normalizeVendorBase(v as Vendor & VendorSnakeRow)),
    },
  }))

export const getVendorDetail = (id: string) =>
  api.get<{ data: VendorDetail }>(`/vendors/${id}`, { silent: true }).then((r) => ({
    ...r,
    data: { ...r.data, data: normalizeVendorDetail(r.data.data as VendorDetail & VendorSnakeRow) },
  }))

export const createVendor = (d: CreateVendorDto) =>
  api.post<Vendor>('/vendors', d).then((r) => ({ ...r, data: normalizeVendorBase(r.data as Vendor & VendorSnakeRow) }))

export const updateVendor = (id: string, d: Partial<CreateVendorDto>) =>
  api.patch<Vendor>(`/vendors/${id}`, d).then((r) => ({ ...r, data: normalizeVendorBase(r.data as Vendor & VendorSnakeRow) }))

export const deleteVendor = (id: string) => api.delete(`/vendors/${id}`)

export const getVendorList = () =>
  api.get<{ data: (Pick<Vendor, 'id' | 'vendorName'> & { assignedSiteId?: string; assignedSiteName?: string })[] }>('/vendors/list').then((r) => ({
    ...r,
    data: {
      ...r.data,
      data: r.data.data.map((v) => ({ ...v, id: v.id || (v as { _id?: string })._id || '' })),
    },
  }))
