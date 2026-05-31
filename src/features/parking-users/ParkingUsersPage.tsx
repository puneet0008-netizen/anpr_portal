import { useState } from 'react'
import { Plus, Wallet, Eye, Pencil } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader }   from '@/components/shared/PageHeader'
import { StatusBadge }  from '@/components/shared/StatusBadge'
import { SearchInput }  from '@/components/shared/SearchInput'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { UserModal }    from './components/UserModal'
import { RechargeModal } from './components/RechargeModal'
import { AppUserDetailDrawer } from './components/AppUserDetailDrawer'
import { WebUserDetailDrawer } from './components/WebUserDetailDrawer'
import {
  useWebUsers, useAppUsers, useCreateWebUser, useCreateAppUser,
  useDeleteWebUser, useDeleteAppUser, useRechargeUser,
} from './hooks/useParkingUsers'
import { useDebounce }   from '@/hooks/useDebounce'
import { usePagination } from '@/hooks/usePagination'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { WebUser, AppUser, AppUserDetail } from '@/types'

// ─── Avatar — falls back to cached detail if list doesn't have profilePhoto ───
const UserAvatar = ({ user }: { user: AppUser }) => {
  const qc = useQueryClient()
  // The detail cache is populated when user opens the 👁 drawer or edits
  const cached = qc.getQueryData<AppUserDetail>(['app-user-detail', user.id])
  const photo = user.profilePhoto ?? cached?.profilePhoto

  return (
    <div className="flex items-center gap-3">
      {photo ? (
        <img
          src={photo}
          alt={user.name}
          className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-gray-200"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      ) : (
        <div className="h-9 w-9 rounded-full bg-brand/10 text-brand flex items-center justify-center text-sm font-semibold shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div>
        <p className="font-medium text-gray-800 text-sm">{user.name}</p>
        <p className="text-xs text-gray-400">{user.email}</p>
      </div>
    </div>
  )
}

const Plate = ({ n }: { n: string }) => <span className="plate">{n}</span>

const Actions = ({
  onEdit, onDelete, extra,
}: { onEdit?: () => void; onDelete: () => void; extra?: React.ReactNode }) => (
  <div className="flex items-center gap-1">
    {extra}
    {onEdit && (
      <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100" onClick={onEdit} title="Edit">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    )}
    <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={onDelete}>
      Delete
    </Button>
  </div>
)

// ─── Web Users Tab ────────────────────────────────────────────────────────────
const WebUsersTab = () => {
  const [search, setSearch]      = useState('')
  const { page, setPage, limit } = usePagination()
  const q = useDebounce(search)
  const { data, isLoading } = useWebUsers({ page, limit, search: q || undefined })

  const createMut = useCreateWebUser()
  const deleteMut = useDeleteWebUser()

  const [addOpen,      setAddOpen]      = useState(false)
  const [detailUserId, setDetailUserId] = useState<string | null>(null)
  const [deleteId,     setDeleteId]     = useState<string | null>(null)

  // Always derive detailUser from live list data so updates reflect immediately
  const detailUser = detailUserId ? (data?.data.find(u => u.id === detailUserId) ?? null) : null

  const columns: Column<WebUser>[] = [
    { header: 'ID',      accessor: (r) => <span className="text-xs text-gray-400 font-mono">{r.id.slice(0, 8)}</span> },
    { header: 'Name',    accessor: 'name',  className: 'font-medium text-gray-800' },
    { header: 'Email',   accessor: 'email', className: 'text-gray-500 text-xs' },
    { header: 'Phone',   accessor: 'phone' },
    { header: 'Vehicle', accessor: (r) => <Plate n={r.vehicleNumber} /> },
    { header: 'Status',  accessor: (r) => <StatusBadge status={r.status} /> },
    { header: 'Joined',  accessor: (r) => <span className="text-gray-400 text-xs">{formatDate(r.joinedAt)}</span> },
    {
      header: 'Actions', accessor: (r) => (
        <Actions
          onDelete={() => setDeleteId(r.id)}
          extra={
            <Button variant="ghost" size="sm"
              className="h-7 text-xs px-2 text-brand hover:bg-brand/5"
              onClick={() => setDetailUserId(r.id)} title="View details">
              <Eye className="h-3.5 w-3.5" />
            </Button>
          }
        />
      ),
    },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone, vehicle…" className="w-full sm:w-72" />
        <Button size="sm" className="sm:ml-auto" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add Web User
        </Button>
      </div>

      <DataTable
        columns={columns} data={data?.data ?? []} loading={isLoading}
        keyExtractor={(r) => r.id}
        pagination={data?.meta ? { ...data.meta, totalPages: data.meta.totalPages } : undefined}
        onPageChange={setPage}
      />

      <WebUserDetailDrawer user={detailUser} onClose={() => setDetailUserId(null)} />

      <UserModal open={addOpen} onClose={() => setAddOpen(false)} title="Add Web User"
        loading={createMut.isPending}
        onSubmit={(d) => createMut.mutate(d as Parameters<typeof createMut.mutate>[0], { onSuccess: () => setAddOpen(false) })}
      />
      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Web User"
        message="This action cannot be undone."
        onConfirm={() => deleteMut.mutate(deleteId!, { onSuccess: () => setDeleteId(null) })}
        loading={deleteMut.isPending}
      />
    </>
  )
}

// ─── App Users Tab ────────────────────────────────────────────────────────────
const AppUsersTab = () => {
  const [search, setSearch]      = useState('')
  const { page, setPage, limit } = usePagination()
  const q = useDebounce(search)
  const { data, isLoading } = useAppUsers({ page, limit, search: q || undefined })

  const createMut   = useCreateAppUser()
  const deleteMut   = useDeleteAppUser()
  const rechargeMut = useRechargeUser()

  const [addOpen,      setAddOpen]      = useState(false)
  const [deleteId,     setDeleteId]     = useState<string | null>(null)
  const [rechargeUser, setRechargeUser] = useState<AppUser | null>(null)
  const [detailUser,   setDetailUser]   = useState<AppUser | null>(null)

  const columns: Column<AppUser>[] = [
    { header: 'User',    accessor: (r) => <UserAvatar user={r} /> },
    { header: 'Phone',   accessor: 'phone' },
    { header: 'Vehicle', accessor: (r) => <Plate n={r.vehicleNumber} /> },
    { header: 'Vendor',  accessor: (r) => r.vendorName
        ? <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-medium">{r.vendorName}</span>
        : <span className="text-xs text-gray-400">—</span>
    },
    {
      header: 'Wallet',
      accessor: (r) => (
        <span className="font-semibold text-green-700">{formatCurrency(r.walletBalance)}</span>
      ),
    },
    { header: 'Status',  accessor: (r) => <StatusBadge status={r.status} /> },
    { header: 'Joined',  accessor: (r) => <span className="text-gray-400 text-xs">{formatDate(r.joinedAt)}</span> },
    {
      header: 'Actions', accessor: (r) => (
        <Actions
          onDelete={() => setDeleteId(r.id)}
          extra={
            <>
              <Button
                variant="ghost" size="sm"
                className="h-7 text-xs px-2 text-brand hover:bg-brand/5"
                onClick={() => setDetailUser(r)}
                title="View details"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline" size="sm"
                className="h-7 text-xs px-2 text-green-700 border-green-200 hover:bg-green-50"
                onClick={() => setRechargeUser(r)}
              >
                <Wallet className="h-3 w-3 mr-1" /> Recharge
              </Button>
            </>
          }
        />
      ),
    },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone, vehicle…" className="w-full sm:w-72" />
        <Button size="sm" className="sm:ml-auto" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add App User
        </Button>
      </div>

      <DataTable
        columns={columns} data={data?.data ?? []} loading={isLoading}
        keyExtractor={(r) => r.id}
        pagination={data?.meta ? { ...data.meta, totalPages: data.meta.totalPages } : undefined}
        onPageChange={setPage}
      />

      {/* Detail drawer */}
      <AppUserDetailDrawer user={detailUser} onClose={() => setDetailUser(null)} />

      <UserModal open={addOpen} onClose={() => setAddOpen(false)} title="Add App User"
        loading={createMut.isPending} showVendorField={true}
        onSubmit={(d) => createMut.mutate(d as Parameters<typeof createMut.mutate>[0], { onSuccess: () => setAddOpen(false) })}
      />
      <RechargeModal
        open={!!rechargeUser} onClose={() => setRechargeUser(null)} user={rechargeUser ?? undefined}
        loading={rechargeMut.isPending}
        onSubmit={(d) => rechargeMut.mutate({ id: rechargeUser!.id, data: d }, { onSuccess: () => setRechargeUser(null) })}
      />
      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete App User"
        message="This action cannot be undone."
        onConfirm={() => deleteMut.mutate(deleteId!, { onSuccess: () => setDeleteId(null) })}
        loading={deleteMut.isPending}
      />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const ParkingUsersPage = () => (
  <div>
    <PageHeader title="Parking User Management" subtitle="Manage web portal and mobile app users" />
    <Tabs defaultValue="app">
      <TabsList>
        <TabsTrigger value="app">App Users</TabsTrigger>
        <TabsTrigger value="web">Web Users</TabsTrigger>
      </TabsList>
      <TabsContent value="app"><AppUsersTab /></TabsContent>
      <TabsContent value="web"><WebUsersTab /></TabsContent>
    </Tabs>
  </div>
)

export default ParkingUsersPage
