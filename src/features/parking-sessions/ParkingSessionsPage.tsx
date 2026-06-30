import { useState, useEffect, useCallback } from 'react'
import { useQueryClient, useIsFetching } from '@tanstack/react-query'
import { LogIn, LogOut, Clock, Car, Search, RefreshCw, User, AlertTriangle, CheckCircle2, Download, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader }  from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useSessions, useActiveSessions, useRecordEntry, useRecordExit, useLookupByPlate, useDeleteSession } from './hooks/useParkingSessions'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDateTime, resolveImageUrl } from '@/lib/utils'
import { exportParkingSessionsZip, fetchAllSessions } from '@/lib/exportParkingSessions'
import * as parkingApi from '@/api/parking.api'
import * as parkingSessionsApi from '@/api/parking-sessions.api'
import type { ParkingSession } from '@/types'

const isSessionIn = (s: ParkingSession) => s.status === 'IN' || s.status === 'active'

const SessionInOutBadge = ({ session }: { session: ParkingSession }) =>
  isSessionIn(session) ? (
    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">IN</span>
  ) : (
    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">OUT</span>
  )

const EntryImagesCell = ({ session }: { session: ParkingSession }) => {
  const [preview, setPreview] = useState<{ url: string; label: string } | null>(null)
  const plateUrl = resolveImageUrl(session.entryPlateImageUrl)
  const carUrl   = resolveImageUrl(session.entryCarImageUrl)
  if (!plateUrl && !carUrl) return <span className="text-xs text-gray-400">—</span>

  const thumb = (url: string | null, label: string) => url ? (
    <button
      type="button"
      onClick={() => setPreview({ url, label })}
      className="group block text-left"
      title={`View ${label}`}
    >
      <img
        src={url}
        alt={label}
        referrerPolicy="no-referrer"
        loading="lazy"
        className="h-10 w-14 rounded border border-gray-200 object-cover cursor-pointer group-hover:ring-2 group-hover:ring-brand/40"
      />
      <span className="text-[10px] text-gray-400 block text-center mt-0.5">{label}</span>
    </button>
  ) : (
    <div className="text-center">
      <div className="h-10 w-14 rounded border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] text-gray-300">—</div>
      <span className="text-[10px] text-gray-400 block mt-0.5">{label}</span>
    </div>
  )

  return (
    <>
      <div className="flex items-start gap-2">
        {thumb(plateUrl, 'Plate')}
        {thumb(carUrl, 'Car')}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent size="xl" className="p-0 overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Entry {preview?.label} — {session.numberPlate}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 flex justify-center bg-gray-50">
            {preview && (
              <img
                src={preview.url}
                alt={preview.label}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[75vh] rounded-lg object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Delete session ───────────────────────────────────────────────────────────
const DeleteSessionButton = ({ session }: { session: ParkingSession }) => {
  const [open, setOpen] = useState(false)
  const deleteMut = useDeleteSession()

  const handleDelete = () => {
    deleteMut.mutate(session.id, {
      onSuccess: () => setOpen(false),
    })
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs px-2 text-red-600 border-red-200 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3 w-3 mr-1" /> Delete
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete parking session?</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 space-y-3 text-sm">
            <p className="text-gray-600">
              This will permanently remove the session for{' '}
              <span className="font-mono font-bold uppercase text-gray-900">{session.numberPlate}</span>.
            </p>
            <p className="text-xs text-gray-400">
              Entry: {formatDateTime(session.entryTime)}
              {isSessionIn(session)
                ? ' · Active session — site occupancy will be updated.'
                : ''}
            </p>
          </div>
          <DialogFooter className="px-6 pb-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={deleteMut.isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMut.isPending}
              onClick={handleDelete}
            >
              {deleteMut.isPending ? 'Deleting…' : 'Delete session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Entry modal ──────────────────────────────────────────────────────────────
const EntryModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [plate, setPlate]   = useState('')
  const [siteId, setSiteId] = useState('')
  const [siteErr, setSiteErr] = useState(false)
  const debouncedPlate      = useDebounce(plate.trim().toUpperCase(), 400)
  const entryMut            = useRecordEntry()
  const { data: lookup, isFetching: lookingUp } = useLookupByPlate(debouncedPlate)

  const { data: siteList } = useQuery({
    queryKey: ['parking-site-list'],
    queryFn:  () => parkingApi.getParkingList().then(r => r.data.data),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (siteList?.length === 1 && !siteId) {
      setSiteId(siteList[0].id)
    }
  }, [siteList, siteId])

  const hasSites = (siteList?.length ?? 0) > 0

  const handleEntry = () => {
    if (!plate.trim() || lookup?.isAlreadyParked) return
    if (hasSites && !siteId) { setSiteErr(true); return }
    setSiteErr(false)
    entryMut.mutate(
      { numberPlate: plate.trim().toUpperCase(), siteId: siteId || undefined },
      { onSuccess: () => { setPlate(''); setSiteId(''); setSiteErr(false); onClose() } }
    )
  }

  const handleClose = () => { setPlate(''); setSiteId(''); setSiteErr(false); onClose() }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Record Vehicle Entry</DialogTitle></DialogHeader>
        <div className="px-6 py-4 space-y-4">

          {/* Plate input */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Number Plate *</label>
            <Input
              placeholder="KA01AB1234"
              className="uppercase font-mono text-xl tracking-widest text-center h-12"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleEntry()}
              autoFocus
            />
          </div>

          {/* Site selector */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Parking Site {hasSites ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(optional)</span>}
            </label>
            <Select value={siteId || '__none__'} onValueChange={v => { setSiteId(v === '__none__' ? '' : v); setSiteErr(false) }}>
              <SelectTrigger className={`h-9 text-sm ${siteErr ? 'border-red-400 ring-1 ring-red-400' : ''}`}>
                <SelectValue placeholder="Select a site…" />
              </SelectTrigger>
              <SelectContent>
                {!hasSites && <SelectItem value="__none__">— No sites configured —</SelectItem>}
                {(siteList ?? []).map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.siteName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {siteErr && <p className="text-xs text-red-500 mt-1">Please select a parking site</p>}
          </div>

          {/* Lookup result card */}
          {debouncedPlate.length >= 3 && (
            <div>
              {lookingUp ? (
                <div className="flex items-center gap-2 rounded-lg border border-gray-100 p-3 text-sm text-gray-400 animate-pulse">
                  <Search className="h-4 w-4" /> Looking up vehicle…
                </div>
              ) : lookup ? (
                <>
                  {/* Already parked warning */}
                  {lookup.isAlreadyParked && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-red-700">Already Parked</p>
                        <p className="text-xs text-red-500 mt-0.5">This vehicle has an active session. Record an exit first.</p>
                      </div>
                    </div>
                  )}

                  {/* Registered vehicle with user */}
                  {!lookup.isAlreadyParked && lookup.registered && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Registered Vehicle
                      </div>
                      {lookup.user && (
                        <div className="flex items-start gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-green-200 text-green-800 flex items-center justify-center text-sm font-bold shrink-0">
                            {lookup.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{lookup.user.name}</p>
                            <p className="text-xs text-gray-500">{lookup.user.phone}</p>
                            {lookup.user.email && <p className="text-xs text-gray-400">{lookup.user.email}</p>}
                          </div>
                        </div>
                      )}
                      {lookup.vehicle && (
                        <div className="flex items-center gap-2 pt-1 border-t border-green-200">
                          <Car className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          <span className="text-xs text-green-800 font-medium">
                            {lookup.vehicle.vehicleName}
                            {lookup.vehicle.vehicleModel ? ` · ${lookup.vehicle.vehicleModel}` : ''}
                            {lookup.vehicle.vehicleType === 'two_wheeler' ? ' · 🏍️' : ' · 🚗'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Unregistered / guest vehicle */}
                  {!lookup.isAlreadyParked && !lookup.registered && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <User className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Guest / Unregistered Vehicle</p>
                        <p className="text-xs text-gray-400 mt-0.5">No app user linked to this plate.</p>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

        </div>
        <DialogFooter className="px-6 pb-4 gap-2">
          <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={entryMut.isPending || !plate.trim() || !!lookup?.isAlreadyParked}
            onClick={handleEntry}
          >
            <LogIn className="h-3.5 w-3.5 mr-1.5" />
            {entryMut.isPending ? 'Recording…' : 'Record Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Exit modal ───────────────────────────────────────────────────────────────
const ExitModal = ({ open, onClose, session }: { open: boolean; onClose: () => void; session?: ParkingSession }) => {
  const [plate, setPlate] = useState('')
  const exitMut = useRecordExit()

  const handleExit = () => {
    const payload = session ? { sessionId: session.id } : { numberPlate: plate.trim().toUpperCase() }
    exitMut.mutate(payload, { onSuccess: () => { setPlate(''); onClose() } })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Vehicle Exit</DialogTitle></DialogHeader>
        <div className="px-6 py-4 space-y-4">
          {session ? (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm font-mono font-bold text-blue-700">{session.numberPlate}</p>
              <p className="text-xs text-blue-500 mt-0.5">Entry: {formatDateTime(session.entryTime)}</p>
              {session.userName && <p className="text-xs text-blue-500">User: {session.userName}</p>}
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Number Plate *</label>
              <Input
                placeholder="KA01AB1234"
                className="uppercase font-mono text-lg tracking-widest"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleExit()}
                autoFocus
              />
            </div>
          )}
          <p className="text-xs text-gray-400">Duration will be calculated automatically.</p>
        </div>
        <DialogFooter className="px-6 pb-4 gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={exitMut.isPending || (!session && !plate.trim())}
            onClick={handleExit}
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Record Exit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Active sessions table ────────────────────────────────────────────────────
const ActiveSessionsTable = () => {
  const { data, isLoading, refetch, isFetching } = useActiveSessions()
  const [exitSession, setExitSession] = useState<ParkingSession | undefined>()
  const [exitOpen, setExitOpen]       = useState(false)

  const columns: Column<ParkingSession>[] = [
    {
      header: 'Vehicle',
      accessor: (r) => (
        <div>
          <p className="font-mono font-bold text-gray-800 uppercase">{r.numberPlate}</p>
          {r.vehicleName && <p className="text-xs text-gray-400">{r.vehicleName}</p>}
        </div>
      ),
    },
    {
      header: 'User',
      accessor: (r) => r.userName ? (
        <div>
          <p className="text-sm text-gray-700">{r.userName}</p>
          <p className="text-xs text-gray-400">{r.userPhone}</p>
        </div>
      ) : <span className="text-xs text-gray-400">Unregistered</span>,
    },
    {
      header: 'Entry Time',
      accessor: (r) => <span className="text-xs text-gray-600">{formatDateTime(r.entryTime)}</span>,
    },
    {
      header: 'Entry Images',
      accessor: (r) => <EntryImagesCell session={r} />,
    },
    {
      header: 'Duration (so far)',
      accessor: (r) => (
        <span className="text-xs font-mono bg-orange-50 text-orange-700 px-2 py-0.5 rounded">
          {r.durationFormatted ?? '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (r) => <SessionInOutBadge session={r} />,
    },
    {
      header: 'Action',
      accessor: (r) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => { setExitSession(r); setExitOpen(true) }}
          >
            <LogOut className="h-3 w-3 mr-1" /> Exit
          </Button>
          <DeleteSessionButton session={r} />
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-green-600">{data?.length ?? 0}</span> vehicles currently parked
        </p>
        <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>
      <DataTable columns={columns} data={data ?? []} loading={isLoading} keyExtractor={(r) => r.id} />
      <ExitModal open={exitOpen} onClose={() => { setExitOpen(false); setExitSession(undefined) }} session={exitSession} />
    </>
  )
}

// ─── All sessions table ───────────────────────────────────────────────────────
const AllSessionsTable = ({
  search,
  setSearch,
  status,
  setStatus,
}: {
  search: string
  setSearch: (v: string) => void
  status: string
  setStatus: (v: string) => void
}) => {
  const { data, isLoading, refetch, isFetching } = useSessions({
    numberPlate: search || undefined,
    status: status || undefined,
    limit: 50,
  })

  const columns: Column<ParkingSession>[] = [
    {
      header: 'Vehicle',
      accessor: (r) => (
        <div>
          <span className="font-mono font-bold text-xs bg-gray-100 px-2 py-0.5 rounded uppercase">{r.numberPlate}</span>
          {r.vehicleName && <p className="text-xs text-gray-400 mt-0.5">{r.vehicleName}</p>}
        </div>
      ),
    },
    {
      header: 'User',
      accessor: (r) => r.userName
        ? <div><p className="text-sm text-gray-700">{r.userName}</p><p className="text-xs text-gray-400">{r.userPhone}</p></div>
        : <span className="text-xs text-gray-400">—</span>,
    },
    {
      header: 'Entry',
      accessor: (r) => <span className="text-xs text-gray-600">{formatDateTime(r.entryTime)}</span>,
    },
    {
      header: 'Entry Images',
      accessor: (r) => <EntryImagesCell session={r} />,
    },
    {
      header: 'Exit',
      accessor: (r) => r.exitTime
        ? <span className="text-xs text-gray-600">{formatDateTime(r.exitTime)}</span>
        : <span className="text-xs text-orange-500 font-medium">Still parked</span>,
    },
    {
      header: 'Duration',
      accessor: (r) => (
        <span className="font-mono text-xs">{r.durationFormatted ?? '—'}</span>
      ),
    },
    {
      header: 'Status',
      accessor: (r) => <SessionInOutBadge session={r} />,
    },
    {
      header: 'Action',
      accessor: (r) => <DeleteSessionButton session={r} />,
    },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by plate…"
            className="pl-9 uppercase font-mono"
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
          />
        </div>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">IN</option>
          <option value="completed">OUT</option>
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto text-xs gap-1.5"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} keyExtractor={(r) => r.id} />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const ParkingSessionsPage = () => {
  const [entryOpen, setEntryOpen] = useState(false)
  const [exitOpen,  setExitOpen]  = useState(false)
  const [activeTab, setActiveTab] = useState('active')
  const [allSearch, setAllSearch] = useState('')
  const [allStatus, setAllStatus] = useState('')
  const [exporting, setExporting] = useState(false)
  const qc = useQueryClient()
  const isRefreshing = useIsFetching({ queryKey: ['parking-sessions'] }) > 0

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['parking-sessions'] })
  }

  const handleDownload = useCallback(async () => {
    setExporting(true)
    const toastId = toast.loading('Preparing export…')
    try {
      let sessions
      let label: string

      if (activeTab === 'active') {
        const res = await parkingSessionsApi.getActiveSessions()
        sessions = res.data.data
        label = 'active'
      } else {
        sessions = await fetchAllSessions({
          numberPlate: allSearch || undefined,
          status: allStatus || undefined,
        })
        label = allSearch ? `filtered-${allSearch}` : allStatus ? allStatus : 'all'
      }

      await exportParkingSessionsZip(sessions, label, (msg) => {
        toast.loading(msg, { id: toastId })
      })

      toast.success('Download started — ZIP contains Excel + images folder', { id: toastId })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Export failed'
      toast.error(message, { id: toastId })
    } finally {
      setExporting(false)
    }
  }, [activeTab, allSearch, allStatus])

  return (
    <div>
      <PageHeader
        title="Parking Sessions"
        subtitle="Track vehicle entry and exit times with duration"
        action={
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void handleDownload()}
              disabled={exporting || isRefreshing}
            >
              <Download className={`h-4 w-4 mr-1.5 ${exporting ? 'animate-pulse' : ''}`} />
              {exporting ? 'Exporting…' : 'Download Excel'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => setExitOpen(true)}
            >
              <LogOut className="h-4 w-4 mr-1.5" /> Record Exit
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setEntryOpen(true)}
            >
              <LogIn className="h-4 w-4 mr-1.5" /> Record Entry
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            <Car className="h-3.5 w-3.5 mr-1.5" /> Currently Parked
          </TabsTrigger>
          <TabsTrigger value="all">
            <Clock className="h-3.5 w-3.5 mr-1.5" /> All Sessions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active"><ActiveSessionsTable /></TabsContent>
        <TabsContent value="all">
          <AllSessionsTable
            search={allSearch}
            setSearch={setAllSearch}
            status={allStatus}
            setStatus={setAllStatus}
          />
        </TabsContent>
      </Tabs>

      <EntryModal open={entryOpen} onClose={() => setEntryOpen(false)} />
      <ExitModal  open={exitOpen}  onClose={() => setExitOpen(false)} />
    </div>
  )
}

export default ParkingSessionsPage
