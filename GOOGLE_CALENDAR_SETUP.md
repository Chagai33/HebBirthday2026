# Google Calendar Integration - Setup Guide

## פיצ'ר חדש: סנכרון אוטומטי ליומן Google

המערכת כעת תומכת בסנכרון אוטומטי של ימי הולדת עבריים ליומן Google האישי של המשתמש.

---

## הגדרות נדרשות ב-Google Cloud Console

### 1. הפעלת Google Calendar API

1. גש ל-[Google Cloud Console](https://console.cloud.google.com)
2. בחר בפרויקט `hebbirthday2026`
3. עבור ל-**APIs & Services** > **Library**
4. חפש "Google Calendar API"
5. לחץ על **Enable**

### 2. הגדרת OAuth 2.0

1. עבור ל-**APIs & Services** > **OAuth consent screen**
2. ודא שהסטטוס הוא **Published** או **Testing**
3. בחלק **Scopes**, הוסף:
   - `https://www.googleapis.com/auth/calendar.events`

### 3. הגדרת Authorized Origins & Redirect URIs

1. עבור ל-**APIs & Services** > **Credentials**
2. בחר ב-OAuth 2.0 Client ID הקיים
3. הוסף **Authorized JavaScript origins**:
   - `https://hebbirthday2026v3c.netlify.app`
   - `http://localhost:5173`
   - `https://hebbirthday2026.firebaseapp.com`

4. הוסף **Authorized redirect URIs**:
   - `https://hebbirthday2026v3c.netlify.app`
   - `http://localhost:5173`
   - `https://hebbirthday2026.firebaseapp.com`

5. שמור את השינויים

---

## פריסת Cloud Functions

### 1. התקנת Dependencies

```bash
cd functions
npm install
```

### 2. הגדרת Environment Variables

הקובץ `functions/.env` כבר מכיל את המשתנים הנדרשים:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**חשוב:** אל תעלה קובץ זה ל-Git!

### 3. Deploy של Cloud Functions

```bash
firebase deploy --only functions
```

הפונקציות הבאות ייפרסו:
- `exchangeGoogleAuthCode` - החלפת קוד OAuth ב-tokens
- `syncBirthdayToGoogleCalendar` - סנכרון יום הולדת בודד
- `syncMultipleBirthdaysToGoogleCalendar` - סנכרון מרובה
- `removeBirthdayFromGoogleCalendar` - הסרת יום הולדת
- `disconnectGoogleCalendar` - ניתוק חיבור

---

## עדכון Firestore Rules

```bash
firebase deploy --only firestore:rules
```

הכלל החדש מגן על קולקציית `googleCalendarTokens`:
- משתמשים יכולים לגשת רק ל-tokens שלהם
- אסור לקרוא/לכתוב tokens של משתמשים אחרים

---

## פריסת Frontend

### Netlify

1. ודא שמשתנה הסביבה מוגדר:
   ```
   VITE_GOOGLE_CLIENT_ID=971070020927-qk65hibmfc51hggn99r4s57fcpenu89n.apps.googleusercontent.com
   ```

2. Deploy:
   ```bash
   npm run build
   # העלה את תיקיית dist/ ל-Netlify
   ```

### Firebase Hosting (אלטרנטיבה)

```bash
firebase deploy --only hosting
```

---

## Rate Limits שהוגדרו

למניעת שימוש לרעה, הפונקציות מוגבלות:

| פונקציה | מגבלה | חלון זמן |
|---------|-------|----------|
| `exchangeGoogleAuthCode` | 5 בקשות | דקה |
| `syncBirthdayToGoogleCalendar` | 30 בקשות | דקה |
| `syncMultipleBirthdaysToGoogleCalendar` | 3 בקשות | 5 דקות |
| `removeBirthdayFromGoogleCalendar` | 20 בקשות | דקה |

### הודעות שגיאה למשתמש

כל השגיאות מוחזרות בעברית ללא חשיפת מידע פנימי:
- "יותר מדי ניסיונות. אנא המתן דקה"
- "שגיאה בחיבור ליומן Google. אנא נסה שנית"
- "אין הרשאת גישה ליומן Google. אנא התחבר מחדש"

---

## שימוש במערכת

### זרימת המשתמש

1. **התחברות ליומן Google**
   - משתמש לוחץ על "התחבר ליומן Google"
   - נפתח חלון OAuth של Google
   - משתמש מאשר גישה
   - המערכת שומרת את ה-tokens ב-Firestore

2. **סנכרון יום הולדת בודד**
   - ליד כל יום הולדת מופיע סטטוס "לא מסונכרן"
   - לחיצה על "סנכרן" יוצרת אירוע ב-Google Calendar
   - האירוע כולל: שם, גיל, תאריך עברי/לועזי, הערות

3. **סנכרון מרובה**
   - כפתור "סנכרן הכל ליומן Google"
   - המערכת מסנכרנת עד 50 ימי הולדת בו-זמנית
   - הצגת progress והודעת הצלחה

4. **ניתוק**
   - דרך Settings > Google Calendar
   - מוחק את כל ה-tokens
   - מנקה את סימוני הסנכרון

---

## מבנה הנתונים ב-Firestore

### קולקציה: `googleCalendarTokens`

```
{
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number (timestamp),
  scope: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### שדות חדשים ב-`birthdays`

```
{
  ...existing fields,
  googleCalendarEventId: string | null,
  lastSyncedAt: timestamp | null
}
```

---

## טיפול בבעיות נפוצות

### "לא מתקבל קוד אימות מ-Google"

- ודא שה-Authorized Origins מוגדרים נכון
- בדוק שה-Client ID נכון ב-`.env`
- נסה לרענן את הדפדפן

### "Token expired"

המערכת מרעננת אוטומטית את ה-token.
אם זה נכשל - המשתמש יתבקש להתחבר מחדש.

### "אין הרשאת גישה"

- המשתמש ביטל הרשאות ב-Google
- יש לנתק ולהתחבר מחדש

### Functions לא מגיבות

בדוק logs:
```bash
firebase functions:log --only exchangeGoogleAuthCode
```

---

## אבטחה

1. **Client Secret** - מאוחסן רק ב-Cloud Functions (לא ב-Frontend)
2. **Tokens** - מאוחסנים ב-Firestore עם Rules מחמירים
3. **Rate Limiting** - למניעת שימוש לרעה
4. **הודעות שגיאה** - ללא חשיפת מידע טכני

---

## הערות נוספות

- הפיצ'ר הישן (פתיחת חלון Google Calendar) נשאר פעיל
- האירועים ביומן הם "all-day events" (כל היום)
- האירועים כוללים תזכורות: 24 שעות ו-60 דקות לפני
- ניתן להסיר אירועים מהיומן דרך האפליקציה

---

**תאריך עדכון:** נובמבר 2025
**גרסה:** 2.1.0
