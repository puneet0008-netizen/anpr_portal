import { NavLink } from 'react-router-dom'
import {
  Car, Users, ParkingSquare, Package, Building2, UserCog, LogOut,
  ClipboardList, UserCheck, CarFront,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useVehicleRequests } from '@/features/vehicle-requests/hooks/useVehicleRequests'
import { cn } from '@/lib/utils'

const MAIN_NAV = [
  { to: '/parking-users',      label: 'Parking Users',      icon: Users },
  { to: '/parking-sessions',   label: 'Parking Sessions',   icon: CarFront },
  { to: '/parking-management', label: 'Parking Management', icon: ParkingSquare },
  { to: '/inventory',          label: 'Inventory',          icon: Package },
  { to: '/vendor-management',  label: 'Vendor Management',  icon: Building2 },
  { to: '/portal-users',       label: 'Portal Users',       icon: UserCog },
]

const NavItem = ({ to, label, icon: Icon, badge, onClose }: {
  to: string; label: string; icon: React.ElementType; badge?: number; onClose: () => void
}) => (
  <NavLink
    to={to}
    onClick={onClose}
    className={({ isActive }) =>
      cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors font-medium',
        isActive
          ? 'bg-brand text-white'
          : 'text-white/60 hover:bg-white/8 hover:text-white'
      )
    }
  >
    <Icon className="h-4 w-4 flex-shrink-0" />
    <span className="flex-1 truncate">{label}</span>
    {!!badge && (
      <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
        {badge}
      </span>
    )}
  </NavLink>
)

interface SidebarProps { open: boolean; onClose: () => void }

export const Sidebar = ({ open, onClose }: SidebarProps) => {
  const { user, logout } = useAuthStore()
  const { data: pending } = useVehicleRequests({ status: 'pending', limit: 50 })
  const pendingCount = pending?.data?.length ?? 0

  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white flex flex-col h-full transition-transform duration-300 ease-in-out',
      'lg:static lg:translate-x-0 lg:w-60 lg:flex-shrink-0',
      open ? 'translate-x-0' : '-translate-x-full',
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center flex-shrink-0">
          <Car className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">ANPR Parking</p>
          <p className="text-[10px] text-white/50 leading-tight">Admin Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {MAIN_NAV.map((item) => <NavItem key={item.to} {...item} onClose={onClose} />)}

        {/* Divider — App Management */}
        <div className="pt-4 pb-1 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
            App Management
          </p>
        </div>

        <NavItem
          to="/vehicle-requests"
          label="Vehicle Requests"
          icon={ClipboardList}
          badge={pendingCount > 0 ? pendingCount : undefined}
          onClose={onClose}
        />
        <NavItem to="/visitors" label="Visitors" icon={UserCheck} onClose={onClose} />
      </nav>

      {/* User */}
      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-brand/40 flex items-center justify-center text-xs font-bold uppercase flex-shrink-0">
            {user?.username?.[0] ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.username ?? 'Admin'}</p>
            <p className="text-[10px] text-white/40 capitalize">{user?.role}</p>
          </div>
          <button onClick={logout} className="text-white/40 hover:text-white p-1 rounded transition-colors" title="Logout">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
