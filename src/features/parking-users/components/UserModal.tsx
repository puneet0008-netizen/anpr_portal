import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField } from '@/components/shared/FormField'
import * as vendorApi                         from '@/api/vendors.api'
import * as parkingApi                        from '@/api/parking.api'
import { uploadUserPhoto, getAppUserDetail } from '@/api/parking-users.api'
import { Camera, X as XIcon } from 'lucide-react'
import type { WebUser, AppUser, PaginatedResponse } from '@/types'

const schema = z.object({
  name:           z.string().min(2, 'Min 2 characters'),
  email:          z.string().email('Invalid email'),
  phone:          z.string().regex(/^\d{10}$/, '10-digit number'),
  password:       z.string().min(6, 'Min 6 characters').optional().or(z.literal('')),
  vendorId:       z.string().optional(),
  assignedSiteId: z.string().optional(),
  slotNumber:     z.string().optional(),
  allottedSlots:  z.coerce.number().int().min(1).max(100).optional(),
  numberPlate:    z.string().min(3).toUpperCase().optional().or(z.literal('')),
  vehicleType:    z.enum(['two_wheeler', 'four_wheeler']).optional(),
  vehicleName:    z.string().optional(),
  vehicleModel:   z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface UserModalProps {
  open:     boolean
  onClose:  () => void
  onSubmit: (d: FormValues & { profilePhoto?: string }) => void
  loading?: boolean
  initial?: WebUser | AppUser
  title:    string
  showVendorField?: boolean
}

export const UserModal = ({ open, onClose, onSubmit, loading, initial, title, showVendorField }: UserModalProps) => {
  const [showVehicle, setShowVehicle]   = useState(false)
  const [photoFile,   setPhotoFile]     = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading,   setUploading]     = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const { data: vendorList } = useQuery({
    queryKey: ['vendor-list'],
    queryFn:  () => vendorApi.getVendorList().then((r) => r.data.data),
    enabled:  open && !!showVendorField,
    staleTime: 60_000,
  })

  const { data: siteList } = useQuery({
    queryKey: ['parking-dropdown'],
    queryFn:  () => parkingApi.getSiteDropdown().then((r) => r.data.data),
    enabled:  open,
    staleTime: 60_000,
  })

  // Only app users have walletBalance — web users must not hit the /detail endpoint
  const isAppUser = !!initial && 'walletBalance' in initial

  // Fetch full user detail when editing so we can show the existing profile photo
  const { data: userDetail } = useQuery({
    queryKey: ['app-user-detail', initial?.id],
    queryFn:  () => getAppUserDetail(initial!.id).then((r) => r.data.data),
    enabled:  open && !!initial?.id && isAppUser,
    staleTime: 30_000,
  })

  const vehicleType    = watch('vehicleType')
  const assignedSiteId = watch('assignedSiteId')
  const vendorId       = watch('vendorId')
  const selectedVendor = vendorList?.find((v) => v.id === vendorId)

  useEffect(() => {
    if (initial) {
      reset({
        name:           initial.name,
        email:          initial.email,
        phone:          initial.phone,
        password:       '',
        vendorId:       (initial as AppUser).vendorId ?? '',
        assignedSiteId: (initial as AppUser & { assignedSiteId?: string }).assignedSiteId ?? '',
        slotNumber:     '',
        allottedSlots:  (initial as AppUser).allottedSlots ?? 1,
        numberPlate:    '',
        vehicleType:    undefined,
        vehicleName:    '',
        vehicleModel:   '',
      })
    } else {
      reset({ name: '', email: '', phone: '', password: '', vendorId: '', assignedSiteId: '', slotNumber: '', allottedSlots: 1, numberPlate: '', vehicleType: undefined, vehicleName: '', vehicleModel: '' })
      setPhotoPreview(null)
    }
    setPhotoFile(null)
    setShowVehicle(false)
  }, [initial, open, reset])

  // Update photo preview once the detail query resolves (has the real photo URL)
  useEffect(() => {
    if (!photoFile) {
      // Only update preview if the user hasn't already picked a new file
      setPhotoPreview(
        userDetail?.profilePhoto
          ?? (initial as AppUser | undefined)?.profilePhoto
          ?? null
      )
    }
  }, [userDetail, initial, photoFile])

  const handleSubmitForm = async (d: FormValues) => {
    const payload: FormValues & { profilePhoto?: string } = { ...d }
    if (!d.numberPlate) { delete payload.numberPlate; delete payload.vehicleType; delete payload.vehicleName; delete payload.vehicleModel }
    if (!d.vendorId)       delete payload.vendorId
    if (!d.assignedSiteId) { delete payload.assignedSiteId; delete payload.slotNumber }
    if (!d.slotNumber)     delete payload.slotNumber
    if (!d.password)       delete payload.password

    // Upload photo (edit mode only — user must exist first)
    if (photoFile && initial?.id) {
      try {
        setUploading(true)
        const res = await uploadUserPhoto(initial.id, photoFile)
        const photoUrl = res.data?.data?.photoUrl
        if (photoUrl) {
          payload.profilePhoto = photoUrl
          // Immediately patch the photo into every cached page so the table
          // shows the new avatar without waiting for a full refetch
          qc.setQueriesData(
            { queryKey: ['app-users'] },
            (old: PaginatedResponse<AppUser> | undefined) =>
              old
                ? { ...old, data: old.data.map((u) => u.id === initial.id ? { ...u, profilePhoto: photoUrl } : u) }
                : old
          )
        }
      } catch { /* non-fatal */ }
      finally { setUploading(false) }
    }
    onSubmit(payload)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} modal={false}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form id="user-modal-form" onSubmit={handleSubmit(handleSubmitForm)} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Profile photo */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div
                className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview
                  ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  : <Camera className="h-7 w-7 text-gray-300" />
                }
              </div>
              {photoPreview && (
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Profile Photo</p>
              <p className="text-xs text-gray-400 mt-0.5">JPG, PNG or WebP · max 5 MB</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1.5 text-xs text-brand hover:underline"
              >
                {photoPreview ? 'Change photo' : 'Upload photo'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                setPhotoFile(f)
                setPhotoPreview(URL.createObjectURL(f))
              }}
            />
          </div>

          {/* Core fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Full Name" error={errors.name?.message} required className="col-span-2">
              <Input placeholder="John Doe" {...register('name')} />
            </FormField>
            <FormField label="Email" error={errors.email?.message} required>
              <Input type="email" placeholder="john@example.com" {...register('email')} />
            </FormField>
            <FormField label="Phone" error={errors.phone?.message} required>
              <Input placeholder="9876543210" maxLength={10} {...register('phone')} />
            </FormField>
            <FormField label={initial ? 'New Password (optional)' : 'Password'} error={errors.password?.message} required={!initial} className="col-span-2">
              <Input type="password" placeholder="••••••••" {...register('password')} />
            </FormField>
            {showVendorField && (
              <>
                <FormField label="Vendor (optional)" error={errors.vendorId?.message} className="col-span-2">
                  <Select onValueChange={(v) => {
                    const id = v === '__none__' ? '' : v
                    setValue('vendorId', id)
                    const vendor = vendorList?.find((x) => x.id === id)
                    setValue('assignedSiteId', vendor?.assignedSiteId ?? '')
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vendor…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {(vendorList ?? []).map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.vendorName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                {selectedVendor?.assignedSiteName && (
                  <div className="col-span-2 flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                    <span className="text-xs text-blue-500 font-medium">Parking Site</span>
                    <span className="text-sm font-semibold text-blue-700">{selectedVendor.assignedSiteName}</span>
                  </div>
                )}
              </>
            )}
            <FormField label="Allotted Slots" error={errors.allottedSlots?.message}>
              <Input type="number" min={1} max={100} placeholder="1" {...register('allottedSlots')} />
            </FormField>
            <FormField label="Assigned Parking Site" error={errors.assignedSiteId?.message}>
              <Select
                value={assignedSiteId || '__none__'}
                onValueChange={(v) => setValue('assignedSiteId', v === '__none__' ? '' : v)}
              >
                <SelectTrigger><SelectValue placeholder="Select site…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {(siteList ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.siteName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* Vehicle section — collapsible */}
          {!initial && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowVehicle((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span>Add Vehicle (optional)</span>
                {showVehicle ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>
              {showVehicle && (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100">
                  <FormField label="Number Plate" error={errors.numberPlate?.message}>
                    <Input placeholder="KA01AB1234" className="uppercase" {...register('numberPlate')} />
                  </FormField>
                  <FormField label="Vehicle Type" error={errors.vehicleType?.message}>
                    <Select onValueChange={(v) => setValue('vehicleType', v as 'two_wheeler' | 'four_wheeler')}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="four_wheeler">Four Wheeler</SelectItem>
                        <SelectItem value="two_wheeler">Two Wheeler</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Vehicle Name" error={errors.vehicleName?.message}>
                    <Input placeholder="My Honda City" {...register('vehicleName')} />
                  </FormField>
                  <FormField label="Vehicle Model" error={errors.vehicleModel?.message}>
                    <Input placeholder="City SV 2022" {...register('vehicleModel')} />
                  </FormField>
                </div>
              )}
            </div>
          )}

        </form>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button form="user-modal-form" type="submit" size="sm" disabled={loading || uploading}>
            {uploading ? 'Uploading photo…' : loading ? 'Saving…' : initial ? 'Update' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
