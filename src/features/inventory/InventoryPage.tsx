import { useState } from 'react'
import { Plus, Package, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button }       from '@/components/ui/button'
import { Input }        from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader }   from '@/components/shared/PageHeader'
import { SearchInput }  from '@/components/shared/SearchInput'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { FormField }    from '@/components/shared/FormField'
import { useInventory, useCreateItem, useUpdateItem, useDeleteItem } from './hooks/useInventory'
import { useVendorDropdown } from '@/features/vendor-management/hooks/useVendors'
import { useDebounce }   from '@/hooks/useDebounce'
import { usePagination } from '@/hooks/usePagination'
import { formatDate }    from '@/lib/utils'
import type { InventoryItem, CreateInventoryItemDto, InventoryStatus } from '@/types'

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  itemName:     z.string().min(2, 'Name required'),
  totalQty:     z.coerce.number().min(0),
  availableQty: z.coerce.number().min(0),
  unit:         z.string().min(1, 'Unit required'),
  vendorId:     z.string().optional(),
})
type FormData = z.infer<typeof schema>

// ─── Status Badge ─────────────────────────────────────────────────────────────
const InventoryStatusBadge = ({ status }: { status: InventoryStatus }) => {
  const map: Record<InventoryStatus, { bg: string; text: string; Icon: React.ElementType }> = {
    'In Stock':  { bg: 'bg-green-50',  text: 'text-green-700',  Icon: CheckCircle  },
    'Low Stock': { bg: 'bg-amber-50',  text: 'text-amber-700',  Icon: AlertTriangle },
    'Critical':  { bg: 'bg-red-50',    text: 'text-red-700',    Icon: AlertCircle   },
  }
  const { bg, text, Icon } = map[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${bg} ${text}`}>
      <Icon className="h-3 w-3" /> {status}
    </span>
  )
}

// ─── Stock Bar ────────────────────────────────────────────────────────────────
const StockBar = ({ available, total }: { available: number; total: number }) => {
  const pct = total > 0 ? Math.min(100, Math.round((available / total) * 100)) : 0
  const color = pct <= 10 ? 'bg-red-500' : pct <= 25 ? 'bg-amber-500' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500">{available}/{total}</span>
    </div>
  )
}

// ─── Item Modal ───────────────────────────────────────────────────────────────
const ItemModal = ({ open, onClose, title, initial, loading, onSubmit }: {
  open: boolean
  onClose: () => void
  title: string
  initial?: Partial<FormData>
  loading: boolean
  onSubmit: (d: FormData) => void
}) => {
  const { data: vendors } = useVendorDropdown()
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { totalQty: 0, availableQty: 0, unit: 'pcs', ...initial },
  })

  const handleClose = () => { reset(); onClose() }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 pt-4 pb-6">
          <FormField label="Item Name" error={errors.itemName?.message} required>
            <Input {...register('itemName')} placeholder="e.g. ANPR Camera" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Total Qty" error={errors.totalQty?.message} required>
              <Input type="number" {...register('totalQty')} />
            </FormField>
            <FormField label="Available Qty" error={errors.availableQty?.message} required>
              <Input type="number" {...register('availableQty')} />
            </FormField>
          </div>
          <FormField label="Unit" error={errors.unit?.message} required>
            <Controller name="unit" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
                <SelectContent>
                  {['pcs', 'sets', 'rolls', 'meters', 'kg', 'liters', 'boxes'].map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField label="Vendor (optional)">
            <Controller name="vendorId" control={control} render={({ field }) => (
              <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {vendors?.map(v => <SelectItem key={v.id} value={v.id}>{v.vendorName}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </FormField>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const InventoryPage = () => {
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const { page, setPage, limit }  = usePagination()
  const q = useDebounce(search)

  const { data, isLoading } = useInventory({
    page, limit,
    search: q || undefined,
    status: statusFilter || undefined,
  })

  const createMut = useCreateItem()
  const updateMut = useUpdateItem()
  const deleteMut = useDeleteItem()

  const [addOpen,   setAddOpen]   = useState(false)
  const [editItem,  setEditItem]  = useState<InventoryItem | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)

  // summary counts
  const items = data?.data ?? []
  const inStock  = items.filter(i => i.status === 'In Stock').length
  const lowStock = items.filter(i => i.status === 'Low Stock').length
  const critical = items.filter(i => i.status === 'Critical').length

  const columns: Column<InventoryItem>[] = [
    { header: 'Item',    accessor: (r) => <span className="font-medium text-gray-800 text-sm">{r.itemName}</span> },
    { header: 'Stock',   accessor: (r) => <StockBar available={r.availableQty} total={r.totalQty} /> },
    { header: 'Unit',    accessor: 'unit', className: 'text-gray-500 text-sm' },
    { header: 'Vendor',  accessor: (r) => <span className="text-xs text-gray-500">{r.vendorName ?? '—'}</span> },
    { header: 'Status',  accessor: (r) => <InventoryStatusBadge status={r.status} /> },
    { header: 'Updated', accessor: (r) => <span className="text-xs text-gray-400">{formatDate(r.updatedAt)}</span> },
    {
      header: 'Actions', accessor: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setEditItem(r)}>Edit</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteId(r.id)}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Track equipment stock and availability">
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
      </PageHeader>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3 mb-5">
        {[
          { label: 'In Stock',  count: inStock,  color: 'bg-green-50 text-green-700 border-green-200', Icon: CheckCircle  },
          { label: 'Low Stock', count: lowStock, color: 'bg-amber-50 text-amber-700 border-amber-200', Icon: AlertTriangle },
          { label: 'Critical',  count: critical, color: 'bg-red-50 text-red-700 border-red-200',       Icon: AlertCircle   },
        ].map(({ label, count, color, Icon }) => (
          <button key={label}
            onClick={() => setStatusFilter(statusFilter === label ? '' : label)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${color} ${statusFilter === label ? 'ring-2 ring-offset-1 ring-current' : 'opacity-80 hover:opacity-100'}`}>
            <Icon className="h-4 w-4" /> {label}: {count}
          </button>
        ))}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-gray-50 text-gray-700 border-gray-200 text-sm">
          <Package className="h-4 w-4" /> Total: {data?.meta?.total ?? 0}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search items…" className="w-full sm:w-72" />

        {statusFilter && (
          <Button variant="outline" size="sm" onClick={() => setStatusFilter('')} className="text-xs">
            Clear filter ✕
          </Button>
        )}
      </div>

      <DataTable
        columns={columns} data={items} loading={isLoading}
        keyExtractor={(r) => r.id}
        pagination={data?.meta ? { ...data.meta, totalPages: data.meta.totalPages } : undefined}
        onPageChange={setPage}
      />

      <ItemModal open={addOpen} onClose={() => setAddOpen(false)} title="Add Inventory Item"
        loading={createMut.isPending}
        onSubmit={(d) => createMut.mutate(d as CreateInventoryItemDto, { onSuccess: () => setAddOpen(false) })}
      />
      <ItemModal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Inventory Item"
        initial={editItem ?? undefined} loading={updateMut.isPending}
        onSubmit={(d) => updateMut.mutate({ id: editItem!.id, data: d }, { onSuccess: () => setEditItem(null) })}
      />
      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Item"
        message="This will permanently remove the item from inventory."
        onConfirm={() => deleteMut.mutate(deleteId!, { onSuccess: () => setDeleteId(null) })}
        loading={deleteMut.isPending}
      />
    </div>
  )
}

export default InventoryPage
