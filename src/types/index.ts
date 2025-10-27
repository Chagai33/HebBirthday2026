export type Gender = 'male' | 'female' | 'other';

export type UserRole = 'owner' | 'admin' | 'member';

export type GroupType = 'family' | 'friends' | 'work' | 'other' | 'custom';

export type WishlistPriority = 'high' | 'medium' | 'low';

export interface Tenant {
  id: string;
  name: string;
  owner_id: string;
  default_language?: 'he' | 'en';
  timezone?: string;
  created_at: string;
  updated_at: string;
}

export interface UserTenantMembership {
  id: string;
  user_id: string;
  tenant_id: string;
  role: UserRole;
  joined_at: string;
}

export interface AppUser {
  id: string;
  email?: string;
  phone_number?: string;
  display_name?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  tenant_id: string;
  name: string;
  type: GroupType;
  color: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface Birthday {
  id: string;
  tenant_id: string;
  group_id?: string;
  first_name: string;
  last_name: string;
  birth_date_gregorian: string;
  after_sunset?: boolean;
  gender?: Gender;
  birth_date_hebrew_string?: string;
  next_upcoming_hebrew_birthday?: string;
  future_hebrew_birthdays?: string[];
  notes?: string;
  archived: boolean;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface WishlistItem {
  id: string;
  birthday_id: string;
  tenant_id: string;
  item_name: string;
  description?: string;
  priority: WishlistPriority;
  created_at: string;
  updated_at: string;
}

export interface BirthdayFormData {
  firstName: string;
  lastName: string;
  birthDateGregorian: Date;
  afterSunset?: boolean;
  gender?: Gender;
  groupId?: string;
  notes?: string;
}

export interface HebcalResponse {
  hebrew: string;
  events?: Array<{
    date: string;
    hebrew: string;
  }>;
}

export interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: any) => void;
}

export interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<AppUser>) => Promise<void>;
}

export interface TenantContextType {
  currentTenant: Tenant | null;
  userTenants: Tenant[];
  loading: boolean;
  switchTenant: (tenantId: string) => void;
  createTenant: (name: string) => Promise<string>;
  updateTenant: (tenantId: string, data: Partial<Tenant>) => Promise<void>;
  inviteUserToTenant: (email: string, role: UserRole) => Promise<void>;
}

export interface DashboardStats {
  totalBirthdays: number;
  upcomingThisMonth: number;
  upcomingThisWeek: number;
  maleCount: number;
  femaleCount: number;
  groupCounts?: Record<string, number>;
}

export interface BirthdayFilter {
  searchTerm?: string;
  groupIds?: string[];
  gender?: Gender;
  sortBy?: 'name' | 'date' | 'upcoming';
}
