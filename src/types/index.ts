import { Timestamp } from 'firebase/firestore';

export type Gender = 'male' | 'female' | 'other';

export type UserRole = 'owner' | 'admin' | 'member';

export interface Tenant {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  settings?: {
    defaultLanguage?: 'he' | 'en';
    timezone?: string;
  };
}

export interface UserTenantMembership {
  userId: string;
  tenantId: string;
  role: UserRole;
  joinedAt: Timestamp;
}

export interface AppUser {
  id: string;
  email?: string;
  phoneNumber?: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tenants: string[];
  linkedProviders: string[];
}

export interface Birthday {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  birthDateGregorian: Timestamp;
  afterSunset?: boolean;
  gender?: Gender;
  birthDateHebrewString?: string;
  nextUpcomingHebrewBirthdayGregorian?: Timestamp;
  futureHebrewBirthdaysGregorian?: Timestamp[];
  notes?: string;
  archived: boolean;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface BirthdayFormData {
  firstName: string;
  lastName: string;
  birthDateGregorian: Date;
  afterSunset?: boolean;
  gender?: Gender;
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
  firebaseUser: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithPhone: (phoneNumber: string, appVerifier: any) => Promise<any>;
  confirmPhoneSignIn: (verificationId: string, code: string) => Promise<void>;
  linkEmailPassword: (email: string, password: string) => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  linkPhoneNumber: (phoneNumber: string, appVerifier: any) => Promise<any>;
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
}
