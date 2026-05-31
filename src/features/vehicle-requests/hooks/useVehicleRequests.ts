import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/app-admin.api'

const QK = 'vehicle-requests'

export const useVehicleRequests = (params?: Parameters<typeof api.getVehicleRequests>[0]) =>
  useQuery({
    queryKey: [QK, params],
    queryFn:  () => api.getVehicleRequests(params).then((r) => r.data),
  })

export const useReviewRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { status: 'approved' | 'rejected'; adminNote?: string } }) =>
      api.reviewVehicleRequest(id, body),
    onSuccess: (_, vars) => {
      toast.success(`Request ${vars.body.status}`)
      qc.invalidateQueries({ queryKey: [QK] })
    },
  })
}
