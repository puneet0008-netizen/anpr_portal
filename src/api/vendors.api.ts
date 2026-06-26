import api from './axios'
import type { Vendor, VendorDetail, CreateVendorDto, PaginatedResponse, PaginationParams, SearchParams } from '@/types'

type P = PaginationParams & SearchParams

/** Backend may return Mongo `_id` or snake_case fields — normalize for the UI. */
const normalizeVendor = <T extends Vendor>(row: T & { _id?: string }): T => ({
  ...row,
  id: row.id || row._id || '',
  vendorName: row.vendorName || (row as { vendor_name?: string }).vendor_name || '',
  contactPerson: row.contactPerson || (row as { contact_person?: string }).contact_person || '',
  registeredAddress: row.registeredAddress || (row as { registered_address?: string }).registered_address || '',
  primaryService: row.primaryService || (row as { primary_service?: Vendor['primaryService'] }).primary_service || 'Other',
  contractStartDate: row.contractStartDate || (row as { contract_start_date?: string }).contract_start_date || '',
  assignedSiteId: row.assignedSiteId || (row as { assigned_site_id?: string }).assigned_site_id,
  assignedSiteName: row.assignedSiteName || (row as { assigned_site_name?: string }).assigned_site_name,
  createdAt: row.createdAt || (row as { created_at?: string }).created_at || '',
  updatedAt: row.updatedAt || (row as { updated_at?: string }).updated_at || '',
})

export const getVendors = (p?: P) =>
  api.get<PaginatedResponse<Vendor>>('/vendors', { params: p }).then((r) => ({
    ...r,
    data: {
      ...r.data,
      data: r.data.data.map(normalizeVendor),
    },
  }))

export const getVendorDetail = (id: string) =>
  api.get<{ data: VendorDetail }>(`/vendors/${id}`, { silent: true }).then((r) => ({
    ...r,
    data: { ...r.data, data: normalizeVendor(r.data.data) },
  }))

export const createVendor    = (d: CreateVendorDto) => api.post<Vendor>('/vendors', d).then((r) => ({ ...r, data: normalizeVendor(r.data) }))
export const updateVendor    = (id: string, d: Partial<CreateVendorDto>) => api.patch<Vendor>(`/vendors/${id}`, d).then((r) => ({ ...r, data: normalizeVendor(r.data) }))
export const deleteVendor    = (id: string) => api.delete(`/vendors/${id}`)
export const getVendorList   = () =>
  api.get<{ data: (Pick<Vendor, 'id' | 'vendorName'> & { assignedSiteId?: string; assignedSiteName?: string })[] }>('/vendors/list').then((r) => ({
    ...r,
    data: {
      ...r.data,
      data: r.data.data.map((v) => ({ ...v, id: v.id || (v as { _id?: string })._id || '' })),
    },
  }))
