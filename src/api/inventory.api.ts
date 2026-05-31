import api from './axios'
import type { InventoryItem, CreateInventoryItemDto, PaginatedResponse, PaginationParams, SearchParams } from '@/types'

type P = PaginationParams & SearchParams & { status?: string }

export const getInventory    = (p?: P) => api.get<PaginatedResponse<InventoryItem>>('/inventory', { params: p })
export const createItem      = (d: CreateInventoryItemDto) => api.post<InventoryItem>('/inventory', d)
export const updateItem      = (id: string, d: Partial<CreateInventoryItemDto>) => api.patch<InventoryItem>(`/inventory/${id}`, d)
export const deleteItem      = (id: string) => api.delete(`/inventory/${id}`)
