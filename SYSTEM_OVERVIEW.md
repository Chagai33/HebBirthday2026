# Hebrew Birthday Management System - Technical Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth UI    │  │  Dashboard   │  │  Birthday    │      │
│  │   (Login,    │  │  (Stats,     │  │  Management  │      │
│  │   Register)  │  │   List)      │  │  (CRUD)      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                   │             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         React Query (State Management)                │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                  │                   │             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Firebase SDK (Client Library)                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ HTTPS
                             │
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Backend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Auth      │  │   Firestore  │  │   Functions  │      │
│  │  (Email,     │  │  (NoSQL DB)  │  │  (Serverless)│      │
│  │   Google,    │  │              │  │              │      │
│  │   Phone)     │  │   + Rules    │  │   + Hebcal   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ HTTPS
                             │
                    ┌────────────────┐
                    │   Hebcal API   │
                    │  (Hebrew Dates)│
                    └────────────────┘
```

## Data Flow

### Creating a Birthday

```
1. User fills form → BirthdayForm component
2. Validation (React Hook Form)
3. Duplicate check (Client-side query)
4. Modal verifications (Sunset, Gender)
5. Submit → birthdayService.createBirthday()
6. Write to Firestore (with minimal data)
7. Firestore Trigger → onBirthdayWrite Function
8. Function calls Hebcal API
9. Function updates document with Hebrew dates
10. Client receives update via React Query
11. UI updates automatically
```

### Authentication Flow

```
User Login (Email) → Firebase Auth → Create/Update User Document
                                   → Load User Tenants
                                   → Set Current Tenant
                                   → Redirect to Dashboard

User Login (Google) → Firebase Auth → Link if email exists
                                   → Create new if not exists
                                   → Update linkedProviders
                                   → Continue as above
```

## Security Model

### Firestore Rules Hierarchy

```
users
  └─ {userId}
       ├─ Read: Own data only
       ├─ Write: Own data only
       └─ Delete: Disabled

tenants
  └─ {tenantId}
       ├─ Read: Members only
       ├─ Write: Owner only
       └─ Delete: Owner only

userTenantMemberships
  └─ {userId}_{tenantId}
       ├─ Read: User or tenant members
       ├─ Write: Admin/Owner
       └─ Delete: Admin/Owner or self

birthdays
  └─ {birthdayId}
       ├─ Read: Tenant members
       ├─ Create: Tenant members
       ├─ Update: Tenant members
       └─ Delete: Tenant admins
```

### Role-Based Access Control

```
Owner
  └─ Can do everything
       ├─ Manage tenant settings
       ├─ Invite/remove members
       ├─ Delete tenant
       └─ All admin + member permissions

Admin
  └─ Manage content and members
       ├─ Add/edit/delete birthdays
       ├─ Invite members
       └─ All member permissions

Member
  └─ Basic operations
       ├─ View all birthdays
       ├─ Add birthdays
       └─ Edit own created birthdays
```

## Database Schema

### users Collection
```typescript
{
  id: string;                    // Document ID = Auth UID
  email?: string;
  phoneNumber?: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tenants: string[];             // Array of tenant IDs
  linkedProviders: string[];     // ['password', 'google.com', 'phone']
}
```

### tenants Collection
```typescript
{
  id: string;                    // Auto-generated
  name: string;
  ownerId: string;               // Reference to users
  createdAt: Timestamp;
  updatedAt: Timestamp;
  settings: {
    defaultLanguage: 'he' | 'en';
    timezone: string;
  };
}
```

### userTenantMemberships Collection
```typescript
{
  id: string;                    // Format: {userId}_{tenantId}
  userId: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Timestamp;
}
```

### birthdays Collection
```typescript
{
  id: string;                                      // Auto-generated
  tenantId: string;                                // Required for multi-tenancy
  firstName: string;
  lastName: string;
  birthDateGregorian: Timestamp;                   // Original birth date
  afterSunset?: boolean;                           // Hebrew day adjustment
  gender?: 'male' | 'female' | 'other';
  birthDateHebrewString?: string;                  // "י״ח באדר תש״ן"
  nextUpcomingHebrewBirthdayGregorian?: Timestamp; // Next occurrence
  futureHebrewBirthdaysGregorian?: Timestamp[];    // Next 10 years
  notes?: string;
  archived: boolean;
  createdAt: Timestamp;
  createdBy: string;                               // User ID
  updatedAt: Timestamp;
  updatedBy: string;                               // User ID
}
```

## Cloud Functions

### onBirthdayWrite (Firestore Trigger)
```
Trigger: onCreate, onUpdate of /birthdays/{id}
Purpose: Calculate Hebrew dates
Flow:
  1. Check if Hebrew data already exists
  2. If not, fetch from Hebcal API
  3. Calculate next 10 years of birthdays
  4. Update document with calculated data
Hebcal API:
  - Convert: /converter?cfg=json&gy=YYYY&gm=MM&gd=DD&g2h=1
  - After sunset: Add &gs=on parameter
```

### updateNextBirthdayScheduled (Scheduled)
```
Trigger: Daily at midnight (Asia/Jerusalem)
Purpose: Update upcoming birthdays
Flow:
  1. Query birthdays where nextUpcoming < now
  2. For each, shift to next date from future array
  3. If array empty, recalculate from Hebcal
  4. Batch update all documents
Optimization:
  - Batch writes (max 500 per batch)
  - Only process archived=false
  - Error handling per document
```

## Frontend Architecture

### Context Providers

```
App
 └─ QueryClientProvider (React Query)
     └─ AuthProvider (Authentication State)
         └─ TenantProvider (Multi-Tenant State)
             └─ Router
                 └─ Routes
```

### State Management Strategy

1. **Server State** (React Query)
   - Birthdays list
   - User tenants
   - Birthday details
   - Automatic caching
   - Background refetching

2. **Global State** (React Context)
   - Current user
   - Current tenant
   - Authentication status
   - Loading states

3. **Local State** (useState)
   - Form inputs
   - Modal visibility
   - UI toggles
   - Search/filter values

### Component Organization

```
components/
├── auth/
│   ├── Login.tsx              # Email/Google login
│   ├── Register.tsx           # User registration
│   └── (PhoneAuth.tsx)        # TODO: Phone auth UI
├── birthdays/
│   ├── BirthdayForm.tsx       # Create/Edit form
│   ├── BirthdayList.tsx       # Table with actions
│   └── BirthdayCard.tsx       # (Optional) Card view
├── common/
│   ├── ProtectedRoute.tsx     # Auth guard
│   └── (Loading.tsx)          # Reusable loading
├── layout/
│   ├── Layout.tsx             # Page wrapper
│   └── Header.tsx             # Nav with tenant switcher
├── modals/
│   ├── DuplicateVerificationModal.tsx
│   ├── SunsetVerificationModal.tsx
│   └── GenderVerificationModal.tsx
└── Dashboard.tsx              # Main page
```

## API Integration

### Hebcal API Usage

**Endpoint:** `https://www.hebcal.com/converter`

**Parameters:**
- `cfg=json` - JSON output
- `gy`, `gm`, `gd` - Gregorian date
- `g2h=1` - Convert Gregorian to Hebrew
- `gs=on` - After sunset
- `lg=s` - Sephardic transliteration

**Response:**
```json
{
  "gy": 1990,
  "gm": 3,
  "gd": 15,
  "afterSunset": false,
  "hebrew": "י״ח באדר תש״ן",
  "hd": 18,
  "hm": "Adar",
  "hy": 5750
}
```

**Rate Limits:**
- No official limit
- Implement 1 second delay between requests
- Cache results in Firestore

### Google Calendar API

**Scope:** `https://www.googleapis.com/auth/calendar.events`

**Authentication:**
- OAuth 2.0 with popup consent
- Token managed by Google Identity Services
- Refresh handled automatically

**Event Creation:**
```javascript
POST /calendar/v3/calendars/primary/events
{
  "summary": "🎂 Name - Hebrew Date",
  "start": { "date": "2026-03-15" },
  "end": { "date": "2026-03-15" },
  "reminders": {
    "useDefault": false,
    "overrides": [
      { "method": "popup", "minutes": 1440 },
      { "method": "popup", "minutes": 60 }
    ]
  }
}
```

## Performance Considerations

### Database Queries

**Optimized:**
```typescript
// Good: Uses composite index
birthdays
  .where('tenantId', '==', tenantId)
  .where('archived', '==', false)
  .orderBy('nextUpcomingHebrewBirthdayGregorian')
```

**Avoid:**
```typescript
// Bad: Fetches all then filters client-side
const all = await birthdays.where('tenantId', '==', id).get();
const filtered = all.filter(b => !b.archived);
```

### React Query Configuration

```typescript
{
  staleTime: 5 * 60 * 1000,    // 5 minutes
  cacheTime: 10 * 60 * 1000,   // 10 minutes
  refetchOnWindowFocus: false,
  retry: 1
}
```

### Bundle Size

- **Current:** ~900KB (minified)
- **Main culprits:**
  - Firebase SDK (~400KB)
  - React + ReactDOM (~140KB)
  - Other dependencies (~360KB)

**Future optimizations:**
- Code splitting by route
- Lazy load modals
- Dynamic imports for rare features

## Internationalization

### Language Files Structure

```json
{
  "common": { "save": "..." },
  "auth": { "signIn": "..." },
  "tenant": { "createTenant": "..." },
  "birthday": { "addBirthday": "..." },
  "dashboard": { "statistics": "..." },
  "modals": { ... },
  "validation": { ... },
  "messages": { ... }
}
```

### RTL Support

**Tailwind utilities:**
- `start` / `end` instead of `left` / `right`
- Automatic margin/padding flip
- Text alignment adjusts

**Layout changes:**
```typescript
document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
```

## Error Handling

### Levels

1. **Client-side Validation**
   - React Hook Form
   - Immediate feedback
   - Before submission

2. **Service Layer**
   - Try-catch blocks
   - Firebase errors
   - Network errors

3. **UI Feedback**
   - Toast notifications
   - Error boundaries
   - Graceful degradation

4. **Logging**
   - Console errors (dev)
   - Cloud Functions logs
   - Future: Sentry integration

## Testing Strategy

### Unit Tests (TODO)
```bash
npm test
```
- Components
- Utilities
- Hooks

### Integration Tests (TODO)
- Firebase emulator
- Full user flows
- Multi-tenant isolation

### E2E Tests (TODO)
```bash
npm run e2e
```
- Critical paths
- Authentication
- CRUD operations

## Deployment Pipeline

### Development
```bash
npm run dev                    # Local development
VITE_USE_FIREBASE_EMULATOR=true npm run dev  # With emulators
```

### Staging (TODO)
```bash
firebase use staging
firebase deploy
```

### Production
```bash
firebase use hebbirthday2026
npm run build
firebase deploy --only hosting,functions,firestore
```

## Monitoring & Logging

### Available Logs

```bash
# Cloud Functions
firebase functions:log

# Firestore
Firebase Console → Firestore → Usage tab

# Authentication
Firebase Console → Authentication → Activity
```

### Key Metrics to Monitor

1. **Function executions**
   - onBirthdayWrite invocations
   - updateNextBirthdayScheduled runtime
   - Error rate

2. **Database operations**
   - Read/write counts
   - Query performance
   - Index usage

3. **Authentication**
   - Sign-up rate
   - Login success/failure
   - Provider distribution

4. **Application**
   - Page load time
   - Bundle size
   - API response times

## Security Checklist

- [x] Firestore Rules deployed
- [x] Authentication required for all data
- [x] Multi-tenant isolation enforced
- [x] Role-based access control
- [x] Input validation (client + server)
- [x] No API keys in client code
- [x] HTTPS only
- [ ] OAuth credentials configured
- [ ] Production domains whitelisted
- [ ] Rate limiting (Firebase default)
- [ ] Audit logging (via Firestore timestamps)

## Known Limitations

1. **Hebrew Calendar:**
   - Depends on Hebcal API availability
   - No offline calculation
   - Limited to 10 years ahead

2. **Account Linking:**
   - Email-based automatic linking only
   - Phone requires manual linking
   - No unlinking UI (yet)

3. **Scalability:**
   - Firestore limits: 1 write/second per document
   - Cloud Functions: 1000 concurrent invocations
   - Query results: Max 10,000 documents

4. **Internationalization:**
   - Only Hebrew and English
   - No language auto-detection
   - Date formats are manual

## Future Improvements

See [FEATURES_TODO.md](./FEATURES_TODO.md) for detailed roadmap.

**High Priority:**
- Phone auth UI
- Tenant invitations
- User profile page
- Birthday reminders

**Medium Priority:**
- Import/Export
- Advanced analytics
- Email notifications
- Dark mode

**Low Priority:**
- Mobile app
- Social features
- Advanced search
- Custom themes

---

**Document Version:** 1.0
**Last Updated:** 2025-01-26
**System Version:** 2.0.0
