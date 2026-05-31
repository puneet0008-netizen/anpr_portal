import api from './axios'
import type { PortalUser, CreatePortalUserDto, UpdatePortalUserDto, PaginatedResponse, PaginationParams, SearchParams } from '@/types'

type P = PaginationParams & SearchParams

export const getPortalUsers    = (p?: P) => api.get<PaginatedResponse<PortalUser>>('/portal-users', { params: p })
export const createPortalUser  = (d: CreatePortalUserDto) => api.post<PortalUser>('/portal-users', d)
export const updatePortalUser  = (id: string, d: Partial<UpdatePortalUserDto>) => api.patch<PortalUser>(`/portal-users/${id}`, d)
export const deletePortalUser  = (id: string) => api.delete(`/portal-users/${id}`)
export const togglePortalUser  = (id: string, status: 'active' | 'inactive') =>
  api.patch<PortalUser>(`/portal-users/${id}/status`, { status })
