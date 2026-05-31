import api from './axios'
import type {
  WebUser, AppUser, AppUserDetail, AppVehicle, CreateUserDto, RechargeDto,
  PaginatedResponse, PaginationParams, SearchParams,
} from '@/types'

type P = PaginationParams & SearchParams & { status?: string }
// Re-export for consumers that import CreateWebUserDto / CreateAppUserDto from this module
export type { CreateUserDto }

// ── List ──────────────────────────────────────────────────────────────────────
export const getWebUsers = (p: P) =>
  api.get<PaginatedResponse<WebUser>>('/users/web', { params: p })

export const getAppUsers = (p: P) =>
  api.get<PaginatedResponse<AppUser>>('/users/app', { params: p })

// ── Create ────────────────────────────────────────────────────────────────────
export const createWebUser = (d: CreateUserDto) => api.post<WebUser>('/users/web', d)
export const createAppUser = (d: CreateUserDto) => api.post<AppUser>('/users/app', d)

// ── Update (fixed: backend now has /users/web/:id and /users/app/:id) ─────────
export const updateWebUser = (id: string, d: Partial<CreateUserDto>) =>
  api.patch<WebUser>(`/users/web/${id}`, d)

export const updateAppUser = (id: string, d: Partial<CreateUserDto>) =>
  api.patch<AppUser>(`/users/app/${id}`, d)

// ── Delete ────────────────────────────────────────────────────────────────────
export const deleteWebUser = (id: string) => api.delete(`/users/web/${id}`)
export const deleteAppUser = (id: string) => api.delete(`/users/app/${id}`)

// ── Recharge wallet ───────────────────────────────────────────────────────────
export const rechargeAppUser = (id: string, d: RechargeDto) =>
  api.post(`/users/app/${id}/recharge`, d)

// ── App User Detail (vehicles + wallet + sessions) ────────────────────────────
export const getAppUserDetail = (id: string) =>
  api.get<{ data: AppUserDetail; success: boolean }>(`/users/app/${id}/detail`)

// ── User vehicle management ────────────────────────────────────────────────────
export const getUserVehicles = (userId: string) =>
  api.get<{ data: AppVehicle[]; success: boolean }>(`/users/${userId}/vehicles`)

export const addUserVehicle = (userId: string, d: import('@/types').UserVehicleDto) =>
  api.post<{ data: AppVehicle; success: boolean }>(`/users/${userId}/vehicles`, d)

export const updateUserVehicle = (userId: string, vehicleId: string, d: Partial<import('@/types').UserVehicleDto>) =>
  api.patch<{ data: AppVehicle; success: boolean }>(`/users/${userId}/vehicles/${vehicleId}`, d)

export const removeUserVehicle = (userId: string, vehicleId: string) =>
  api.delete(`/users/${userId}/vehicles/${vehicleId}`)

// ── Set primary vehicle ───────────────────────────────────────────────────────
export const setPrimaryVehicle = (userId: string, vehicleId: string) =>
  api.patch<{ data: import('@/types').AppVehicle[]; success: boolean }>(
    `/users/${userId}/vehicles/${vehicleId}/primary`
  )

// ── Search app users (for dropdowns) ─────────────────────────────────────────
export const searchAppUsers = (q: string) =>
  api.get<{ data: { id: string; name: string; phone: string; vehicle_number: string }[]; success: boolean }>(
    '/users/app/search', { params: { q } }
  )

// ── Profile photo upload ───────────────────────────────────────────────────────
export const uploadUserPhoto = (userId: string, file: File) => {
  const fd = new FormData()
  fd.append('photo', file)
  return api.post<{ data: { photoUrl: string }; success: boolean }>(
    `/users/${userId}/photo`, fd,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
}
