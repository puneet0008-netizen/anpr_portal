import { useState, useEffect } from 'react'
import { X, Pencil, Check, Car, CalendarDays, Phone, Mail, ShieldCheck, Plus, Trash2 } from 'lucide-react'
import {
  useUpdateWebUser, useUserVehicles, useAddUserVehicle, useRemoveUserVehicle,
} from '../hooks/useParkingUsers'
import { formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField } from '@/components/shared/FormField'
import type { WebUser, AppVehicle } from '@/types'

interface Props {
  user: WebUser | null
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

// ─── Inline edit form ─────────────────────────────────────────────────────────
const EditForm = ({ user, onDone }: { user: WebUser; onDone: () => void }) => {
  const updateMut = useUpdateWebUser()
  const [form, setForm] = useState({
    name:     user.name,
    email:    user.email,
    phone:    user.phone,
    password: '',
    status:   user.status as string,
  })
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.name || !form.email || !form.phone) { setErr('Name, email and phone are required'); return }
    setErr('')
    const payload: Record<string, string> = { name: form.name, email: form.email, phone: form.phone, status: form.status }
    if (form.password) payload.password = form.password
    updateMut.mutate(
      { id: user.id, data: payload },
      {
        onSuccess: () => onDone(),
        onError: (e: unknown) =>
          setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save'),
      }
    )
  }

  return (
    <div className="space-y-4">
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
        <FormField label="Status" className="col-span-2">
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="New Password (optional)" className="col-span-2">
          <Input type="password" placeholder="Leave blank to keep current"
            value={form.password} onChange={e => set('password', e.target.value)} />
        </FormField>
      </div>
      {err && <p className="text-xs text-red-500">{err}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onDone}>Cancel</Button>
        <Button type="button" size="sm" disabled={updateMut.isPending} onClick={handleSave}>
          <Check className="h-3.5 w-3.5 mr-1" />
          {updateMut.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}

// ─── Add Vehicle form ─────────────────────────────────────────────────────────
const AddVehicleForm = ({ userId, onDone }: { userId: string; onDone: () => void }) => {
  const addMut = useAddUserVehicle()
  const [form, setForm] = useState({
    numberPlate:  '',
    vehicleType:  'four_wheeler' as 'two_wheeler' | 'four_wheeler',
    vehicleName:  '',
    vehicleModel: '',
  })
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleAdd = () => {
    if (!form.numberPlate.trim()) { setErr('Number plate is required'); return }
    if (!form.vehicleName.trim()) { setErr('Vehicle name is required'); return }
    if (!form.vehicleModel.trim()) { setErr('Vehicle model is required'); return }
    setErr('')
    addMut.mutate(
      { userId, data: { ...form, numberPlate: form.numberPlate.toUpperCase() } },
      { onSuccess: () => { setForm({ numberPlate: '', vehicleType: 'four_wheeler', vehicleName: '', vehicleModel: '' }); onDone() } }
    )
  }

  return (
    <div className="mt-3 border border-dashed border-brand/30 rounded-xl p-4 bg-brand/5 space-y-3">
      <p className="text-xs font-semibold text-brand">New Vehicle</p>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Number Plate" required>
          <Input placeholder="KA01AB1234" className="uppercase font-mono text-sm h-8"
            value={form.numberPlate} onChange={e => set('numberPlate', e.target.value.toUpperCase())} />
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
          <Input placeholder="My Honda City" className="text-sm h-8"
            value={form.vehicleName} onChange={e => set('vehicleName', e.target.value)} />
        </FormField>
        <FormField label="Model" required>
          <Input placeholder="City SV 2022" className="text-sm h-8"
            value={form.vehicleModel} onChange={e => set('vehicleModel', e.target.value)} />
        </FormField>
      </div>
      {err && <p className="text-xs text-red-500">{err}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onDone}>Cancel</Button>
        <Button type="button" size="sm" className="h-7 text-xs bg-brand hover:bg-brand/90 text-white"
          disabled={addMut.isPending} onClick={handleAdd}>
          {addMut.isPending ? 'Adding…' : 'Add Vehicle'}
        </Button>
      </div>
    </div>
  )
}

// ─── Vehicle card ─────────────────────────────────────────────────────────────
const VehicleCard = ({ vehicle, userId }: { vehicle: AppVehicle; userId: string }) => {
  const removeMut = useRemoveUserVehicle()
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded font-semibold uppercase">
            {vehicle.numberPlate}
          </span>
          {vehicle.isPrimary && (
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Primary</span>
          )}
          <span className="text-[10px] text-gray-400">{vehicleTypeLabel(vehicle.vehicleType)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{vehicle.vehicleName} · {vehicle.vehicleModel}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={vehicle.status} />
        {!vehicle.isPrimary && (
          <button
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            disabled={removeMut.isPending}
            onClick={() => removeMut.mutate({ userId, vehicleId: vehicle.id })}
            title="Remove vehicle"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Vehicle section ──────────────────────────────────────────────────────────
const VehicleSection = ({ userId }: { userId: string }) => {
  const { data: vehicles, isLoading } = useUserVehicles(userId)
  const [adding, setAdding] = useState(false)

  return (
    <Section icon={Car} title="Vehicles">
      {isLoading ? (
        <div className="h-12 rounded-lg bg-gray-100 animate-pulse" />
      ) : (
        <>
          {(!vehicles || vehicles.length === 0) && !adding && (
            <p className="text-sm text-gray-400 mb-2">No vehicles registered.</p>
          )}

          {vehicles && vehicles.length > 0 && (
            <div className="space-y-2 mb-2">
              {vehicles.map(v => <VehicleCard key={v.id} vehicle={v} userId={userId} />)}
            </div>
          )}

          {adding ? (
            <AddVehicleForm userId={userId} onDone={() => setAdding(false)} />
          ) : (
            <Button size="sm" variant="outline"
              className="h-7 text-xs gap-1.5 border-brand/30 text-brand hover:bg-brand/5"
              onClick={() => setAdding(true)}>
              <Plus className="h-3.5 w-3.5" /> Add Vehicle
            </Button>
          )}
        </>
      )}
    </Section>
  )
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
export const WebUserDetailDrawer = ({ user, onClose }: Props) => {
  const [editing, setEditing] = useState(false)

  useEffect(() => { setEditing(false) }, [user?.id])

  if (!user) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-full sm:max-w-xl bg-white h-full flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-brand/10 text-brand flex items-center justify-center text-lg font-semibold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-400">{user.email} · {user.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm" variant={editing ? 'ghost' : 'outline'}
              className="h-8 text-xs gap-1.5"
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
          {editing ? (
            <EditForm user={user} onDone={() => setEditing(false)} />
          ) : (
            <>
              {/* Profile stats */}
              <Section icon={ShieldCheck} title="Profile">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { label: 'Status',       value: <StatusBadge status={user.status} /> },
                    { label: 'Joined',       value: formatDate(user.joinedAt) },
                    { label: 'Last Updated', value: formatDate(user.updatedAt) },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                      <div className="text-sm font-bold text-gray-700">{s.value}</div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Contact */}
              <Section icon={Mail} title="Contact">
                <div className="space-y-2">
                  {[
                    { icon: Mail,  label: 'Email', value: user.email },
                    { icon: Phone, label: 'Phone', value: user.phone },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5">
                      <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400">{label}</p>
                        <p className="text-sm text-gray-700">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Vehicles */}
              <VehicleSection userId={user.id} />

              {/* Timeline */}
              <Section icon={CalendarDays} title="Timeline">
                <div className="space-y-2">
                  {[
                    { label: 'Joined',       value: formatDate(user.joinedAt) },
                    { label: 'Last Updated', value: formatDate(user.updatedAt) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-xs">
                      <span className="text-gray-500">{label}</span>
                      <span className="text-gray-700 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
