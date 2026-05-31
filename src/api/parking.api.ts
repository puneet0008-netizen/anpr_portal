import api from './axios'
import type {
  ParkingSite, ParkingStats, CreateParkingDto, ParkingRecharge,
  PaginatedResponse, PaginationParams, SearchParams,
} from '@/types'

type P = PaginationParams & SearchParams

export const getParkingSites  = (p?: P) => api.get<PaginatedResponse<ParkingSite>>('/parking', { params: p })
export const getParkingStats  = ()      => api.get<{ data: ParkingStats }>('/parking/stats')
export const createParking    = (d: CreateParkingDto) => api.post<ParkingSite>('/parking', d)
export const updateParking    = (id: string, d: Partial<CreateParkingDto>) => api.patch<ParkingSite>(`/parking/${id}`, d)
export const deleteParking    = (id: string) => api.delete(`/parking/${id}`)

export const getParkingList   = () => api.get<{ data: Pick<ParkingSite, 'id' | 'siteName'>[] }>('/parking/list')
export const getSiteDropdown  = () => api.get<{ data: { id: string; siteName: string }[] }>('/parking/list')

export const parkingRecharge      = (d: { userId: string; amount: number; paymentMethod: string; transactionRef: string }) =>
  api.post('/parking/recharge', d)
export const getRecentRecharges   = () => api.get<{ data: ParkingRecharge[] }>('/parking/recharge/recent')
export const searchUserForRecharge = (q: string) => api.get('/users/app/search', { params: { q } })
