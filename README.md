# Hebrew Birthday Management System v2.0

A modern, multi-tenant web application for managing Hebrew and Gregorian birthdays with full internationalization support (Hebrew & English).

## Features

### Core Functionality
- ✅ **Multi-Tenant Architecture** - Manage multiple families/groups (tenants)
- ✅ **Hebrew Date Integration** - Automatic Hebrew date calculation via Hebcal API
- ✅ **Dual Authentication** - Email/Password, Google, and Phone authentication
- ✅ **Account Linking** - Seamlessly link multiple authentication methods
- ✅ **Internationalization** - Full RTL support for Hebrew and English
- ✅ **Google Calendar Export** - Export birthdays directly to Google Calendar
- ✅ **Smart Verification** - Duplicate detection, sunset time, and gender verification modals

### Technical Features
- 🔒 **Secure** - Firestore security rules with role-based access control
- 🚀 **Scalable** - Built for hundreds of users and thousands of records per tenant
- ⚡ **Fast** - React Query for optimized data fetching and caching
- 🎨 **Beautiful UI** - Tailwind CSS with responsive design
- 📱 **Mobile-Friendly** - Works seamlessly on all devices

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing fast development
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Hook Form** for form validation
- **TanStack Query** for server state management
- **i18next** for internationalization
- **date-fns** for date manipulation
- **Lucide React** for icons

### Backend
- **Firebase Authentication** - Email, Google, Phone
- **Cloud Firestore** - NoSQL database
- **Cloud Functions** - Serverless compute
- **Firebase Hosting** - Static site hosting

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── auth/              # Login, Register components
│   │   ├── birthdays/         # Birthday form, list, cards
│   │   ├── common/            # Reusable components
│   │   ├── layout/            # Layout, Header
│   │   └── modals/            # Verification modals
│   ├── contexts/              # React contexts (Auth, Tenant)
│   ├── hooks/                 # Custom React hooks
│   ├── services/              # Firebase services
│   ├── config/                # App configuration (Firebase, i18n)
│   ├── locales/               # Translation files (en, he)
│   ├── types/                 # TypeScript types
│   └── utils/                 # Utility functions
├── functions/                 # Cloud Functions
│   └── src/
│       └── index.ts           # Function definitions
├── firestore.rules            # Security rules
├── firestore.indexes.json     # Database indexes
└── firebase.json              # Firebase configuration
```

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase CLI
- Firebase project (hebbirthday2026)

### Installation

1. **Clone and install dependencies**
```bash
npm install
cd functions && npm install && cd ..
```

2. **Configure Firebase**
```bash
firebase login
firebase use hebbirthday2026
```

3. **Deploy Firestore configuration**
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

4. **Deploy Cloud Functions**
```bash
firebase deploy --only functions
```

5. **Start development server**
```bash
npm run dev
```

6. **Build for production**
```bash
npm run build
firebase deploy --only hosting
```

## Configuration

### Environment Variables
Create `.env` file:
```env
VITE_USE_FIREBASE_EMULATOR=false
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

### Firebase Configuration
The Firebase config is in `src/config/firebase.ts`. Your project credentials are already configured.

## Cloud Functions

### onBirthdayWrite
Triggered when a birthday is created or updated. Automatically:
- Calls Hebcal API to get Hebrew date
- Calculates next 10 years of Hebrew birthdays
- Updates birthday document with Hebrew dates

### updateNextBirthdayScheduled
Runs daily at midnight (Asia/Jerusalem timezone):
- Scans all birthdays
- Updates `nextUpcomingHebrewBirthdayGregorian` for past dates
- Ensures accurate upcoming birthday tracking

## Data Model

### Collections

#### users
- User profile information
- Linked authentication providers
- List of tenants user belongs to

#### tenants
- Tenant (family/group) information
- Owner ID and settings
- Created/updated timestamps

#### userTenantMemberships
- Links users to tenants
- Defines roles (owner, admin, member)
- Controls access permissions

#### birthdays
- Person's information (name, dates, gender)
- Hebrew date calculations
- Future birthday dates (10 years)
- Audit fields (created/updated by)

#### tenantInvitations
- Pending invitations to tenants
- Email and role information
- Status tracking

## Security

### Firestore Rules
- ✅ All data requires authentication
- ✅ Multi-tenant isolation enforced
- ✅ Role-based access control (owner, admin, member)
- ✅ Users can only access their tenant's data
- ✅ Admins can manage birthdays and members
- ✅ Only owners can delete tenants

### Best Practices Implemented
- No sensitive data in client code
- Hebcal API calls only from Cloud Functions
- Proper error handling and logging
- Input validation on client and server
- Rate limiting through Firebase

## Internationalization

### Supported Languages
- 🇮🇱 Hebrew (עברית) - RTL support
- 🇺🇸 English

### Adding New Languages
1. Create translation file in `src/locales/[lang].json`
2. Add to i18n config in `src/config/i18n.ts`
3. Add language toggle in Header component

## Google Calendar Integration

### Setup
1. Create OAuth 2.0 credentials in Google Cloud Console
2. Add authorized origins
3. Set `VITE_GOOGLE_CLIENT_ID` in `.env`

### Usage
Users can:
- Export single birthdays to Google Calendar
- Bulk export multiple birthdays
- Automatic creation of recurring events

## Account Linking

The system supports linking multiple authentication methods to a single user account:

### Automatic Linking
- Email + Google with same email address → Auto-linked
- Prevents duplicate accounts

### Manual Linking
- Users can link phone numbers from profile
- Users can link Google account after email signup
- All linked providers tracked in `linkedProviders` field

## Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

### Quick Deploy
```bash
# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only functions
firebase deploy --only hosting
firebase deploy --only firestore:rules
```

## Development

### Available Scripts
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
```

### Code Style
- TypeScript strict mode
- Functional components with hooks
- No `any` types
- Async/await for promises
- Proper error handling

## Troubleshooting

### Common Issues

**Hebrew dates not calculating**
- Check Cloud Functions logs: `firebase functions:log`
- Verify Hebcal API is accessible
- Ensure function has proper permissions

**Authentication not working**
- Verify auth providers enabled in Firebase Console
- Check OAuth credentials are correct
- Ensure authorized domains are whitelisted

**Data not loading**
- Check Firestore security rules
- Verify user is member of tenant
- Check browser console for errors

## Contributing

When contributing:
1. Follow existing code style
2. Add TypeScript types for new features
3. Update translations for both languages
4. Test on both LTR and RTL layouts
5. Ensure Firestore rules are updated if needed

## License

Private project for Hebrew Birthday Management System.

## Support

For issues or questions, please check:
1. [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for setup help
2. Firebase Console logs for errors
3. Browser console for client-side issues

---

Built with ❤️ for Jewish communities worldwide
