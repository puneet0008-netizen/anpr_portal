import { useState } from 'react'
import { Plus, ShieldCheck, KeyRound } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader }   from '@/components/shared/PageHeader'
import { StatusBadge }  from '@/components/shared/StatusBadge'
import { SearchInput }  from '@/components/shared/SearchInput'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { FormField }    from '@/components/shared/FormField'
import { usePortalUsers, useCreatePortalUser, useUpdatePortalUser, useDeletePortalUser, useTogglePortalUser } from './hooks/usePortalUsers'
import { useDebounce }   from '@/hooks/useDebounce'
import { usePagination } from '@/hooks/usePagination'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { PortalUser, CreatePortalUserDto, PortalRole, AccessLevel } from '@/types'

// ─── Schema ───────────────────────────────────────────────────────────────────
const ROLES:    PortalRole[]   = ['Manager', 'Operator', 'Finance', 'Super Admin']
const LEVELS:   AccessLevel[]  = ['Read Only', 'Read+Write', 'Full Access', 'Finance Module']

const createSchema = z.object({
  name:        z.string().min(2, 'Name required'),
  email:       z.string().email('Valid email required'),
  role:        z.enum(['Manager', 'Operator', 'Finance', 'Super Admin']),
  accessLevel: z.enum(['Read Only', 'Read+Write', 'Full Access', 'Finance Module']),
  tempPassword: z.string().min(8, 'At least 8 characters'),
})

const editSchema = z.object({
  name:        z.string().min(2, 'Name required'),
  email:       z.string().email('Valid email required'),
  role:        z.enum(['Manager', 'Operator', 'Finance', 'Super Admin']),
  accessLevel: z.enum(['Read Only', 'Read+Write', 'Full Access', 'Finance Module']),
  password:    z.string().min(8, 'At least 8 characters').optional().or(z.literal('')),
})

type CreateFormData = z.infer<typeof createSchema>
type EditFormData   = z.infer<typeof editSchema>

// ─── Role Badge ───────────────────────────────────────────────────────────────
const RoleBadge = ({ role }: { role: PortalRole }) => {
  const map: Record<PortalRole, string> = {
    'Super Admin': 'bg-purple-50 text-purple-700',
    'Manager':     'bg-blue-50 text-blue-700',
    'Finance':     'bg-green-50 text-green-700',
    'Operator':    'bg-gray-100 text-gray-700',
  }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[role]}`}>{role}</span>
}

// ─── Access Badge ─────────────────────────────────────────────────────────────
const AccessBadge = ({ level }: { level: AccessLevel }) => (
  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
    <KeyRound className="h-3 w-3" /> {level}
  </span>
)

// ─── Create Modal ─────────────────────────────────────────────────────────────
const CreateModal = ({ open, onClose, loading, onSubmit }: {
  open: boolean; onClose: () => void; loading: boolean
  onSubmit: (d: CreateFormData) => void
}) => {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'Operator', accessLevel: 'Read Only' },
  })
  const handleClose = () => { reset(); onClose() }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-brand-600" /> New Portal User</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 pt-4 pb-6">
          <FormField label="Full Name" error={errors.name?.message} required>
            <Input {...register('name')} placeholder="Jane Smith" />
          </FormField>
          <FormField label="Email" error={errors.email?.message} required>
            <Input type="email" {...register('email')} placeholder="jane@company.com" />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Role" error={errors.role?.message} required>
              <Controller name="role" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField label="Access Level" error={errors.accessLevel?.message} required>
              <Controller name="accessLevel" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </FormField>
          </div>
          <FormField label="Temporary Password" error={errors.tempPassword?.message} required>
            <Input type="password" {...register('tempPassword')} placeholder="Min 8 characters" />
          </FormField>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create User'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
const EditModal = ({ open, onClose, user, loading, onSubmit }: {
  open: boolean; onClose: () => void; user: PortalUser | null; loading: boolean
  onSubmit: (d: EditFormData) => void
}) => {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    values: user ? { name: user.name, email: user.email, role: user.role, accessLevel: user.accessLevel, password: '' } : undefined,
  })
  const handleClose = () => { reset(); onClose() }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Portal User</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 pt-4 pb-6">
          <FormField label="Full Name" error={errors.name?.message} required>
            <Input {...register('name')} />
          </FormField>
          <FormField label="Email" error={errors.email?.message} required>
            <Input type="email" {...register('email')} />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Role" error={errors.role?.message} required>
              <Controller name="role" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField label="Access Level" error={errors.accessLevel?.message} required>
              <Controller name="accessLevel" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </FormField>
          </div>
          <FormField label="New Password (leave blank to keep current)" error={errors.password?.message}>
            <Input type="password" {...register('password')} placeholder="Min 8 characters" />
          </FormField>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────
const ToggleSwitch = ({ id, status }: { id: string; status: 'active' | 'inactive' }) => {
  const toggleMut = useTogglePortalUser()
  const active = status === 'active'
  return (
    <button
      onClick={() => toggleMut.mutate({ id, status: active ? 'inactive' : 'active' })}
      disabled={toggleMut.isPending}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${active ? 'bg-green-500' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${active ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const PortalUsersPage = () => {
  const [search, setSearch]      = useState('')
  const { page, setPage, limit } = usePagination()
  const q = useDebounce(search)
  const { data, isLoading } = usePortalUsers({ page, limit, search: q || undefined })

  const createMut = useCreatePortalUser()
  const updateMut = useUpdatePortalUser()
  const deleteMut = useDeletePortalUser()

  const [addOpen,   setAddOpen]   = useState(false)
  const [editUser,  setEditUser]  = useState<PortalUser | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)

  const columns: Column<PortalUser>[] = [
    { header: 'Name',       accessor: (r) => (
        <div>
          <p className="font-medium text-gray-800 text-sm">{r.name}</p>
          <p className="text-xs text-gray-400">{r.email}</p>
        </div>
      )
    },
    { header: 'Role',       accessor: (r) => <RoleBadge role={r.role} /> },
    { header: 'Access',     accessor: (r) => <AccessBadge level={r.accessLevel} /> },
    { header: 'Status',     accessor: (r) => <ToggleSwitch id={r.id} status={r.status} /> },
    { header: 'Last Login', accessor: (r) => <span className="text-xs text-gray-400">{r.lastLogin ? formatDateTime(r.lastLogin) : '—'}</span> },
    { header: 'Created',    accessor: (r) => <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span> },
    {
      header: 'Actions', accessor: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setEditUser(r)}>Edit</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteId(r.id)}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Portal User Management" subtitle="Manage admin portal access, roles and permissions">
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add User</Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search portal users…" className="w-full sm:w-72" />
      </div>

      <DataTable
        columns={columns} data={data?.data ?? []} loading={isLoading}
        keyExtractor={(r) => r.id}
        pagination={data?.meta ? { ...data.meta, totalPages: data.meta.totalPages } : undefined}
        onPageChange={setPage}
      />

      <CreateModal open={addOpen} onClose={() => setAddOpen(false)} loading={createMut.isPending}
        onSubmit={(d) => createMut.mutate(d as CreatePortalUserDto, { onSuccess: () => setAddOpen(false) })}
      />
      <EditModal open={!!editUser} onClose={() => setEditUser(null)} user={editUser} loading={updateMut.isPending}
        onSubmit={(d) => {
          const payload = { name: d.name, email: d.email, role: d.role, accessLevel: d.accessLevel, ...(d.password ? { password: d.password } : {}) }
          updateMut.mutate({ id: editUser!.id, data: payload }, { onSuccess: () => setEditUser(null) })
        }}
      />
      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Portal User"
        message="This will revoke access immediately."
        onConfirm={() => deleteMut.mutate(deleteId!, { onSuccess: () => setDeleteId(null) })}
        loading={deleteMut.isPending}
      />
    </div>
  )
}

export default PortalUsersPage
