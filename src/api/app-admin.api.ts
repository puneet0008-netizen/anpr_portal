import api from './axios'
import type { VehicleRequest, Visitor, ParkingSession } from '@/types'

// ── Vehicle Requests ──────────────────────────────────────────────────────────
export const getVehicleRequests = (params?: { status?: string; limit?: number; offset?: number }) =>
  api.get<{ success: boolean; data: VehicleRequest[]; meta: { total: number; limit: number; offset: number } }>('/app-admin/vehicle-requests', { params })

export const reviewVehicleRequest = (id: string, body: { status: 'approved' | 'rejected'; adminNote?: string }) =>
  api.patch<{ success: boolean; data: VehicleRequest }>(`/app-admin/vehicle-requests/${id}`, body)

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
