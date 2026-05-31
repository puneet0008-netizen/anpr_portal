import { useState } from 'react'
import { CheckCircle, XCircle, Clock, Filter } from 'lucide-react'
import { PageHeader }  from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useVehicleRequests, useReviewRequest } from './hooks/useVehicleRequests'
import { formatDate } from '@/lib/utils'
import type { VehicleRequest, RequestStatus } from '@/types'

// ─── Request type label ───────────────────────────────────────────────────────
const reqTypeLabel = (t: string) => {
  if (t === 'plate_change')   return '🔢 Plate Change'
  if (t === 'slot_swap')      return '🔄 Slot Swap'
  if (t === 'remove_vehicle') return '🗑️ Remove Vehicle'
  return t
}

// ─── Review modal ─────────────────────────────────────────────────────────────
const ReviewModal = ({
  request, onClose,
}: { request: VehicleRequest | null; onClose: () => void }) => {
  const [note, setNote]   = useState('')
  const reviewMut = useReviewRequest()

  const handleAction = (status: 'approved' | 'rejected') => {
    if (!request) return
    reviewMut.mutate(
      { id: request.id, body: { status, adminNote: note || undefined } },
      { onSuccess: () => { setNote(''); onClose() } }
    )
  }

  if (!request) return null

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Request</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-400 mb-0.5">User</p><p className="font-medium">{request.user_name ?? '—'}</p></div>
            <div><p className="text-xs text-gray-400 mb-0.5">Phone</p><p className="font-medium">{request.user_phone ?? '—'}</p></div>
            <div><p className="text-xs text-gray-400 mb-0.5">Request Type</p><p className="font-medium">{reqTypeLabel(request.request_type)}</p></div>
            <div><p className="text-xs text-gray-400 mb-0.5">Vehicle</p><p className="font-mono font-medium uppercase">{request.number_plate ?? '—'}</p></div>
            <div><p className="text-xs text-gray-400 mb-0.5">Current Value</p><p className="font-mono">{request.current_value}</p></div>
            <div><p className="text-xs text-gray-400 mb-0.5">Requested Value</p><p className="font-mono text-brand">{request.requested_value}</p></div>
            {request.reason && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">Reason</p>
                <p className="text-gray-700 bg-gray-50 rounded p-2 text-xs">{request.reason}</p>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Admin Note (optional)</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/20"
              rows={3}
              placeholder="Add a note for the user…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="px-6 pb-4 gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm" variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            disabled={reviewMut.isPending}
            onClick={() => handleAction('rejected')}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
          </Button>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={reviewMut.isPending}
            onClick={() => handleAction('approved')}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Requests table ───────────────────────────────────────────────────────────
const RequestsTable = ({ status }: { status?: RequestStatus }) => {
  const { data, isLoading } = useVehicleRequests({ status, limit: 50 })
  const [reviewing, setReviewing] = useState<VehicleRequest | null>(null)

  const columns: Column<VehicleRequest>[] = [
    { header: 'User',    accessor: (r) => <span className="font-medium text-gray-800">{r.user_name ?? '—'}</span> },
    { header: 'Phone',   accessor: (r) => <span className="text-gray-500 text-xs">{r.user_phone ?? '—'}</span> },
    { header: 'Vehicle', accessor: (r) => <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded uppercase">{r.number_plate ?? r.current_value}</span> },
    { header: 'Type',    accessor: (r) => <span className="text-xs">{reqTypeLabel(r.request_type)}</span> },
    {
      header: 'Change',
      accessor: (r) => (
        <div className="text-xs">
          <span className="text-gray-400 line-through mr-1">{r.current_value}</span>
          <span className="text-brand font-medium">→ {r.requested_value}</span>
        </div>
      ),
    },
    { header: 'Status',  accessor: (r) => <StatusBadge status={r.status} /> },
    { header: 'Date',    accessor: (r) => <span className="text-gray-400 text-xs">{formatDate(r.created_at)}</span> },
    {
      header: 'Action',
      accessor: (r) => r.status === 'pending' ? (
        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setReviewing(r)}>
          Review
        </Button>
      ) : (
        <span className="text-xs text-gray-400">{r.admin_note ? `Note: ${r.admin_note.slice(0, 20)}…` : '—'}</span>
      ),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        keyExtractor={(r) => r.id}
      />
      <ReviewModal request={reviewing} onClose={() => setReviewing(null)} />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const VehicleRequestsPage = () => {
  const { data: pending } = useVehicleRequests({ status: 'pending', limit: 1 })
  const pendingCount = pending?.meta?.total ?? 0

  return (
    <div>
      <PageHeader
        title="Vehicle Requests"
        subtitle="Review plate changes, slot swaps, and removal requests from app users"
      />
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Pending
            {pendingCount > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Approved
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <XCircle className="h-3.5 w-3.5 mr-1.5" /> Rejected
          </TabsTrigger>
          <TabsTrigger value="all">
            <Filter className="h-3.5 w-3.5 mr-1.5" /> All
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending">  <RequestsTable status="pending" /> </TabsContent>
        <TabsContent value="approved"> <RequestsTable status="approved" /></TabsContent>
        <TabsContent value="rejected"> <RequestsTable status="rejected" /></TabsContent>
        <TabsContent value="all">      <RequestsTable /></TabsContent>
      </Tabs>
    </div>
  )
}

export default VehicleRequestsPage
