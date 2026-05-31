import { useState, useRef, useEffect } from 'react'
import { X, XCircle, Wallet, Car, Clock, ArrowDownUp, Users, Plus, Trash2, Pencil, Camera, Check } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useAppUserDetail, useAddUserVehicle, useRemoveUserVehicle,
  useSetPrimaryVehicle, useUpdateAppUser, useUpdateUserVehicle,
} from '../hooks/useParkingUsers'
import { uploadUserPhoto } from '@/api/parking-users.api'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField } from '@/components/shared/FormField'
import type { AppUser, AppVehicle, PaginatedResponse } from '@/types'

interface Props {
  user: AppUser | null
  onClose: () => void
}

const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-brand" />
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
    </div>
    {children}
  </div>
)

const vehicleTypeLabel = (t: string) => t === 'two_wheeler' ? '🏍️ Two-Wheeler' : '🚗 Four-Wheeler'

// ─── Add Vehicle inline form ──────────────────────────────────────────────────
const AddVehicleForm = ({ userId, onDone }: { userId: string; onDone: () => void }) => {
  const addMut = useAddUserVehicle()
  const [plate, setPlate]   = useState('')
  const [type,  setType]    = useState<'two_wheeler' | 'four_wheeler'>('four_wheeler')
  const [name,  setName]    = useState('')
  const [model, setModel]   = useState('')
  const [err,   setErr]     = useState('')

  const handleAdd = () => {
    if (!plate.trim())  { setErr('Number plate is required'); return }
    if (!name.trim())   { setErr('Vehicle name is required'); return }
    if (!model.trim())  { setErr('Vehicle model is required'); return }
    setErr('')
    addMut.mutate(
      { userId, data: { numberPlate: plate.trim().toUpperCase(), vehicleType: type, vehicleName: name.trim(), vehicleModel: model.trim() } },
      { onSuccess: () => { setPlate(''); setName(''); setModel(''); setType('four_wheeler'); onDone() } }
    )
  }

  return (
    <div className="mt-3 border border-dashed border-brand/30 rounded-xl p-4 bg-brand/5 space-y-3">
      <p className="text-xs font-semibold text-brand">New Vehicle</p>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Number Plate" required>
          <Input placeholder="KA01AB1234" className="uppercase font-mono text-sm h-8" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} />
        </FormField>
        <FormField label="Type" required>
          <Select value={type} onValueChange={(v) => setType(v as 'two_wheeler' | 'four_wheeler')}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="four_wheeler">🚗 Four Wheeler</SelectItem>
              <SelectItem value="two_wheeler">🏍️ Two Wheeler</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Vehicle Name" required>
          <Input placeholder="My Honda City" className="text-sm h-8" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Model" required>
          <Input placeholder="City SV 2022" className="text-sm h-8" value={model} onChange={(e) => setModel(e.target.value)} />
        </FormField>
      </div>
      {err && <p className="text-xs text-red-500">{err}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onDone}>Cancel</Button>
        <Button type="button" size="sm" className="h-7 text-xs bg-brand hover:bg-brand/90 text-white" disabled={addMut.isPending} onClick={handleAdd}>
          {addMut.isPending ? 'Adding…' : 'Add Vehicle'}
        </Button>
      </div>
    </div>
  )
}

// ─── Vehicle card (with inline edit) ─────────────────────────────────────────
const VehicleCard = ({ vehicle, userId }: { vehicle: AppVehicle; userId: string }) => {
  const removeMut     = useRemoveUserVehicle()
  const setPrimaryMut = useSetPrimaryVehicle()
  const updateMut     = useUpdateUserVehicle()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    numberPlate:  vehicle.numberPlate,
    vehicleName:  vehicle.vehicleName,
    vehicleModel: vehicle.vehicleModel,
    vehicleType:  vehicle.vehicleType as 'two_wheeler' | 'four_wheeler',
  })

  const isPending = removeMut.isPending || setPrimaryMut.isPending || updateMut.isPending
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    updateMut.mutate(
      { userId, vehicleId: vehicle.id, data: { ...form, numberPlate: form.numberPlate.toUpperCase() } },
      { onSuccess: () => setEditing(false) }
    )
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-brand/20 bg-brand/5 p-3 space-y-3">
        <p className="text-xs font-semibold text-brand">Edit Vehicle</p>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Number Plate" required>
            <Input className="uppercase font-mono text-sm h-8" value={form.numberPlate}
              onChange={e => set('numberPlate', e.target.value.toUpperCase())} />
          </FormField>
          <FormField label="Type" required>
            <Select value={form.vehicleType} onValueChange={v => set('vehicleType', v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="four_wheeler">🚗 Four Wheeler</SelectItem>
                <SelectItem value="two_wheeler">🏍️ Two Wheeler</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Vehicle Name" required>
            <Input className="text-sm h-8" value={form.vehicleName} onChange={e => set('vehicleName', e.target.value)} />
          </FormField>
          <FormField label="Model" required>
            <Input className="text-sm h-8" value={form.vehicleModel} onChange={e => set('vehicleModel', e.target.value)} />
          </FormField>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
          <Button type="button" size="sm" className="h-7 text-xs" disabled={isPending} onClick={handleSave}>
            {updateMut.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded font-semibold uppercase">{vehicle.numberPlate}</span>
          {vehicle.isPrimary
            ? <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Primary</span>
            : (
              <button className="text-[10px] text-brand hover:underline disabled:opacity-40" disabled={isPending}
                onClick={() => setPrimaryMut.mutate({ userId, vehicleId: vehicle.id })}>
                Set as Primary
              </button>
            )
          }
          <span className="text-[10px] text-gray-400">{vehicleTypeLabel(vehicle.vehicleType)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{vehicle.vehicleName} · {vehicle.vehicleModel}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={vehicle.status} />
        <button className="p-1.5 rounded-lg text-gray-400 hover:text-brand hover:bg-brand/5 transition-colors"
          disabled={isPending} onClick={() => setEditing(true)} title="Edit vehicle">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {!vehicle.isPrimary && (
          <button className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            disabled={isPending} onClick={() => removeMut.mutate({ userId, vehicleId: vehicle.id })} title="Remove vehicle">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Inline edit form ─────────────────────────────────────────────────────────
const EditForm = ({ user, onDone }: { user: AppUser; onDone: () => void }) => {
  const qc         = useQueryClient()
  const updateMut  = useUpdateAppUser()
  const fileRef    = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name:          user.name,
    email:         user.email,
    phone:         user.phone,
    password:      '',
    allottedSlots: user.allottedSlots ?? 1,
  })
  const [photoFile,    setPhotoFile]    = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    user.profilePhoto ?? null
  )
  const [err,      setErr]      = useState('')
  const [uploading, setUploading] = useState(false)

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name || !form.email || !form.phone) {
      setErr('Name, email and phone are required')
      return
    }
    setErr('')

    let profilePhoto: string | undefined
    if (photoFile) {
      try {
        setUploading(true)
        const res = await uploadUserPhoto(user.id, photoFile)
        profilePhoto = res.data?.data?.photoUrl
        if (profilePhoto) {
          qc.setQueriesData(
            { queryKey: ['app-users'] },
            (old: PaginatedResponse<AppUser> | undefined) =>
              old ? { ...old, data: old.data.map(u => u.id === user.id ? { ...u, profilePhoto } : u) } : old
          )
        }
      } catch { /* non-fatal */ }
      finally { setUploading(false) }
    }

    const payload: Record<string, unknown> = {
      name:          form.name,
      email:         form.email,
      phone:         form.phone,
      allottedSlots: form.allottedSlots,
    }
    if (form.password) payload.password = form.password
    if (profilePhoto)  payload.profilePhoto = profilePhoto

    updateMut.mutate(
      { id: user.id, data: payload as Parameters<typeof updateMut.mutate>[0]['data'] },
      {
        onSuccess: () => onDone(),
        onError:   (e: unknown) => setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save'),
      }
    )
  }

  return (
    <div className="space-y-4">
      {/* Photo */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div
            className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {photoPreview
              ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              : <Camera className="h-7 w-7 text-gray-300" />
            }
          </div>
          {photoPreview && (
            <button type="button"
              onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Profile Photo</p>
          <p className="text-xs text-gray-400 mt-0.5">JPG, PNG or WebP · max 5 MB</p>
          <button type="button" onClick={() => fileRef.current?.click()} className="mt-1.5 text-xs text-brand hover:underline">
            {photoPreview ? 'Change photo' : 'Upload photo'}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)) }} />
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Full Name" required className="col-span-2">
          <Input placeholder="John Doe" value={form.name} onChange={e => set('name', e.target.value)} />
        </FormField>
        <FormField label="Email" required>
          <Input type="email" placeholder="john@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
        </FormField>
        <FormField label="Phone" required>
          <Input placeholder="9876543210" maxLength={10} value={form.phone} onChange={e => set('phone', e.target.value)} />
        </FormField>
        <FormField label="New Password (optional)" className="col-span-2">
          <Input type="password" placeholder="Leave blank to keep current" value={form.password} onChange={e => set('password', e.target.value)} />
        </FormField>
        <FormField label="Allotted Slots" className="col-span-2">
          <Input type="number" min={1} max={100} value={form.allottedSlots} onChange={e => set('allottedSlots', Number(e.target.value))} />
        </FormField>
      </div>

      {err && <p className="text-xs text-red-500">{err}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onDone}>Cancel</Button>
        <Button type="button" size="sm" disabled={updateMut.isPending || uploading} onClick={handleSave}>
          <Check className="h-3.5 w-3.5 mr-1" />
          {uploading ? 'Uploading…' : updateMut.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
export const AppUserDetailDrawer = ({ user, onClose }: Props) => {
  const { data, isLoading } = useAppUserDetail(user?.id ?? null)
  const [addingVehicle, setAddingVehicle] = useState(false)
  const [editing,       setEditing]       = useState(false)

  // Reset editing when a different user is opened
  useEffect(() => { setEditing(false); setAddingVehicle(false) }, [user?.id])

  if (!user) return null

  // Prefer live detail data over the stale snapshot from the list
  const displayName  = data?.name         ?? user.name
  const displayEmail = data?.email        ?? user.email
  const displayPhone = data?.phone        ?? user.phone
  const allottedSlots = data?.allottedSlots ?? user.allottedSlots ?? 1
  const vehicleCount  = data?.vehicles.length ?? 0
  const canAddVehicle = vehicleCount < allottedSlots

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-full sm:max-w-xl bg-white h-full flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            {(data?.profilePhoto ?? user.profilePhoto) ? (
              <img src={data?.profilePhoto ?? user.profilePhoto} alt={user.name}
                className="h-11 w-11 rounded-full object-cover ring-2 ring-gray-100 shrink-0" />
            ) : (
              <div className="h-11 w-11 rounded-full bg-brand/10 text-brand flex items-center justify-center text-lg font-semibold shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-400">{displayEmail} · {displayPhone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm" variant={editing ? 'ghost' : 'outline'}
              className={`h-8 text-xs gap-1.5 ${editing ? 'text-gray-500' : ''}`}
              onClick={() => setEditing(v => !v)}
            >
              <Pencil className="h-3.5 w-3.5" />
              {editing ? 'Cancel Edit' : 'Edit'}
            </Button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Edit mode ── */}
          {editing ? (
            <EditForm
              user={{ ...user, name: displayName, email: displayEmail, phone: displayPhone, allottedSlots, profilePhoto: data?.profilePhoto ?? user.profilePhoto }}
              onDone={() => setEditing(false)}
            />
          ) : isLoading ? (
            <div className="space-y-4">
              {[1,2,3,4].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : !data ? (
            <p className="text-center text-gray-400 py-10">Failed to load details.</p>
          ) : (
            <>
              {/* Wallet */}
              <Section icon={Wallet} title="Wallet">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { label: 'Balance',         value: formatCurrency(data.wallet.balance),        color: 'text-green-700' },
                    { label: 'Total Recharged',  value: formatCurrency(data.wallet.totalRecharges), color: 'text-blue-700' },
                    { label: 'Last Recharge',    value: data.wallet.lastRechargeAt ? formatDate(data.wallet.lastRechargeAt) : '—', color: 'text-gray-600' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                      <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Vehicles */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-brand" />
                    <h3 className="text-sm font-semibold text-gray-700">
                      Vehicles ({vehicleCount} / {allottedSlots} slots)
                    </h3>
                  </div>
                  {canAddVehicle && !addingVehicle && (
                    <Button size="sm" variant="outline"
                      className="h-7 text-xs gap-1.5 border-brand/30 text-brand hover:bg-brand/5"
                      onClick={() => setAddingVehicle(true)}>
                      <Plus className="h-3.5 w-3.5" /> Add Vehicle
                    </Button>
                  )}
                  {!canAddVehicle && (
                    <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Slots full</span>
                  )}
                </div>

                {data.vehicles.length === 0 ? (
                  <p className="text-sm text-gray-400">No vehicles registered.</p>
                ) : (
                  <div className="space-y-2">
                    {data.vehicles.map((v) => (
                      <VehicleCard key={v.id} vehicle={v} userId={user.id} />
                    ))}
                  </div>
                )}

                {addingVehicle && (
                  <AddVehicleForm userId={user.id} onDone={() => setAddingVehicle(false)} />
                )}
              </div>

              {/* Recent parking sessions */}
              <Section icon={Clock} title="Recent Parking Sessions">
                {data.recentSessions.length === 0 ? (
                  <p className="text-sm text-gray-400">No parking sessions yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.recentSessions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-xs">
                        <div>
                          <span className="font-mono font-semibold text-gray-700 uppercase">{s.numberPlate}</span>
                          {s.vehicleName && <span className="text-gray-400 ml-1.5">· {s.vehicleName}</span>}
                          <p className="text-gray-400 mt-0.5">{formatDateTime(s.entryTime)}</p>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={s.status} />
                          {s.durationMinutes != null && (
                            <p className="text-gray-400 mt-1">{Math.round(s.durationMinutes)} min</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Recharge history */}
              <Section icon={ArrowDownUp} title="Recharge History">
                {data.rechargeHistory.length === 0 ? (
                  <p className="text-sm text-gray-400">No recharges yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.rechargeHistory.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-xs">
                        <div>
                          <span className="font-semibold text-green-700">+{formatCurrency(r.amount)}</span>
                          <span className="text-gray-400 ml-2">via {r.payment_method}</span>
                          <p className="text-gray-400 font-mono mt-0.5">{r.transaction_ref}</p>
                        </div>
                        <span className="text-gray-400">{formatDate(r.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Recent visitors */}
              <Section icon={Users} title="Recent Visitors">
                {data.visitors.length === 0 ? (
                  <p className="text-sm text-gray-400">No visitor invitations yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.visitors.map((v) => (
                      <div key={v.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-xs">
                        <div>
                          <p className="font-medium text-gray-800">{v.visitor_name}</p>
                          <p className="text-gray-400">{v.visitor_phone} · <span className="font-mono">{v.visitor_car_number}</span></p>
                          <p className="text-gray-400 mt-0.5">{formatDate(v.visit_date)} · {v.purpose}</p>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={v.status} />
                          <p className="text-[10px] text-gray-400 font-mono mt-1">{v.tracking_number}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
