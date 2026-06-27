// ─── Generic ─────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  success: boolean
}

export interface ApiError {
  message: string
  errors?: { field: string; message: string }[]
  statusCode: number
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface SearchParams {
  search?: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string
  username: string
  role: 'admin' | 'vendor' | 'user'
}

export interface LoginPayload  { username: string; password: string }
export interface LoginResponse { accessToken: string; refreshToken: string; role: string; id: string; expiresIn: string }

// ─── Parking Users ────────────────────────────────────────────────────────────
export type UserStatus = 'active' | 'inactive' | 'suspended'

export interface WebUser {
  id: string
  name: string
  email: string
  phone: string
  vehicleNumber: string
  vendorId?: string
  vendorName?: string
  assignedSiteId?: string
  assignedSiteName?: string
  status: UserStatus
  joinedAt: string
  updatedAt: string
}

export interface AppUser extends WebUser {
  walletBalance: number
  totalRecharges: number
  lastRecharge?: string
  profilePhoto?: string
  allottedSlots?: number
}

export interface CreateUserDto {
  name: string
  email: string
  phone: string
  password: string
  vendorId?: string
  assignedSiteId?: string
  slotNumber?: string
  allottedSlots?: number
  profilePhoto?: string
  numberPlate?: string
  vehicleType?: 'two_wheeler' | 'four_wheeler'
  vehicleName?: string
  vehicleModel?: string
}
export type CreateWebUserDto = CreateUserDto
export type CreateAppUserDto = CreateUserDto

export interface RechargeDto {
  amount: number
  paymentMethod: 'Cash' | 'UPI' | 'Card'
  transactionRef: string
}

// ─── Parking Management ───────────────────────────────────────────────────────
export type ParkingType = 'Commercial' | 'Public' | 'Mall' | 'Residential'
export type ParkingStatus = 'active' | 'inactive' | 'maintenance'

export interface ParkingSite {
  id: string
  siteName: string
  location: string
  type: ParkingType
  totalCapacity: number
  occupied: number
  allottedSlots: number
  hourlyRate: number
  dailyRate: number
  monthlyRate: number
  status: ParkingStatus
  assignedVendorId?: string
  assignedVendorName?: string
  entryCameraIp: string
  exitCameraIp: string
  barrierControllerIp: string
  createdAt: string
}

export interface ParkingStats {
  totalSites: number
  totalCapacity: number
  currentlyOccupied: number
  activeSites: number
  totalAllottedSlots: number
}

export interface CreateParkingDto {
  siteName: string
  location: string
  totalCapacity: number
  type: ParkingType
  hourlyRate: number
  dailyRate: number
  monthlyRate: number
  entryCameraIp: string
  exitCameraIp: string
  barrierControllerIp: string
  assignedVendorId?: string
}

export interface ParkingRecharge {
  id: string
  userId: string
  userName: string
  vehicleNumber: string
  amount: number
  paymentMethod: string
  transactionRef: string
  createdAt: string
}

// ─── Inventory ────────────────────────────────────────────────────────────────
export type InventoryStatus = 'In Stock' | 'Low Stock' | 'Critical'

export interface InventoryItem {
  id: string
  itemName: string
  totalQty: number
  availableQty: number
  unit: string
  vendorId?: string
  vendorName?: string
  status: InventoryStatus
  createdAt: string
  updatedAt: string
}

export interface CreateInventoryItemDto {
  itemName: string
  totalQty: number
  availableQty: number
  unit: string
  vendorId?: string
}

// ─── Vendors ──────────────────────────────────────────────────────────────────
export type VendorStatus = 'active' | 'inactive'
export type PrimaryService =
  | 'ANPR Cameras'
  | 'Barrier Gates'
  | 'Display Boards'
  | 'Cabling'
  | 'Power Systems'
  | 'Software'
  | 'Other'

export interface Vendor {
  id: string
  vendorName: string
  contactPerson: string
  phone: string
  email: string
  city: string
  state: string
  itemsCount: number
  contractsCount: number
  status: VendorStatus
  lastOrderDate?: string
  assignedSiteId?: string
  assignedSiteName?: string
  createdAt: string
  updatedAt?: string
}

export interface VendorDetail extends Vendor {
  gstin: string
  registeredAddress: string
  primaryService: PrimaryService
  contractStartDate: string
  notes?: string
  assignedSiteId?: string
  assignedParkingSites: string[]
  cameraIds: string[]
  contractDocuments: { name: string; url: string }[]
}

export interface CreateVendorDto {
  vendorName: string
  contactPerson: string
  phone: string
  email: string
  city: string
  state: string
  gstin: string
  registeredAddress: string
  primaryService: PrimaryService
  contractStartDate: string
  notes?: string
  assignedSiteId?: string
  password?: string
}

// ─── Portal Users ─────────────────────────────────────────────────────────────
export type PortalRole = 'Manager' | 'Operator' | 'Finance' | 'Super Admin'
export type AccessLevel = 'Read Only' | 'Read+Write' | 'Full Access' | 'Finance Module'

export interface PortalUser {
  id: string
  name: string
  email: string
  role: PortalRole
  accessLevel: AccessLevel
  status: 'active' | 'inactive'
  lastLogin?: string
  createdAt: string
}

export interface CreatePortalUserDto {
  name: string
  email: string
  role: PortalRole
  accessLevel: AccessLevel
  tempPassword: string
}

export interface UpdatePortalUserDto extends Omit<CreatePortalUserDto, 'tempPassword'> {
  password?: string
  status?: 'active' | 'inactive'
}

// ─── App Vehicles ─────────────────────────────────────────────────────────────
export type VehicleType   = 'two_wheeler' | 'four_wheeler'
export type VehicleStatus = 'active' | 'inactive' | 'removed'

export interface AppVehicle {
  id: string
  userId: string
  numberPlate: string
  vehicleType: VehicleType
  vehicleName: string
  vehicleModel: string
  isPrimary: boolean
  status: VehicleStatus
  createdAt: string
}

// ─── Vehicle Requests ─────────────────────────────────────────────────────────
export type RequestType   = 'plate_change' | 'slot_swap' | 'remove_vehicle'
export type RequestStatus = 'pending' | 'approved' | 'rejected'

export interface VehicleRequest {
  id: string
  user_id: string
  vehicle_id: string
  request_type: RequestType
  current_value: string
  requested_value: string
  reason?: string
  status: RequestStatus
  admin_note?: string
  created_at: string
  updated_at: string
  // joined fields
  number_plate?: string
  vehicle_name?: string
  user_name?: string
  user_phone?: string
}

// ─── Visitors ─────────────────────────────────────────────────────────────────
export type VisitorStatus = 'pending' | 'checked_in' | 'checked_out' | 'expired' | 'cancelled'

export interface Visitor {
  id: string
  invited_by: string
  visitor_name: string
  visitor_phone: string
  visitor_car_number: string
  purpose: string
  visit_date: string
  visit_time: string
  duration_hours: number
  duration_minutes: number
  tracking_number: string
  status: VisitorStatus
  created_at: string
  // joined fields
  invited_by_name?: string
  invited_by_phone?: string
}

// ─── Parking Sessions ─────────────────────────────────────────────────────────
export type SessionStatus = 'active' | 'completed'

export interface ParkingSession {
  id: string
  userId?: string
  userName?: string
  userPhone?: string
  siteId?: string
  numberPlate: string
  vehicleName?: string
  vehicleModel?: string
  vehicleType?: string
  entryTime: string
  exitTime?: string
  durationMinutes?: number
  durationFormatted?: string
  fee: number
  status: SessionStatus
  entryPlateImageUrl?: string | null
  entryCarImageUrl?: string | null
  exitPlateImageUrl?: string | null
  exitCarImageUrl?: string | null
  createdAt: string
}

// ─── Parking Sessions Admin ───────────────────────────────────────────────────
export interface RecordEntryDto {
  numberPlate: string
  siteId?: string
  vehicleName?: string
  vehicleModel?: string
  vehicleType?: string
}

export interface RecordExitDto {
  numberPlate?: string
  sessionId?: string
}

export interface UserVehicleDto {
  numberPlate: string
  vehicleType: 'two_wheeler' | 'four_wheeler'
  vehicleName: string
  vehicleModel: string
}

// ─── App User Detail ──────────────────────────────────────────────────────────
export interface AppUserDetail extends AppUser {
  wallet: { balance: number; totalRecharges: number; lastRechargeAt?: string }
  vehicles: AppVehicle[]
  recentSessions: ParkingSession[]
  rechargeHistory: { id: string; amount: number; payment_method: string; transaction_ref: string; created_at: string }[]
  visitors: Visitor[]
}
