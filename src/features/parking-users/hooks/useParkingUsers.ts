import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/parking-users.api'
import type { RechargeDto } from '@/types'

const QK = { web: 'web-users', app: 'app-users' }

export const useWebUsers = (params: Parameters<typeof api.getWebUsers>[0]) =>
  useQuery({ queryKey: [QK.web, params], queryFn: () => api.getWebUsers(params).then((r) => r.data) })

export const useAppUsers = (params: Parameters<typeof api.getAppUsers>[0]) =>
  useQuery({ queryKey: [QK.app, params], queryFn: () => api.getAppUsers(params).then((r) => r.data) })

export const useCreateWebUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: import('@/types').CreateUserDto) => api.createWebUser(d),
    onSuccess: () => { toast.success('Web user created'); qc.invalidateQueries({ queryKey: [QK.web] }) },
  })
}

export const useCreateAppUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: import('@/types').CreateUserDto) => api.createAppUser(d),
    onSuccess: () => { toast.success('App user created'); qc.invalidateQueries({ queryKey: [QK.app] }) },
  })
}

export const useUpdateWebUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<import('@/types').CreateUserDto> }) => api.updateWebUser(id, data),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: [QK.web] }) },
  })
}

export const useUpdateAppUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<import('@/types').CreateUserDto> }) => api.updateAppUser(id, data),
    onSuccess: (_, { id }) => {
      toast.success('User updated')
      qc.invalidateQueries({ queryKey: [QK.app] })
      qc.invalidateQueries({ queryKey: ['app-user-detail', id] })
    },
  })
}

export const useDeleteWebUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteWebUser,
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries({ queryKey: [QK.web] }) },
  })
}

export const useDeleteAppUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteAppUser,
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries({ queryKey: [QK.app] }) },
  })
}

export const useRechargeUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RechargeDto }) => api.rechargeAppUser(id, data),
    onSuccess: () => { toast.success('Wallet recharged'); qc.invalidateQueries({ queryKey: [QK.app] }) },
  })
}

export const useAppUserDetail = (id: string | null) =>
  useQuery({
    queryKey: ['app-user-detail', id],
    queryFn:  () => api.getAppUserDetail(id!).then((r) => r.data.data),
    enabled:  !!id,
  })

// ── User vehicle management ────────────────────────────────────────────────────
export const useUserVehicles = (userId: string | null) =>
  useQuery({
    queryKey: ['user-vehicles', userId],
    queryFn:  () => api.getUserVehicles(userId!).then((r) => r.data.data),
    enabled:  !!userId,
  })

export const useSetPrimaryVehicle = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, vehicleId }: { userId: string; vehicleId: string }) =>
      api.setPrimaryVehicle(userId, vehicleId),
    onSuccess: (_, { userId }) => {
      toast.success('Primary vehicle updated')
      qc.invalidateQueries({ queryKey: ['app-user-detail', userId] })
      qc.invalidateQueries({ queryKey: ['user-vehicles', userId] })
      qc.invalidateQueries({ queryKey: [QK.app] })
      qc.invalidateQueries({ queryKey: [QK.web] })
    },
  })
}

export const useAddUserVehicle = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: import('@/types').UserVehicleDto }) =>
      api.addUserVehicle(userId, data),
    onSuccess: (_, { userId }) => {
      toast.success('Vehicle added')
      qc.invalidateQueries({ queryKey: ['app-user-detail', userId] })
      qc.invalidateQueries({ queryKey: ['user-vehicles', userId] })
      qc.invalidateQueries({ queryKey: [QK.app] })
      qc.invalidateQueries({ queryKey: [QK.web] })
    },
  })
}

export const useUpdateUserVehicle = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, vehicleId, data }: { userId: string; vehicleId: string; data: Partial<import('@/types').UserVehicleDto> }) =>
      api.updateUserVehicle(userId, vehicleId, data),
    onSuccess: (_, { userId }) => {
      toast.success('Vehicle updated')
      qc.invalidateQueries({ queryKey: ['user-vehicles', userId] })
      qc.invalidateQueries({ queryKey: ['app-user-detail', userId] })
    },
  })
}

export const useRemoveUserVehicle = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, vehicleId }: { userId: string; vehicleId: string }) =>
      api.removeUserVehicle(userId, vehicleId),
    onSuccess: (_, { userId }) => {
      toast.success('Vehicle removed')
      qc.invalidateQueries({ queryKey: ['app-user-detail', userId] })
      qc.invalidateQueries({ queryKey: ['user-vehicles', userId] })
      qc.invalidateQueries({ queryKey: [QK.app] })
      qc.invalidateQueries({ queryKey: [QK.web] })
    },
  })
}
