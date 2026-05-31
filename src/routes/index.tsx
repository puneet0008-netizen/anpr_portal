import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminLayout }          from '@/layouts/AdminLayout'
import LoginPage                from '@/features/auth/LoginPage'
import ParkingUsersPage         from '@/features/parking-users/ParkingUsersPage'
import ParkingManagementPage    from '@/features/parking-management/ParkingManagementPage'
import InventoryPage            from '@/features/inventory/InventoryPage'
import VendorManagementPage     from '@/features/vendor-management/VendorManagementPage'
import PortalUsersPage          from '@/features/portal-users/PortalUsersPage'
import VehicleRequestsPage      from '@/features/vehicle-requests/VehicleRequestsPage'
import VisitorsPage             from '@/features/visitors/VisitorsPage'
import ParkingSessionsPage      from '@/features/parking-sessions/ParkingSessionsPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      { index: true,                     element: <Navigate to="/parking-users" replace /> },
      { path: 'parking-users',           element: <ParkingUsersPage /> },
      { path: 'parking-sessions',        element: <ParkingSessionsPage /> },
      { path: 'parking-management',      element: <ParkingManagementPage /> },
      { path: 'inventory',               element: <InventoryPage /> },
      { path: 'vendor-management',       element: <VendorManagementPage /> },
      { path: 'portal-users',            element: <PortalUsersPage /> },
      // ── App management ──────────────────────────────────────────────────────
      { path: 'vehicle-requests',        element: <VehicleRequestsPage /> },
      { path: 'visitors',                element: <VisitorsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
