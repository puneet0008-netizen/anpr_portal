import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/parking.api'
import type { CreateParkingDto } from '@/types'

const QK = { sites: 'parking-sites', stats: 'parking-stats', recharges: 'parking-recharges' }

export const useParkingSites  = (p?: Parameters<typeof api.getParkingSites>[0]) =>
  useQuery({ queryKey: [QK.sites, p], queryFn: () => api.getParkingSites(p).then((r) => r.data) })

export const useParkingStats  = () =>
  useQuery({ queryKey: [QK.stats], queryFn: () => api.getParkingStats().then((r) => r.data.data) })

export const useRecentRecharges = () =>
  useQuery({ queryKey: [QK.recharges], queryFn: () => api.getRecentRecharges().then((r) => r.data.data) })

export const useCreateParking = (onSuccess?: () => void) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: CreateParkingDto) => api.createParking(d),
    onSuccess: () => { toast.success('Parking site created'); qc.invalidateQueries({ queryKey: [QK.sites] }); qc.invalidateQueries({ queryKey: [QK.stats] }); onSuccess?.() },
    onError:   (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create site'),
  })
}

export const useUpdateParking = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateParkingDto> }) => api.updateParking(id, data),
    onSuccess: () => { toast.success('Parking site updated'); qc.invalidateQueries({ queryKey: [QK.sites] }) },
    onError:   (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update site'),
  })
}

export const useDeleteParking = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteParking,
    onSuccess: () => { toast.success('Parking site deleted'); qc.invalidateQueries({ queryKey: [QK.sites] }); qc.invalidateQueries({ queryKey: [QK.stats] }) },
  })
}

export const useParkingRecharge = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.parkingRecharge,
    onSuccess: () => { toast.success('Recharge successful'); qc.invalidateQueries({ queryKey: [QK.recharges] }) },
  })
}
