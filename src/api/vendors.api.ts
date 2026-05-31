import api from './axios'
import type { Vendor, VendorDetail, CreateVendorDto, PaginatedResponse, PaginationParams, SearchParams } from '@/types'

type P = PaginationParams & SearchParams

export const getVendors      = (p?: P) => api.get<PaginatedResponse<Vendor>>('/vendors', { params: p })
export const getVendorDetail = (id: string) => api.get<{ data: VendorDetail }>(`/vendors/${id}`)
export const createVendor    = (d: CreateVendorDto) => api.post<Vendor>('/vendors', d)
export const updateVendor    = (id: string, d: Partial<CreateVendorDto>) => api.patch<Vendor>(`/vendors/${id}`, d)
export const deleteVendor    = (id: string) => api.delete(`/vendors/${id}`)
export const getVendorList   = () => api.get<{ data: (Pick<Vendor, 'id' | 'vendorName'> & { assignedSiteId?: string; assignedSiteName?: string })[] }>('/vendors/list')
