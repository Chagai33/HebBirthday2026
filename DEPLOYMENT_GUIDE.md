# Hebrew Birthday Management System - Deployment Guide

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase project created (hebbirthday2026)
3. Node.js 18+ installed

## Firebase Setup

### 1. Login to Firebase
```bash
firebase login
```

### 2. Initialize Firebase Project
```bash
firebase use hebbirthday2026
```

### 3. Enable Authentication Methods

Go to Firebase Console → Authentication → Sign-in method:
- Enable Email/Password
- Enable Google
- Enable Phone

### 4. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 5. Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

### 6. Deploy Cloud Functions

Install dependencies:
```bash
cd functions
npm install
cd ..
```

Deploy:
```bash
firebase deploy --only functions
```

This will deploy:
- `onBirthdayWrite` - Triggered when birthday is created/updated
- `updateNextBirthdayScheduled` - Runs daily to update upcoming birthdays

## Frontend Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create `.env` file (optional, for emulator mode):
```env
VITE_USE_FIREBASE_EMULATOR=false
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

### 3. Build the Project
```bash
npm run build
```

### 4. Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

## Google Calendar Integration Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - Your production domain
4. Add the Client ID to `.env` as `VITE_GOOGLE_CLIENT_ID`

## Account Linking

The system automatically handles account linking when users sign in with multiple methods:

1. **Email + Google**: If a user signs in with email, then later with Google using the same email, Firebase automatically links them
2. **Email + Phone**: Users can link their phone number from the profile settings
3. **Google + Phone**: Users can link their phone number after signing in with Google

The `linkedProviders` field in the user document tracks all authentication methods.

## Testing

### Local Development
```bash
npm run dev
```

### Firebase Emulator (Optional)
```bash
firebase emulators:start
```

Set `VITE_USE_FIREBASE_EMULATOR=true` in `.env`

## Initial Tenant Creation

When a user first signs up, they need to create a tenant (family/group):

1. User signs up → redirected to dashboard
2. Dashboard shows "Create Tenant" prompt
3. User creates first tenant → can start adding birthdays

## Monitoring

- Functions logs: `firebase functions:log`
- Firestore console: Firebase Console → Firestore Database
- Authentication: Firebase Console → Authentication

## Troubleshooting

### Functions Not Triggering
- Check function logs: `firebase functions:log`
- Verify Firestore triggers are deployed
- Check Firestore Rules allow writes

### Hebrew Date Not Calculating
- Check Hebcal API is accessible
- Verify function has internet access
- Check function logs for errors

### Authentication Issues
- Verify auth providers are enabled in Firebase Console
- Check OAuth credentials are correct
- Verify authorized domains include your hosting domain

## Security Checklist

- [x] Firestore Rules deployed
- [x] All collections protected by authentication
- [x] Multi-tenant isolation enforced
- [x] API keys not exposed in client code
- [ ] OAuth credentials configured
- [ ] Production domains whitelisted

## Performance Optimization

1. **Firestore Indexes**: Already configured in `firestore.indexes.json`
2. **Query Limits**: Consider adding pagination for large datasets
3. **Caching**: React Query configured with 5-minute stale time
4. **CDN**: Firebase Hosting automatically uses CDN

## Backup Strategy

1. Enable automated backups in Firebase Console
2. Export important data regularly
3. Keep Cloud Functions code in version control
4. Document any manual configuration steps
