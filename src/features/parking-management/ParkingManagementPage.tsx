import { useState } from 'react'
import { Car, TrendingUp, Building2, Activity, IndianRupee, RefreshCw, X, CalendarCheck } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button }       from '@/components/ui/button'
import { Input }        from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader }   from '@/components/shared/PageHeader'
import { StatusBadge }  from '@/components/shared/StatusBadge'
import { SearchInput }  from '@/components/shared/SearchInput'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { FormField }    from '@/components/shared/FormField'
import {
  useParkingSites, useParkingStats, useRecentRecharges,
  useCreateParking, useUpdateParking, useDeleteParking,
  useParkingRecharge,
} from './hooks/useParking'
import { useDebounce }   from '@/hooks/useDebounce'
import { usePagination } from '@/hooks/usePagination'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ParkingSite, CreateParkingDto, ParkingRecharge } from '@/types'
import * as parkingApi from '@/api/parking.api'

// ─── Schemas ──────────────────────────────────────────────────────────────────
const parkingSchema = z.object({
  siteName:             z.string().min(2, 'Site name required'),
  location:             z.string().min(2, 'Location required'),
  type:                 z.enum(['Commercial', 'Public', 'Mall', 'Residential']),
  totalCapacity:        z.coerce.number().min(1, 'Capacity required'),
  hourlyRate:           z.coerce.number().min(0),
  dailyRate:            z.coerce.number().min(0),
  monthlyRate:          z.coerce.number().min(0),
  entryCameraIp:        z.string().min(1, 'Entry camera IP required'),
  exitCameraIp:         z.string().min(1, 'Exit camera IP required'),
  barrierControllerIp:  z.string().min(1, 'Barrier controller IP required'),
  assignedVendorId:     z.string().nullish().transform(v => v ?? undefined),
})
type ParkingFormData = z.infer<typeof parkingSchema>

const rechargeSchema = z.object({
  userId:        z.string().min(1, 'Select a user'),
  amount:        z.coerce.number().min(1, 'Amount required'),
  paymentMethod: z.enum(['Cash', 'UPI', 'Card']),
  transactionRef: z.string().min(1, 'Transaction reference required'),
})
type RechargeFormData = z.infer<typeof rechargeSchema>

// ─── Occupancy Bar ────────────────────────────────────────────────────────────
const OccupancyBar = ({ occupied, allottedSlots, total }: { occupied: number; allottedSlots: number; total: number }) => {
  const activePct   = total > 0 ? Math.min(100, Math.round((occupied      / total) * 100)) : 0
  const allottedPct = total > 0 ? Math.min(100, Math.round((allottedSlots / total) * 100)) : 0
  const activeColor   = activePct   >= 90 ? 'bg-red-500'   : activePct   >= 70 ? 'bg-amber-500' : 'bg-green-500'
  const allottedColor = allottedPct >= 90 ? 'bg-red-400'   : allottedPct >= 70 ? 'bg-amber-400' : 'bg-blue-400'
  return (
    <div className="space-y-1.5 min-w-[150px]">
      {/* Active sessions row */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400 w-12 shrink-0">Active</span>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${activeColor}`} style={{ width: `${activePct}%` }} />
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap w-10 text-right">{occupied}/{total}</span>
      </div>
      {/* Allotted slots row */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-blue-400 w-12 shrink-0">Allotted</span>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${allottedColor}`} style={{ width: `${allottedPct}%` }} />
        </div>
        <span className="text-xs text-blue-500 whitespace-nowrap w-10 text-right">{allottedSlots}/{total}</span>
      </div>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
    </div>
  </div>
)

// ─── Parking Form ─────────────────────────────────────────────────────────────
const ParkingForm = ({ initial, onSubmit, loading, onCancel }: {
  initial?: Partial<ParkingFormData>
  onSubmit: (d: ParkingFormData) => void
  loading: boolean
  onCancel?: () => void
}) => {
  const { register, handleSubmit, control, formState: { errors } } = useForm<ParkingFormData>({
    resolver: zodResolver(parkingSchema),
    defaultValues: {
      type: 'Commercial',
      totalCapacity: 0,
      hourlyRate: 0,
      dailyRate: 0,
      monthlyRate: 0,
      ...initial,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Site Name" error={errors.siteName?.message} required>
          <Input {...register('siteName')} placeholder="e.g. Downtown Parking A" />
        </FormField>
        <FormField label="Location" error={errors.location?.message} required>
          <Input {...register('location')} placeholder="e.g. MG Road, Bengaluru" />
        </FormField>
        <FormField label="Type" error={errors.type?.message} required>
          <Controller name="type" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {(['Commercial','Public','Mall','Residential'] as const).map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        </FormField>
        <FormField label="Total Capacity" error={errors.totalCapacity?.message} required>
          <Input type="number" {...register('totalCapacity')} placeholder="100" />
        </FormField>
        <FormField label="Hourly Rate (₹)" error={errors.hourlyRate?.message}>
          <Input type="number" {...register('hourlyRate')} placeholder="0" />
        </FormField>
        <FormField label="Daily Rate (₹)" error={errors.dailyRate?.message}>
          <Input type="number" {...register('dailyRate')} placeholder="0" />
        </FormField>
        <FormField label="Monthly Rate (₹)" error={errors.monthlyRate?.message}>
          <Input type="number" {...register('monthlyRate')} placeholder="0" />
        </FormField>
        <FormField label="Entry Camera IP" error={errors.entryCameraIp?.message} required>
          <Input {...register('entryCameraIp')} placeholder="192.168.1.10" />
        </FormField>
        <FormField label="Exit Camera IP" error={errors.exitCameraIp?.message} required>
          <Input {...register('exitCameraIp')} placeholder="192.168.1.11" />
        </FormField>
        <FormField label="Barrier Controller IP" error={errors.barrierControllerIp?.message} required>
          <Input {...register('barrierControllerIp')} placeholder="192.168.1.20" />
        </FormField>
      </div>
      {/* Buttons — onClick calls handleSubmit directly, bypassing native form submit */}
      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        )}
        <Button
          type="button"
          disabled={loading}
          onClick={() => handleSubmit(onSubmit)()}
        >
          {loading ? 'Saving…' : initial ? 'Update Site' : 'Create Site'}
        </Button>
      </div>
    </form>
  )
}

// ─── Parking List Tab ─────────────────────────────────────────────────────────
const ParkingListTab = () => {
  const [search, setSearch]       = useState('')
  const { page, setPage, limit }  = usePagination()
  const q = useDebounce(search)
  const { data, isLoading } = useParkingSites({ page, limit, search: q || undefined })
  const { data: stats }     = useParkingStats()

  const createMut = useCreateParking()
  const updateMut = useUpdateParking()
  const deleteMut = useDeleteParking()

  const [editSite,  setEditSite]  = useState<ParkingSite | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)

  const columns: Column<ParkingSite>[] = [
    { header: 'Site',       accessor: (r) => (
        <div>
          <p className="font-medium text-gray-800 text-sm">{r.siteName}</p>
          <p className="text-xs text-gray-400">{r.location}</p>
        </div>
      )
    },
    { header: 'Type',       accessor: (r) => <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{r.type}</span> },
    { header: 'Occupancy',  accessor: (r) => <OccupancyBar occupied={r.occupied} allottedSlots={r.allottedSlots} total={r.totalCapacity} /> },
    { header: 'Hourly',     accessor: (r) => <span className="text-sm">{formatCurrency(r.hourlyRate)}</span> },
    { header: 'Daily',      accessor: (r) => <span className="text-sm">{formatCurrency(r.dailyRate)}</span> },
    { header: 'Status',     accessor: (r) => <StatusBadge status={r.status} /> },
    { header: 'Vendor',     accessor: (r) => <span className="text-xs text-gray-500">{r.assignedVendorName ?? '—'}</span> },
    { header: 'Actions',    accessor: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setEditSite(r)}>Edit</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteId(r.id)}>Delete</Button>
        </div>
      )
    },
  ]

  return (
    <>
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total Sites"        value={stats.totalSites}           icon={Building2}     color="bg-brand-600" />
          <StatCard label="Total Capacity"     value={stats.totalCapacity}        icon={Car}           color="bg-blue-500" />
          <StatCard label="Active Sessions"    value={stats.currentlyOccupied}    icon={TrendingUp}    color="bg-amber-500" />
          <StatCard label="Allotted Slots"     value={stats.totalAllottedSlots}   icon={CalendarCheck} color="bg-purple-500" />
          <StatCard label="Active Sites"       value={stats.activeSites}          icon={Activity}      color="bg-green-500" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search sites…" className="w-full sm:w-72" />
      </div>

      <DataTable
        columns={columns} data={data?.data ?? []} loading={isLoading}
        keyExtractor={(r) => r.id}
        pagination={data?.meta ? { ...data.meta, totalPages: data.meta.totalPages } : undefined}
        onPageChange={setPage}
      />

      {/* Edit modal — plain overlay (avoids Radix DismissableLayer issues) */}
      {editSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditSite(null)} />
          <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-semibold text-gray-900">Edit Parking Site</h2>
              <button onClick={() => setEditSite(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Body — form with buttons inside */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ParkingForm
                key={editSite.id}
                initial={editSite}
                loading={updateMut.isPending}
                onCancel={() => setEditSite(null)}
                onSubmit={(d) => updateMut.mutate({ id: editSite.id, data: d }, { onSuccess: () => setEditSite(null) })}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Parking Site"
        message="This will permanently delete the site and all associated data."
        onConfirm={() => deleteMut.mutate(deleteId!, { onSuccess: () => setDeleteId(null) })}
        loading={deleteMut.isPending}
      />
    </>
  )
}

// ─── Create Parking Tab ───────────────────────────────────────────────────────
const CreateParkingTab = () => {
  const createMut = useCreateParking()
  const [key, setKey] = useState(0)

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-3xl">
      <h2 className="text-base font-semibold text-gray-800 mb-5">New Parking Site</h2>
      <ParkingForm
        key={key}
        loading={createMut.isPending}
        onSubmit={(d) => createMut.mutate(d as CreateParkingDto, { onSuccess: () => setKey(k => k + 1) })}
      />
    </div>
  )
}

// ─── Recharge Tab ─────────────────────────────────────────────────────────────
const RechargeTab = () => {
  const { data: recharges, isLoading } = useRecentRecharges()
  const rechargeMut = useParkingRecharge()

  const [query, setQuery]   = useState('')
  const [results, setResults] = useState<{ id: string; name: string; vehicleNumber: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null)

  const searchUser = async (q: string) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const r = await parkingApi.searchUserForRecharge(q)
      setResults((r.data as { data: typeof results }).data ?? [])
    } finally { setSearching(false) }
  }

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<RechargeFormData>({
    resolver: zodResolver(rechargeSchema),
    defaultValues: { paymentMethod: 'Cash' },
  })

  const submit = (d: RechargeFormData) => {
    rechargeMut.mutate(d, {
      onSuccess: () => { reset(); setSelectedUser(null); setQuery(''); setResults([]) },
    })
  }

  const rechargeColumns: Column<ParkingRecharge>[] = [
    { header: 'User',       accessor: 'userName', className: 'font-medium' },
    { header: 'Vehicle',    accessor: (r) => <span className="plate">{r.vehicleNumber}</span> },
    { header: 'Amount',     accessor: (r) => <span className="font-semibold text-green-700">{formatCurrency(r.amount)}</span> },
    { header: 'Method',     accessor: 'paymentMethod' },
    { header: 'Ref',        accessor: (r) => <span className="text-xs font-mono text-gray-500">{r.transactionRef}</span> },
    { header: 'Date',       accessor: (r) => <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span> },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Recharge form */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-brand-600" /> Wallet Recharge
        </h2>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <FormField label="Search User">
            <div className="relative">
              <Input value={query} onChange={(e) => searchUser(e.target.value)} placeholder="Name or vehicle number…" />
              {results.length > 0 && (
                <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {results.map(u => (
                    <button key={u.id} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                      onClick={() => { setSelectedUser(u); setResults([]); setQuery(u.name) }}>
                      <span className="font-medium">{u.name}</span>
                      <span className="ml-2 plate">{u.vehicleNumber}</span>
                    </button>
                  ))}
                </div>
              )}
              {searching && <p className="text-xs text-gray-400 mt-1">Searching…</p>}
            </div>
          </FormField>

          <input type="hidden" {...register('userId')} value={selectedUser?.id ?? ''} />
          {errors.userId && <p className="text-xs text-red-500">{errors.userId.message}</p>}

          <FormField label="Amount (₹)" error={errors.amount?.message} required>
            <Input type="number" {...register('amount')} placeholder="500" />
          </FormField>
          <FormField label="Payment Method" error={errors.paymentMethod?.message} required>
            <Controller name="paymentMethod" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Cash','UPI','Card'] as const).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField label="Transaction Ref" error={errors.transactionRef?.message} required>
            <Input {...register('transactionRef')} placeholder="TXN123456" />
          </FormField>
          <Button type="submit" className="w-full" disabled={rechargeMut.isPending || !selectedUser}>
            {rechargeMut.isPending ? 'Processing…' : 'Process Recharge'}
          </Button>
        </form>
      </div>

      {/* Recent recharges */}
      <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-brand-600" /> Recent Recharges
        </h2>
        <DataTable
          columns={rechargeColumns}
          data={recharges ?? []}
          loading={isLoading}
          keyExtractor={(r) => r.id}
        />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const ParkingManagementPage = () => (
  <div>
    <PageHeader title="Parking Management" subtitle="Manage parking sites, capacity and wallet recharges" />
    <Tabs defaultValue="list">
      <TabsList className="mb-5">
        <TabsTrigger value="list">Parking Sites</TabsTrigger>
        <TabsTrigger value="create">Create Site</TabsTrigger>
        <TabsTrigger value="recharge">Recharge</TabsTrigger>
      </TabsList>
      <TabsContent value="list"><ParkingListTab /></TabsContent>
      <TabsContent value="create"><CreateParkingTab /></TabsContent>
      <TabsContent value="recharge"><RechargeTab /></TabsContent>
    </Tabs>
  </div>
)

export default ParkingManagementPage
