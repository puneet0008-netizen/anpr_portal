import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/parking-sessions.api'
import type { RecordEntryDto, RecordExitDto } from '@/types'

export const useLookupByPlate = (plate: string) =>
  useQuery({
    queryKey: ['plate-lookup', plate],
    queryFn:  () => api.lookupByPlate(plate).then(r => r.data.data),
    enabled:  plate.length >= 3,
    staleTime: 10_000,
  })

const QK = 'parking-sessions'

export const useSessions = (params?: Parameters<typeof api.getSessions>[0]) =>
  useQuery({
    queryKey: [QK, params],
    queryFn:  () => api.getSessions(params).then((r) => r.data),
    refetchInterval: 30_000,
  })

export const useActiveSessions = () =>
  useQuery({
    queryKey: [QK, 'active'],
    queryFn:  () => api.getActiveSessions().then((r) => r.data.data),
    refetchInterval: 15_000,
  })

export const useRecordEntry = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: RecordEntryDto) => api.recordEntry(d),
    onSuccess: () => {
      toast.success('Vehicle entry recorded')
      qc.invalidateQueries({ queryKey: [QK] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Entry failed'),
  })
}

export const useRecordExit = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: RecordExitDto) => api.recordExit(d),
    onSuccess: (res) => {
      const dur = res.data.data.durationFormatted
      toast.success(`Exit recorded — Duration: ${dur}`)
      qc.invalidateQueries({ queryKey: [QK] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Exit failed'),
  })
}
