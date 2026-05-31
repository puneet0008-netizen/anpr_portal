import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/app-admin.api'

const QK = 'admin-visitors'

export const useVisitors = (params?: Parameters<typeof api.getVisitors>[0]) =>
  useQuery({
    queryKey: [QK, params],
    queryFn:  () => api.getVisitors(params).then((r) => r.data),
  })

export const useCreateVisitor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: Parameters<typeof api.createVisitor>[0]) => api.createVisitor(d),
    onSuccess: () => {
      toast.success('Visitor added')
      qc.invalidateQueries({ queryKey: [QK] })
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add visitor'),
  })
}

export const useUpdateVisitorStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateVisitorStatus(id, status),
    onSuccess: () => {
      toast.success('Visitor status updated')
      qc.invalidateQueries({ queryKey: [QK] })
    },
  })
}
