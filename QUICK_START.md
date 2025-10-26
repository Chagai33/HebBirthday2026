# Quick Start Guide

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Firebase project created: `hebbirthday2026`
- [ ] Git repository initialized

## 5-Minute Setup

### 1. Clone & Install (2 minutes)

```bash
# Install frontend dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### 2. Firebase Login (1 minute)

```bash
firebase login
firebase use hebbirthday2026
```

### 3. Enable Authentication (1 minute)

Go to [Firebase Console](https://console.firebase.google.com):
1. Select project `hebbirthday2026`
2. Authentication → Sign-in method
3. Enable: Email/Password, Google, Phone

### 4. Deploy Backend (1 minute)

```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy Cloud Functions
firebase deploy --only functions
```

### 5. Start Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## First User Flow

1. **Register:**
   - Click "Sign Up"
   - Enter email, password, name
   - Or click "Sign in with Google"

2. **Create Tenant:**
   - You'll see "Create Tenant" prompt
   - Enter family/group name
   - Click create

3. **Add Birthday:**
   - Click "Add Birthday" button
   - Fill in name and date
   - Choose gender (optional)
   - Check "After Sunset" if relevant
   - Submit

4. **View Hebrew Date:**
   - Wait a few seconds
   - Cloud Function calculates Hebrew date
   - Birthday list updates automatically
   - Hebrew date and next occurrence appear

## Common Commands

```bash
# Development
npm run dev                # Start dev server
npm run build              # Build for production
npm run preview            # Preview production build

# Firebase
firebase deploy            # Deploy everything
firebase functions:log     # View function logs
firebase emulators:start   # Start local emulators

# Testing
npm run typecheck          # Check TypeScript
npm run lint               # Run ESLint
```

## Environment Variables

Create `.env` file (optional):

```env
# For local development with emulators
VITE_USE_FIREBASE_EMULATOR=false

# For Google Calendar integration (get from Google Cloud Console)
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

## Google Calendar Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project or select existing
3. Enable "Google Calendar API"
4. Create OAuth 2.0 credentials
5. Add authorized origins:
   - `http://localhost:5173`
   - Your production domain
6. Copy Client ID to `.env`

## Firestore Structure (Auto-created)

```
firestore
├── users                    # User profiles
├── tenants                  # Families/groups
├── userTenantMemberships   # User-tenant links
├── birthdays               # Birthday records
└── tenantInvitations       # Pending invitations
```

## Default Ports

- **Frontend:** http://localhost:5173
- **Firestore Emulator:** http://localhost:8080
- **Auth Emulator:** http://localhost:9099
- **Functions Emulator:** http://localhost:5001

## Troubleshooting

### "Firebase CLI not found"
```bash
npm install -g firebase-tools
```

### "Permission denied"
```bash
firebase login
# Follow browser authentication
```

### "Functions not deploying"
```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

### "Hebrew dates not showing"
1. Check function logs: `firebase functions:log`
2. Wait 30-60 seconds after creating birthday
3. Refresh page
4. Check Hebcal API is accessible

### "Can't create tenant"
1. Verify Firestore rules deployed
2. Check user is authenticated
3. Look for errors in browser console

## Project Structure Overview

```
project/
├── src/
│   ├── components/      # React components
│   ├── contexts/        # Auth & Tenant contexts
│   ├── hooks/           # Custom hooks
│   ├── services/        # Firebase services
│   ├── config/          # Firebase & i18n config
│   └── locales/         # Translations (en, he)
├── functions/           # Cloud Functions
│   └── src/
│       └── index.ts     # Function definitions
├── firestore.rules      # Security rules
├── firestore.indexes.json # DB indexes
└── firebase.json        # Firebase config
```

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/config/firebase.ts` | Firebase initialization |
| `src/config/i18n.ts` | Language configuration |
| `src/App.tsx` | Main app with routing |
| `src/components/Dashboard.tsx` | Main dashboard |
| `functions/src/index.ts` | Cloud Functions |
| `firestore.rules` | Security rules |

## Next Steps

After basic setup:

1. **Invite Team Members:**
   - TODO: Implement invitation system
   - For now, they can register separately

2. **Import Existing Data:**
   - TODO: CSV import feature
   - Currently manual entry only

3. **Setup Calendar Sync:**
   - Configure Google OAuth
   - Add `VITE_GOOGLE_CLIENT_ID` to `.env`

4. **Customize:**
   - Update tenant name
   - Add more family members
   - Explore statistics

## Support Resources

- [Full Documentation](./README.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [System Overview](./SYSTEM_OVERVIEW.md)
- [Feature Roadmap](./FEATURES_TODO.md)
- [Firebase Console](https://console.firebase.google.com)
- [Hebcal API Docs](https://www.hebcal.com/home/developer-apis)

## Production Deployment

When ready for production:

```bash
# 1. Build frontend
npm run build

# 2. Deploy everything
firebase deploy

# Your app will be live at:
# https://hebbirthday2026.web.app
```

## Security Reminder

Before going live:

- [ ] Configure OAuth credentials
- [ ] Add production domain to Firebase authorized domains
- [ ] Review Firestore rules
- [ ] Test with multiple users
- [ ] Enable Firebase App Check (optional)
- [ ] Setup monitoring/alerts

---

**Need Help?**

Check the troubleshooting section in README.md or review Firebase Console logs.

**Ready to Code?**

See FEATURES_TODO.md for features you can implement next!
