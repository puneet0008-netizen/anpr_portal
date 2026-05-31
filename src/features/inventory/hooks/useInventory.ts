import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/inventory.api'
import type { CreateInventoryItemDto } from '@/types'

const QK = 'inventory'

export const useInventory = (p?: Parameters<typeof api.getInventory>[0]) =>
  useQuery({ queryKey: [QK, p], queryFn: () => api.getInventory(p).then((r) => r.data) })

export const useCreateItem = (onSuccess?: () => void) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: CreateInventoryItemDto) => api.createItem(d),
    onSuccess: () => { toast.success('Item added'); qc.invalidateQueries({ queryKey: [QK] }); onSuccess?.() },
  })
}

export const useUpdateItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateInventoryItemDto> }) => api.updateItem(id, data),
    onSuccess: () => { toast.success('Item updated'); qc.invalidateQueries({ queryKey: [QK] }) },
  })
}

export const useDeleteItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteItem,
    onSuccess: () => { toast.success('Item deleted'); qc.invalidateQueries({ queryKey: [QK] }) },
  })
}
