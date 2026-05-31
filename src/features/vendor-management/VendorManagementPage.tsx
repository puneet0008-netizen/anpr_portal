import { useState } from 'react'
import { Plus, X, Building, Phone, Mail, MapPin, Calendar, FileText, Boxes } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button }       from '@/components/ui/button'
import { Input }        from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea }     from '@/components/ui/textarea'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader }   from '@/components/shared/PageHeader'
import { StatusBadge }  from '@/components/shared/StatusBadge'
import { SearchInput }  from '@/components/shared/SearchInput'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { FormField }    from '@/components/shared/FormField'
import { useQuery }     from '@tanstack/react-query'
import { useVendors, useVendorDetail, useCreateVendor, useUpdateVendor, useDeleteVendor } from './hooks/useVendors'
import { useDebounce }   from '@/hooks/useDebounce'
import { usePagination } from '@/hooks/usePagination'
import { formatDate }    from '@/lib/utils'
import * as parkingApi   from '@/api/parking.api'
import type { Vendor, VendorDetail, CreateVendorDto, PrimaryService } from '@/types'

// ─── Schema ───────────────────────────────────────────────────────────────────
const PRIMARY_SERVICES: PrimaryService[] = [
  'ANPR Cameras', 'Barrier Gates', 'Display Boards', 'Cabling', 'Power Systems', 'Software', 'Other',
]

const schema = z.object({
  vendorName:        z.string().min(2, 'Name required'),
  contactPerson:     z.string().min(2, 'Contact person required'),
  phone:             z.string().min(10, 'Valid phone required'),
  email:             z.string().email('Valid email required'),
  city:              z.string().min(1, 'City required'),
  state:             z.string().min(1, 'State required'),
  gstin:             z.string().min(15, 'Valid GSTIN required').max(15),
  registeredAddress: z.string().min(5, 'Address required'),
  primaryService:    z.enum(['ANPR Cameras','Barrier Gates','Display Boards','Cabling','Power Systems','Software','Other']),
  contractStartDate: z.string().min(1, 'Date required'),
  notes:             z.string().optional(),
  assignedSiteId:    z.string().optional(),
  password:          z.string().min(6, 'Min 6 characters').optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

// ─── Vendor Form ──────────────────────────────────────────────────────────────
const VendorForm = ({ initial, onSubmit, loading, onCancel }: {
  initial?: Partial<FormData & { assignedSiteId?: string }>
  onSubmit: (d: FormData) => void
  loading:  boolean
  onCancel?: () => void
}) => {
  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<FormData>({
    resolver:      zodResolver(schema),
    defaultValues: { primaryService: 'ANPR Cameras', assignedSiteId: '', password: '', ...initial },
  })

  const { data: siteList } = useQuery({
    queryKey: ['parking-site-list'],
    queryFn:  () => parkingApi.getParkingList().then((r) => r.data.data),
    staleTime: 60_000,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Vendor Name" error={errors.vendorName?.message} required>
          <Input {...register('vendorName')} placeholder="ABC Tech Solutions" />
        </FormField>
        <FormField label="Contact Person" error={errors.contactPerson?.message} required>
          <Input {...register('contactPerson')} placeholder="John Doe" />
        </FormField>
        <FormField label="Phone" error={errors.phone?.message} required>
          <Input {...register('phone')} placeholder="+91 98765 43210" />
        </FormField>
        <FormField label="Email" error={errors.email?.message} required>
          <Input type="email" {...register('email')} placeholder="vendor@example.com" />
        </FormField>
        <FormField label="City" error={errors.city?.message} required>
          <Input {...register('city')} placeholder="Bengaluru" />
        </FormField>
        <FormField label="State" error={errors.state?.message} required>
          <Input {...register('state')} placeholder="Karnataka" />
        </FormField>
        <FormField label="GSTIN" error={errors.gstin?.message} required>
          <Input {...register('gstin')} placeholder="22AAAAA0000A1Z5" className="font-mono uppercase" />
        </FormField>
        <FormField label="Primary Service" error={errors.primaryService?.message} required>
          <Controller name="primaryService" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIMARY_SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )} />
        </FormField>
        <FormField label="Contract Start Date" error={errors.contractStartDate?.message} required>
          <Input type="date" {...register('contractStartDate')} />
        </FormField>
        <FormField label="Allocate Parking Site" error={errors.assignedSiteId?.message}>
          <Controller name="assignedSiteId" control={control} render={({ field }) => (
            <Select
              value={field.value || '__none__'}
              onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
            >
              <SelectTrigger><SelectValue placeholder="Select a parking site…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No allocation —</SelectItem>
                {(siteList ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.siteName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        </FormField>
        {/* Password — only shown when creating a new vendor */}
        {!initial && (
          <FormField label="Login Password" error={errors.password?.message}
            className="col-span-2"
          >
            <Input
              type="password"
              {...register('password')}
              placeholder="Min 6 characters — vendor uses email + this password to log in"
            />
          </FormField>
        )}
        {/* Change password when editing */}
        {initial && (
          <FormField label="Change Password (optional)" error={errors.password?.message}
            className="col-span-2"
          >
            <Input
              type="password"
              {...register('password')}
              placeholder="Leave blank to keep current password"
            />
          </FormField>
        )}
      </div>
      <FormField label="Registered Address" error={errors.registeredAddress?.message} required>
        <Textarea {...register('registeredAddress')} rows={2} placeholder="Full registered address" />
      </FormField>
      <FormField label="Notes">
        <Textarea {...register('notes')} rows={2} placeholder="Any additional notes…" />
      </FormField>
      <div className="flex gap-2 justify-end pt-1">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>}
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : initial ? 'Update Vendor' : 'Create Vendor'}</Button>
      </div>
    </form>
  )
}

// ─── Vendor Detail Panel ──────────────────────────────────────────────────────
const VendorDetailPanel = ({ vendorId, onClose }: { vendorId: string; onClose: () => void }) => {
  const { data, isLoading } = useVendorDetail(vendorId)
  const updateMut = useUpdateVendor()
  const [editing, setEditing] = useState(false)

  const toDateInput = (s?: string) => s ? s.slice(0, 10) : ''

  const editInitial = data ? {
    vendorName:        data.vendorName,
    contactPerson:     data.contactPerson,
    phone:             data.phone,
    email:             data.email,
    city:              data.city,
    state:             data.state,
    gstin:             data.gstin,
    registeredAddress: data.registeredAddress,
    primaryService:    data.primaryService,
    contractStartDate: toDateInput(data.contractStartDate),
    notes:             data.notes ?? '',
    assignedSiteId:    data.assignedSiteId ?? '',
  } : undefined

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[480px] bg-white shadow-2xl border-l border-gray-200 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{editing ? 'Edit Vendor' : 'Vendor Detail'}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg" />)}
          </div>
        ) : data ? (
          editing ? (
            <VendorForm
              key={data.updatedAt ?? vendorId}
              initial={editInitial}
              loading={updateMut.isPending}
              onCancel={() => setEditing(false)}
              onSubmit={(d) => updateMut.mutate({ id: data.id, data: d as CreateVendorDto }, { onSuccess: () => setEditing(false) })}
            />
          ) : (
          <div className="space-y-5">
            {/* Identity */}
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{data.vendorName}</h3>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${data.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {data.status}
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2"><Building className="h-4 w-4 text-gray-400" /> {data.primaryService}</div>
                <div className="flex items-center gap-2"><Phone   className="h-4 w-4 text-gray-400" /> {data.phone}</div>
                <div className="flex items-center gap-2"><Mail    className="h-4 w-4 text-gray-400" /> {data.email}</div>
                <div className="flex items-center gap-2"><MapPin  className="h-4 w-4 text-gray-400" /> {data.city}, {data.state}</div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /> Contract since {formatDate(data.contractStartDate)}</div>
              </div>
            </div>

            <hr />

            {/* Business Info */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Business Info</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">GSTIN</span>
                  <span className="font-mono text-gray-700">{data.gstin}</span>
                </div>
                <div className="text-gray-500">Address</div>
                <div className="text-gray-700 text-xs bg-gray-50 rounded p-2">{data.registeredAddress}</div>
              </div>
            </div>

            <hr />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{data.itemsCount}</p>
                <p className="text-xs text-amber-600 mt-0.5">Inventory Items</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{data.contractsCount}</p>
                <p className="text-xs text-blue-600 mt-0.5">Contracts</p>
              </div>
            </div>

            {/* Allocated Parking Site */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Allocated Parking Site</h4>
              {data.assignedSiteName ? (
                <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium inline-block">
                  {data.assignedSiteName}
                </span>
              ) : (
                <span className="text-xs text-gray-400">No site allocated</span>
              )}
            </div>

            {/* Documents */}
            {data.contractDocuments?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Documents</h4>
                <div className="space-y-1.5">
                  {data.contractDocuments.map(doc => (
                    <a key={doc.url} href={doc.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-brand hover:underline">
                      <FileText className="h-4 w-4" /> {doc.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {data.notes && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">{data.notes}</p>
              </div>
            )}
          </div>
          )
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">Failed to load vendor details.</p>
        )}
      </div>
    </div>
  )
}

// ─── Vendor List Tab ──────────────────────────────────────────────────────────
const VendorListTab = () => {
  const [search, setSearch]      = useState('')
  const { page, setPage, limit } = usePagination()
  const q = useDebounce(search)
  const { data, isLoading } = useVendors({ page, limit, search: q || undefined })
  const deleteMut           = useDeleteVendor()

  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const columns: Column<Vendor>[] = [
    {
      header: 'Vendor', accessor: (r) => (
        <button className="text-left hover:text-brand transition-colors" onClick={() => setDetailId(r.id)}>
          <p className="font-medium text-gray-800 text-sm">{r.vendorName}</p>
          <p className="text-xs text-gray-400">{r.contactPerson}</p>
        </button>
      ),
    },
    { header: 'Phone',  accessor: (r) => <span className="text-sm">{r.phone}</span> },
    { header: 'Email',  accessor: 'email', className: 'text-gray-500 text-sm' },
    { header: 'City',   accessor: (r) => <span className="text-sm">{r.city}, {r.state}</span> },
    { header: 'Items',          accessor: (r) => <span className="flex items-center gap-1 text-sm"><Boxes className="h-3.5 w-3.5 text-gray-400" />{r.itemsCount}</span> },
    { header: 'Allocated Site', accessor: (r) => r.assignedSiteName
        ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{r.assignedSiteName}</span>
        : <span className="text-xs text-gray-400">—</span> },
    { header: 'Status', accessor: (r) => <StatusBadge status={r.status} /> },
    { header: 'Joined', accessor: (r) => <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span> },
    {
      header: 'Actions', accessor: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setDetailId(r.id)}>View</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteId(r.id)}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search vendors…" className="w-full sm:w-72" />
      </div>

      <DataTable
        columns={columns} data={data?.data ?? []} loading={isLoading}
        keyExtractor={(r) => r.id}
        pagination={data?.meta ? { ...data.meta, totalPages: data.meta.totalPages } : undefined}
        onPageChange={setPage}
      />

      {detailId && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setDetailId(null)} />
          <VendorDetailPanel vendorId={detailId} onClose={() => setDetailId(null)} />
        </>
      )}

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Vendor"
        message="This will remove the vendor and unlink all associated inventory."
        onConfirm={() => deleteMut.mutate(deleteId!, { onSuccess: () => setDeleteId(null) })}
        loading={deleteMut.isPending}
      />
    </>
  )
}

// ─── Add Vendor Tab ───────────────────────────────────────────────────────────
const AddVendorTab = () => {
  const createMut = useCreateVendor()
  const [key, setKey] = useState(0)
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-3xl">
      <h2 className="text-base font-semibold text-gray-800 mb-5">New Vendor</h2>
      <VendorForm
        key={key}
        loading={createMut.isPending}
        onSubmit={(d) => createMut.mutate(d as CreateVendorDto, { onSuccess: () => setKey(k => k + 1) })}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const VendorManagementPage = () => (
  <div>
    <PageHeader title="Vendor Management" subtitle="Manage service vendors, contracts and assignments" />
    <Tabs defaultValue="list">
      <TabsList className="mb-5">
        <TabsTrigger value="list">Vendor List</TabsTrigger>
        <TabsTrigger value="add">Add Vendor</TabsTrigger>
      </TabsList>
      <TabsContent value="list"><VendorListTab /></TabsContent>
      <TabsContent value="add"><AddVendorTab /></TabsContent>
    </Tabs>
  </div>
)

export default VendorManagementPage
