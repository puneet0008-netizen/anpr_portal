import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/api/vendors.api'
import type { CreateVendorDto } from '@/types'

const QK = { list: 'vendors', detail: 'vendor-detail', dropdown: 'vendor-list' }

export const useVendors = (p?: Parameters<typeof api.getVendors>[0]) =>
  useQuery({ queryKey: [QK.list, p], queryFn: () => api.getVendors(p).then((r) => r.data) })

export const useVendorDetail = (id: string | null) =>
  useQuery({
    queryKey: [QK.detail, id],
    queryFn:  () => api.getVendorDetail(id!).then((r) => r.data.data),
    enabled:  !!id,
    retry:    false,
  })

export const useVendorDropdown = () =>
  useQuery({ queryKey: [QK.dropdown], queryFn: () => api.getVendorList().then((r) => r.data.data) })

export const useCreateVendor = (onSuccess?: () => void) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (d: CreateVendorDto) => api.createVendor(d),
    onSuccess: () => { toast.success('Vendor created'); qc.invalidateQueries({ queryKey: [QK.list] }); onSuccess?.() },
  })
}

export const useUpdateVendor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateVendorDto> }) => api.updateVendor(id, data),
    onSuccess: () => { toast.success('Vendor updated'); qc.invalidateQueries({ queryKey: [QK.list] }); qc.invalidateQueries({ queryKey: [QK.detail] }) },
  })
}

export const useDeleteVendor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteVendor(id),
    onSuccess: () => {
      toast.success('Vendor deleted')
      qc.invalidateQueries({ queryKey: [QK.list] })
      qc.invalidateQueries({ queryKey: [QK.detail] })
      qc.invalidateQueries({ queryKey: [QK.dropdown] })
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete vendor'),
  })
}
