export type Gender = 'male' | 'female' | 'other';

export type UserRole = 'owner' | 'admin' | 'member';

export type GroupType = 'family' | 'friends' | 'work';

export type WishlistPriority = 'high' | 'medium' | 'low';

export type CalendarPreference = 'gregorian' | 'hebrew' | 'both';

export interface Tenant {
  id: string;
  name: string;
  owner_id: string;
  default_language?: 'he' | 'en';
  timezone?: string;
  default_calendar_preference?: CalendarPreference;
  current_hebrew_year?: number;
  hebrew_year_last_updated?: string;
  sharedCalendarId?: string | null;
  sharedCalendarName?: string | null;
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
  personal_calendar_view?: CalendarPreference;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  tenant_id: string;
  name: string;
  parent_id: string | null;
  is_root: boolean;
  type?: GroupType;
  color: string;
  calendar_preference?: CalendarPreference;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface HebrewBirthdayDate {
  gregorian: string;
  hebrewYear: number;
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
  next_upcoming_hebrew_year?: number;
  future_hebrew_birthdays?: (string | HebrewBirthdayDate)[];
  gregorian_year?: number;
  gregorian_month?: number;
  gregorian_day?: number;
  hebrew_year?: number;
  hebrew_month?: string;
  hebrew_day?: number;
  calendar_preference_override?: CalendarPreference | null;
  notes?: string;
  archived: boolean;
  googleCalendarEventId?: string | null;
  lastSyncedAt?: string | null;
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
  birthDateGregorian: Date | string;
  afterSunset?: boolean;
  gender?: Gender;
  groupId: string;
  calendarPreferenceOverride?: CalendarPreference | null;
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
  gender?: Gender | 'all';
  sortBy?: 'upcoming' | 'upcoming-latest' | 'name-az' | 'name-za' | 'birthday-oldest' | 'birthday-newest' | 'age-youngest' | 'age-oldest';
}

export interface BirthdayCalculations {
  currentGregorianAge: number;
  currentHebrewAge: number;
  nextGregorianBirthday: Date;
  ageAtNextGregorianBirthday: number;
  nextHebrewBirthday: Date | null;
  ageAtNextHebrewBirthday: number;
  daysUntilGregorianBirthday: number;
  daysUntilHebrewBirthday: number | null;
  nextBirthdayType: 'gregorian' | 'hebrew' | 'same';
}

export interface EnrichedBirthday extends Birthday {
  calculations: BirthdayCalculations;
  effectivePreference: CalendarPreference;
}

export interface CSVBirthdayRow {
  firstName: string;
  lastName: string;
  birthDate: string;
  afterSunset: boolean;
  gender?: Gender;
  groupId?: string;
  notes?: string;
  calendarPreference?: CalendarPreference;
  validationErrors?: string[];
  warnings?: string[];
  isDuplicate?: boolean;
}

export interface ValidationResult {
  index: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
}

export interface GoogleCalendarToken {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleCalendarSyncStatus {
  isConnected: boolean;
  lastSyncTime: string | null;
  syncedBirthdaysCount: number;
}

export interface SyncResult {
  success: boolean;
  eventId?: string;
  error?: string;
  birthdayId: string;
}

export interface BulkSyncResult {
  totalAttempted: number;
  successCount: number;
  failureCount: number;
  results: SyncResult[];
}

export interface GoogleCalendarContextType {
  isConnected: boolean;
  lastSyncTime: Date | null;
  isSyncing: boolean;
  connectToGoogle: () => Promise<void>;
  exchangeAuthCode: (code: string) => Promise<void>;
  syncSingleBirthday: (birthdayId: string) => Promise<SyncResult>;
  syncMultipleBirthdays: (birthdayIds: string[]) => Promise<BulkSyncResult>;
  removeBirthdayFromCalendar: (birthdayId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}
