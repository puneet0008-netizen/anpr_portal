import api from './axios'
import type { VehicleRequest, Visitor, ParkingSession, RequestType, RequestStatus } from '@/types'

type VehicleRequestRow = VehicleRequest & {
  _id?: string
  userId?: string
  vehicleId?: string
  requestType?: RequestType
  currentValue?: string
  requestedValue?: string
  adminNote?: string
  createdAt?: string
  updatedAt?: string
}

const normalizeVehicleRequest = (row: VehicleRequestRow): VehicleRequest => ({
  id: String(row.id ?? row._id ?? ''),
  user_id: String(row.user_id ?? row.userId ?? ''),
  vehicle_id: String(row.vehicle_id ?? row.vehicleId ?? ''),
  request_type: (row.request_type ?? row.requestType ?? 'plate_change') as RequestType,
  current_value: String(row.current_value ?? row.currentValue ?? ''),
  requested_value: String(row.requested_value ?? row.requestedValue ?? ''),
  reason: row.reason,
  status: (row.status ?? 'pending') as RequestStatus,
  admin_note: row.admin_note ?? row.adminNote,
  created_at: String(row.created_at ?? row.createdAt ?? ''),
  updated_at: String(row.updated_at ?? row.updatedAt ?? ''),
  number_plate: row.number_plate,
  vehicle_name: row.vehicle_name,
  user_name: row.user_name,
  user_phone: row.user_phone,
})

// ── Vehicle Requests ──────────────────────────────────────────────────────────
export const getVehicleRequests = (params?: { status?: string; limit?: number; offset?: number }) =>
  api
    .get<{ success: boolean; data: VehicleRequestRow[]; meta: { total: number; limit: number; offset: number } }>(
      '/app-admin/vehicle-requests',
      { params },
    )
    .then((r) => ({
      ...r,
      data: {
        ...r.data,
        data: r.data.data.map(normalizeVehicleRequest),
      },
    }))

export const reviewVehicleRequest = (id: string, body: { status: 'approved' | 'rejected'; adminNote?: string }) =>
  api
    .patch<{ success: boolean; data: VehicleRequestRow }>(`/app-admin/vehicle-requests/${id}`, body)
    .then((r) => ({ ...r, data: { ...r.data, data: normalizeVehicleRequest(r.data.data) } }))

// ── Visitors ──────────────────────────────────────────────────────────────────
export const getVisitors = (params?: { status?: string; date?: string; limit?: number; offset?: number }) =>
  api.get<{ success: boolean; data: Visitor[]; total: number }>('/app-admin/visitors', { params })

export const createVisitor = (d: {
  visitorName: string; visitorPhone: string; visitorCarNumber: string
  purpose: string; visitDate: string; visitTime: string
  durationHours: number; durationMinutes: number; invitedBy?: string
}) => api.post<{ success: boolean; data: Visitor }>('/app-admin/visitors', d)

export const updateVisitorStatus = (id: string, status: string) =>
  api.patch<{ success: boolean; data: Visitor }>(`/app-admin/visitors/${id}/status`, { status })

// ── Parking Sessions ──────────────────────────────────────────────────────────
export const getAdminParkingSessions = (params?: { status?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }) =>
  api.get<{ success: boolean; data: ParkingSession[] }>('/app-admin/parking-sessions', { params })
