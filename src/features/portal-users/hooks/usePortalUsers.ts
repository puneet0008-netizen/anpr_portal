import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/portal-users.api'
import type { CreatePortalUserDto, UpdatePortalUserDto } from '@/types'

const QK = 'portal-users'

export const usePortalUsers = (p?: Parameters<typeof api.getPortalUsers>[0]) =>
  useQuery({ queryKey: [QK, p], queryFn: () => api.getPortalUsers(p).then((r) => r.data) })

export const useCreatePortalUser = (onSuccess?: () => void) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: CreatePortalUserDto) => api.createPortalUser(d),
    onSuccess: () => { toast.success('Portal user created'); qc.invalidateQueries({ queryKey: [QK] }); onSuccess?.() },
  })
}

export const useUpdatePortalUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UpdatePortalUserDto> }) => api.updatePortalUser(id, data),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: [QK] }) },
  })
}

export const useDeletePortalUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deletePortalUser,
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries({ queryKey: [QK] }) },
  })
}

export const useTogglePortalUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) => api.togglePortalUser(id, status),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: [QK] }) },
  })
}
