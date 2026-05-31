import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Clock, Menu } from 'lucide-react'
import { format } from 'date-fns'

const TITLES: Record<string, string> = {
  '/dashboard':          'Dashboard',
  '/parking-users':      'Parking Users',
  '/parking-sessions':   'Parking Sessions',
  '/parking-management': 'Parking Management',
  '/inventory':          'Inventory',
  '/vendor-management':  'Vendor Management',
  '/portal-users':       'Portal Users',
  '/vehicle-requests':   'Vehicle Requests',
  '/visitors':           'Visitors',
}

interface TopbarProps { onMenuClick: () => void }

export const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { pathname } = useLocation()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const title = TITLES[pathname] ?? 'Admin Portal'

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger — visible on mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="font-semibold text-gray-800 text-sm sm:text-base truncate">{title}</h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Clock — hidden on small screens */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="hidden md:inline">{format(now, 'EEE, dd MMM yyyy  HH:mm')}</span>
          <span className="md:hidden">{format(now, 'HH:mm')}</span>
        </div>
        <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
