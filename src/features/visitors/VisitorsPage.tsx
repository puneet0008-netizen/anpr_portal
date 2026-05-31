import { useState, useEffect, useRef } from 'react'
import { CalendarDays, Plus, Search, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader }  from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/shared/FormField'
import { useVisitors, useUpdateVisitorStatus, useCreateVisitor } from './hooks/useVisitors'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDate } from '@/lib/utils'
import * as usersApi from '@/api/parking-users.api'
import type { Visitor, VisitorStatus } from '@/types'

const STATUS_TRANSITIONS: Record<VisitorStatus, VisitorStatus[]> = {
  pending:     ['checked_in', 'cancelled'],
  checked_in:  ['checked_out'],
  checked_out: [],
  expired:     [],
  cancelled:   [],
}

// ─── Status action button ─────────────────────────────────────────────────────
const StatusActions = ({ visitor }: { visitor: Visitor }) => {
  const updateMut = useUpdateVisitorStatus()
  const next = STATUS_TRANSITIONS[visitor.status]
  if (!next.length) return <span className="text-xs text-gray-400">—</span>

  return (
    <div className="flex gap-1">
      {next.map((s) => (
        <Button
          key={s}
          size="sm"
          variant={s === 'cancelled' ? 'outline' : 'default'}
          className={`h-7 text-xs px-2 ${
            s === 'checked_in'  ? 'bg-green-600 hover:bg-green-700 text-white' :
            s === 'checked_out' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
            s === 'cancelled'   ? 'text-red-600 border-red-200 hover:bg-red-50' :
            ''
          }`}
          disabled={updateMut.isPending}
          onClick={() => updateMut.mutate({ id: visitor.id, status: s })}
        >
          {s === 'checked_in' ? 'Check In' : s === 'checked_out' ? 'Check Out' : 'Cancel'}
        </Button>
      ))}
    </div>
  )
}

// ─── User search picker ───────────────────────────────────────────────────────
type UserOption = { id: string; name: string; phone: string; vehicle_number: string }

const UserPicker = ({ value, onChange }: {
  value: { id: string; name: string; phone: string } | null
  onChange: (u: UserOption | null) => void
}) => {
  const [search, setSearch]   = useState('')
  const [open, setOpen]       = useState(false)
  const debouncedSearch       = useDebounce(search, 300)
  const wrapperRef            = useRef<HTMLDivElement>(null)

  const { data, isFetching } = useQuery({
    queryKey: ['user-search-visitor', debouncedSearch],
    queryFn:  () => usersApi.searchAppUsers(debouncedSearch).then(r => r.data.data),
    enabled:  debouncedSearch.length >= 2,
  })

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (u: UserOption) => {
    onChange(u)
    setSearch('')
    setOpen(false)
  }

  const handleClear = () => { onChange(null); setSearch(''); setOpen(false) }

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-gray-800">{value.name}</p>
          <p className="text-xs text-gray-500">{value.phone}</p>
        </div>
        <button onClick={handleClear} className="p-1 rounded hover:bg-green-100 text-gray-400 hover:text-red-500 transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <Input
          className="pl-8"
          placeholder="Search by name or phone…"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => search.length >= 2 && setOpen(true)}
        />
      </div>
      {open && debouncedSearch.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {isFetching ? (
            <p className="text-xs text-gray-400 text-center py-3">Searching…</p>
          ) : data && data.length > 0 ? (
            data.map(u => (
              <button
                key={u.id}
                type="button"
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                onClick={() => handleSelect(u)}
              >
                <p className="text-sm font-medium text-gray-800">{u.name}</p>
                <p className="text-xs text-gray-400">{u.phone} {u.vehicle_number ? `· ${u.vehicle_number}` : ''}</p>
              </button>
            ))
          ) : (
            <p className="text-xs text-gray-400 text-center py-3">No users found</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add Visitor modal ────────────────────────────────────────────────────────
const EMPTY_FORM = {
  visitorName: '', visitorPhone: '', visitorCarNumber: '',
  purpose: '', visitDate: '', visitTime: '',
  durationHours: 1, durationMinutes: 0,
}

const AddVisitorModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const createMut = useCreateVisitor()
  const [form, setForm]             = useState(EMPTY_FORM)
  const [invitedBy, setInvitedBy]   = useState<{ id: string; name: string; phone: string } | null>(null)
  const [err, setErr]               = useState('')

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const reset = () => { setForm(EMPTY_FORM); setInvitedBy(null); setErr('') }

  const handleSubmit = () => {
    if (!form.visitorName.trim())     { setErr('Visitor name is required'); return }
    if (!form.visitorPhone.trim())    { setErr('Visitor phone is required'); return }
    if (!form.visitorCarNumber.trim()){ setErr('Car number is required'); return }
    if (!form.visitDate)              { setErr('Visit date is required'); return }
    if (!form.visitTime)              { setErr('Visit time is required'); return }
    setErr('')
    createMut.mutate(
      {
        ...form,
        visitorCarNumber: form.visitorCarNumber.toUpperCase(),
        purpose: form.purpose || 'Visit',
        invitedBy: invitedBy?.id,
      },
      {
        onSuccess: () => { reset(); onClose() },
        onError: (e: unknown) => setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add visitor'),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Visitor</DialogTitle></DialogHeader>
        <div className="px-6 py-4 space-y-4">
          {/* Invited by user picker */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium leading-none">Invited By (App User)</label>
              <span className="text-xs text-gray-400">optional</span>
            </div>
            <UserPicker value={invitedBy} onChange={setInvitedBy} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Visitor Name" required>
              <Input placeholder="John Doe" value={form.visitorName} onChange={e => set('visitorName', e.target.value)} />
            </FormField>
            <FormField label="Phone" required>
              <Input placeholder="9876543210" maxLength={10} value={form.visitorPhone} onChange={e => set('visitorPhone', e.target.value)} />
            </FormField>
            <FormField label="Car Number" required>
              <Input placeholder="KA01AB1234" className="uppercase font-mono" value={form.visitorCarNumber} onChange={e => set('visitorCarNumber', e.target.value.toUpperCase())} />
            </FormField>
            <FormField label="Purpose">
              <Input placeholder="Meeting / Delivery…" value={form.purpose} onChange={e => set('purpose', e.target.value)} />
            </FormField>
            <FormField label="Visit Date" required>
              <Input type="date" value={form.visitDate} onChange={e => set('visitDate', e.target.value)} />
            </FormField>
            <FormField label="Visit Time" required>
              <Input type="time" value={form.visitTime} onChange={e => set('visitTime', e.target.value)} />
            </FormField>
            <FormField label="Duration Hours">
              <Input type="number" min={0} max={24} value={form.durationHours} onChange={e => set('durationHours', Number(e.target.value))} />
            </FormField>
            <FormField label="Duration Minutes">
              <Input type="number" min={0} max={59} value={form.durationMinutes} onChange={e => set('durationMinutes', Number(e.target.value))} />
            </FormField>
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
        </div>
        <DialogFooter className="px-6 pb-4 gap-2">
          <Button variant="outline" size="sm" onClick={() => { reset(); onClose() }}>Cancel</Button>
          <Button size="sm" disabled={createMut.isPending} onClick={handleSubmit}>
            {createMut.isPending ? 'Adding…' : 'Add Visitor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Visitors table ───────────────────────────────────────────────────────────
const VisitorsTable = ({ status, date }: { status?: VisitorStatus; date?: string }) => {
  const { data, isLoading } = useVisitors({ status, date, limit: 50 })

  const columns: Column<Visitor>[] = [
    {
      header: 'Visitor',
      accessor: (r) => (
        <div>
          <p className="font-medium text-gray-800">{r.visitor_name}</p>
          <p className="text-xs text-gray-400">{r.visitor_phone}</p>
        </div>
      ),
    },
    {
      header: 'Car',
      accessor: (r) => (
        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded uppercase">
          {r.visitor_car_number}
        </span>
      ),
    },
    {
      header: 'Invited By',
      accessor: (r) => (
        <div>
          <p className="text-sm text-gray-700">{r.invited_by_name ?? '—'}</p>
          <p className="text-xs text-gray-400">{r.invited_by_phone ?? ''}</p>
        </div>
      ),
    },
    { header: 'Purpose', accessor: (r) => <span className="text-sm text-gray-600">{r.purpose}</span> },
    {
      header: 'Visit',
      accessor: (r) => (
        <div className="text-xs text-gray-600">
          <p>{formatDate(r.visit_date)}</p>
          <p className="text-gray-400">{r.visit_time} · {r.duration_hours}h {r.duration_minutes}m</p>
        </div>
      ),
    },
    {
      header: 'Tracking',
      accessor: (r) => (
        <span className="font-mono text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
          {r.tracking_number}
        </span>
      ),
    },
    { header: 'Status',  accessor: (r) => <StatusBadge status={r.status} /> },
    { header: 'Actions', accessor: (r) => <StatusActions visitor={r} /> },
  ]

  return (
    <DataTable
      columns={columns}
      data={data?.data ?? []}
      loading={isLoading}
      keyExtractor={(r) => r.id}
    />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const VisitorsPage = () => {
  const [dateFilter, setDateFilter] = useState('')
  const [addOpen, setAddOpen]       = useState(false)

  return (
    <div>
      <PageHeader
        title="Visitor Management"
        subtitle="Monitor and manage visitor check-ins invited by app users"
        action={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Visitor
          </Button>
        }
      />

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="date"
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        {dateFilter && (
          <Button variant="ghost" size="sm" className="text-xs text-gray-500" onClick={() => setDateFilter('')}>
            Clear
          </Button>
        )}
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="checked_in">Checked In</TabsTrigger>
          <TabsTrigger value="checked_out">Checked Out</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <VisitorsTable status="pending" date={dateFilter || undefined} />
        </TabsContent>
        <TabsContent value="checked_in">
          <VisitorsTable status="checked_in" date={dateFilter || undefined} />
        </TabsContent>
        <TabsContent value="checked_out">
          <VisitorsTable status="checked_out" date={dateFilter || undefined} />
        </TabsContent>
        <TabsContent value="cancelled">
          <VisitorsTable status="cancelled" date={dateFilter || undefined} />
        </TabsContent>
        <TabsContent value="all">
          <VisitorsTable date={dateFilter || undefined} />
        </TabsContent>
      </Tabs>

      <AddVisitorModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

export default VisitorsPage
