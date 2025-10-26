# Future Features & Enhancements

## High Priority

### 1. Tenant Invitation System
**Status:** Backend ready, Frontend needed

**Implementation:**
- Create `TenantInvitation` component
- Email invitation form (in tenant settings)
- Invitation acceptance flow
- Notification system for pending invitations

**Files to create:**
- `src/components/tenant/TenantSettings.tsx`
- `src/components/tenant/InvitationList.tsx`
- `src/components/tenant/AcceptInvitation.tsx`

### 2. Phone Authentication UI
**Status:** Backend ready, Frontend stub only

**Implementation:**
- Phone number input with country code selector
- SMS verification code input
- Link phone to existing account flow
- reCAPTCHA integration

**Files to create:**
- `src/components/auth/PhoneAuth.tsx`
- `src/components/auth/VerifyPhone.tsx`

### 3. User Profile Management
**Status:** Backend ready, Frontend needed

**Implementation:**
- Edit profile (name, photo)
- View linked providers
- Link additional accounts
- Change language preference

**Files to create:**
- `src/components/profile/UserProfile.tsx`
- `src/components/profile/LinkAccounts.tsx`

### 4. Advanced Birthday Filtering
**Current:** Basic search and sort
**Needed:**
- Filter by month
- Filter by gender
- Filter by age range
- Filter by upcoming (days range)

### 5. Bulk Operations
**Current:** Delete one by one
**Needed:**
- Bulk delete
- Bulk archive
- Bulk export to calendar
- Import from CSV

## Medium Priority

### 6. Birthday Reminders
**Implementation:**
- Email notifications (via Cloud Functions)
- In-app notifications
- Customizable reminder settings (1 day, 1 week, etc.)
- WhatsApp integration (using Twilio)

**New Cloud Functions needed:**
- `sendBirthdayReminders` (scheduled daily)
- `sendEmailNotification`

### 7. Statistics & Analytics
**Extend Dashboard with:**
- Birthday distribution by month
- Age distribution
- Most common Hebrew dates
- Charts using recharts or similar

### 8. Export & Import
- Export to CSV/Excel
- Import from CSV with validation
- Export to iCal format
- Backup entire tenant data

### 9. Tenant Management
- Rename tenant
- Transfer ownership
- Member role management
- Leave tenant option
- Delete tenant (owner only)

### 10. Birthday Cards/Greetings
- Generate printable birthday cards
- Customize with Hebrew text
- Email greeting cards
- WhatsApp greeting templates

## Low Priority

### 11. Dark Mode
- Theme toggle
- Persist preference
- Update Tailwind config

### 12. Advanced Search
- Full-text search
- Search by Hebrew date
- Search by notes
- Recent searches

### 13. Mobile App
- React Native version
- Push notifications
- Offline support
- Camera integration for profile photos

### 14. Social Features
- Share birthday lists (read-only links)
- Public tenant pages
- Birthday wishes/comments

### 15. Calendar View
- Month view of birthdays
- Hebrew calendar overlay
- Sync with device calendar
- Print monthly calendar

## Technical Improvements

### 16. Performance
- Implement virtual scrolling for large lists
- Add pagination
- Optimize Firestore queries
- Add service worker for PWA

### 17. Testing
- Unit tests with Vitest
- Integration tests
- E2E tests with Playwright
- Firebase emulator tests

### 18. CI/CD
- GitHub Actions for deployment
- Automated testing
- Staging environment
- Rollback capability

### 19. Monitoring
- Error tracking (Sentry)
- Analytics (Google Analytics)
- Performance monitoring
- User behavior tracking

### 20. Accessibility
- ARIA labels
- Keyboard navigation
- Screen reader support
- High contrast mode

## Implementation Notes

### Adding a New Feature: Example Flow

**Example: Implementing Tenant Settings**

1. **Create the component:**
```typescript
// src/components/tenant/TenantSettings.tsx
import React from 'react';
import { useTenant } from '../../contexts/TenantContext';

export const TenantSettings: React.FC = () => {
  const { currentTenant, updateTenant } = useTenant();

  // Implementation here

  return (
    <div>
      {/* Settings UI */}
    </div>
  );
};
```

2. **Add route:**
```typescript
// In App.tsx
<Route path="/settings" element={
  <ProtectedRoute>
    <TenantSettings />
  </ProtectedRoute>
} />
```

3. **Add navigation:**
```typescript
// In Header.tsx
<Link to="/settings">
  {t('common.settings')}
</Link>
```

4. **Add translations:**
```json
// In en.json and he.json
{
  "settings": {
    "title": "Settings",
    "tenantName": "Tenant Name",
    ...
  }
}
```

5. **Add Firestore Rules (if needed):**
```
// In firestore.rules
match /tenants/{tenantId} {
  allow update: if isTenantOwner(tenantId);
}
```

### Testing New Features

1. **Unit tests:**
```typescript
// src/components/__tests__/TenantSettings.test.tsx
import { render, screen } from '@testing-library/react';
import { TenantSettings } from '../tenant/TenantSettings';

describe('TenantSettings', () => {
  it('renders settings form', () => {
    render(<TenantSettings />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
```

2. **Integration with Firebase Emulator:**
```bash
firebase emulators:start
```

Set `VITE_USE_FIREBASE_EMULATOR=true` in `.env`

## Priority Matrix

**Must Have (for v2.0):**
- ✅ Multi-tenant architecture
- ✅ Hebrew date calculation
- ✅ Authentication
- ✅ Google Calendar export
- 🔲 Tenant invitations
- 🔲 Phone auth UI

**Should Have (for v2.1):**
- Birthday reminders
- Profile management
- Advanced filtering
- Bulk operations

**Nice to Have (for v3.0):**
- Statistics
- Import/Export
- Birthday cards
- Dark mode

**Future (v4.0+):**
- Mobile app
- Social features
- Advanced calendar
- Analytics

## Contributing Guidelines

When implementing new features:

1. **Follow existing patterns:**
   - Use TypeScript with strict types
   - Functional components with hooks
   - Context for global state
   - React Query for server state

2. **Code organization:**
   - Components in logical folders
   - Services for Firebase operations
   - Hooks for reusable logic
   - Types in dedicated file

3. **Internationalization:**
   - All UI text through i18next
   - Support both Hebrew and English
   - Test RTL layout

4. **Security:**
   - Update Firestore rules
   - Never expose secrets
   - Validate all inputs
   - Follow least privilege principle

5. **Performance:**
   - Optimize queries
   - Use React Query caching
   - Lazy load components
   - Minimize re-renders

---

**Last Updated:** 2025-01-26
**Current Version:** 2.0.0
**Next Release:** 2.1.0 (planned)
