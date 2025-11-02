# Firebase Verification Checklist

## מה לבדוק ב-Firebase Console

### 1. בדוק שהפונקציות פורסמו (Firebase Functions)

**איך לבדוק:**
1. היכנס ל-Firebase Console: https://console.firebase.google.com
2. בחר את הפרויקט שלך
3. לך ל-**Functions** בתפריט השמאלי
4. וודא שהפונקציות הבאות קיימות:
   - ✅ `calculateHebrewDates` (Firestore Trigger)
   - ✅ `refreshBirthdayHebrewData` (Callable Function)
   - ✅ `updateNextBirthdayScheduled` (Scheduled Function)

**אם הפונקציות לא קיימות:**
```bash
# רוץ את הפקודה הזו מתיקיית הפרויקט:
firebase deploy --only functions
```

---

### 2. בדוק את מבנה הנתונים ב-Firestore

**איך לבדוק:**
1. לך ל-**Firestore Database** ב-Firebase Console
2. פתח את הקולקציה `birthdays`
3. בחר רשומת יום הולדת אחת
4. בדוק שהשדות הבאים קיימים:
   - ✅ `birth_date_gregorian` (string) - למשל: "2025-01-15"
   - ✅ `hebrew_year` (number) - למשל: 5748
   - ✅ `hebrew_month` (string) - למשל: "Kislev"
   - ✅ `hebrew_day` (number) - למשל: 15
   - ✅ `next_upcoming_hebrew_birthday` (string) - למשל: "2025-11-13"
   - ✅ `next_upcoming_hebrew_year` (number) - למשל: 5786

**הבעיה:** אם `next_upcoming_hebrew_year` הוא `null` או חסר - זו הסיבה שהגיל מוצג כ-0!

---

### 3. בדוק את Logs של הפונקציות

**איך לבדוק:**
1. לך ל-**Functions** > **Logs**
2. לחץ על כפתור הרענון באפליקציה
3. בדוק את הלוגים ב-Firebase Console
4. חפש הודעות שגיאה:
   - ❌ שגיאות חיבור ל-Hebcal API
   - ❌ שגיאות הרשאות (permission denied)
   - ❌ שגיאות בחישוב תאריכים

**דוגמה ללוג תקין:**
```
Current Hebrew year: 5786
Fetching next birthdays starting from year 5786
Future dates returned: 10 dates
Successfully refreshed Hebrew dates for birthday abc123
```

---

### 4. בדוק את Cloud Scheduler

**איך לבדוק:**
1. לך ל-**Cloud Scheduler** בתפריט (או דרך Google Cloud Console)
2. וודא שיש Job בשם: `firebase-schedule-updateNextBirthdayScheduled`
3. בדוק את:
   - ✅ Status: Enabled
   - ✅ Schedule: `every 24 hours`
   - ✅ Timezone: `Asia/Jerusalem`

**אם ה-Scheduler לא קיים:**
הפונקציה הזו נוצרת אוטומטית כשפורסים את הפונקציות. אם היא לא קיימת, יש לפרסם שוב:
```bash
firebase deploy --only functions:updateNextBirthdayScheduled
```

---

## איך לתקן רשומות קיימות

אם יש לך רשומות עם `next_upcoming_hebrew_year = null`, יש שתי אפשרויות:

### אפשרות 1: רענון ידני לכל רשומה
1. באפליקציה, לחץ על כפתור הרענון (🔄) ליד כל יום הולדת
2. הפונקציה תקרא ל-Hebcal API ותעדכן את הנתונים

### אפשרות 2: רענון אוטומטי לכל הרשומות (מומלץ!)
השתמש ב-Firebase Functions Shell או פרסם פונקציה חד-פעמית:

```javascript
// הוסף לקובץ functions/src/index.ts:
export const fixAllBirthdaysHebrewYear = functions.https.onRequest(async (req, res) => {
  const snapshot = await db.collection('birthdays').get();
  let fixed = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // בדוק אם next_upcoming_hebrew_year חסר או null
    if (!data.next_upcoming_hebrew_year && data.birth_date_gregorian) {
      try {
        const birthDate = new Date(data.birth_date_gregorian);
        const afterSunset = data.after_sunset || false;

        const hebcalData = await fetchHebcalData(birthDate, afterSunset);
        const currentHebrewYear = await getCurrentHebrewYear();
        const futureDates = await fetchNextHebrewBirthdays(
          currentHebrewYear,
          hebcalData.hm,
          hebcalData.hd,
          10
        );

        if (futureDates.length > 0) {
          const nextDate = futureDates[0];
          await doc.ref.update({
            next_upcoming_hebrew_year: nextDate.hebrewYear,
            next_upcoming_hebrew_birthday: `${nextDate.gregorianDate.getFullYear()}-${String(nextDate.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.gregorianDate.getDate()).padStart(2, '0')}`,
            future_hebrew_birthdays: futureDates.map((item) => ({
              gregorian: `${item.gregorianDate.getFullYear()}-${String(item.gregorianDate.getMonth() + 1).padStart(2, '0')}-${String(item.gregorianDate.getDate()).padStart(2, '0')}`,
              hebrewYear: item.hebrewYear
            })),
          });
          fixed++;
        }
      } catch (error) {
        console.error(`Failed to fix birthday ${doc.id}:`, error);
      }
    }
  }

  res.send(`Fixed ${fixed} birthdays`);
});
```

לאחר מכן:
```bash
firebase deploy --only functions:fixAllBirthdaysHebrewYear
```

ואז גש ל-URL:
```
https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/fixAllBirthdaysHebrewYear
```

---

## סיכום תהליך הבדיקה

1. ✅ בדוק שהפונקציות פורסמו
2. ✅ בדוק ב-Firestore שהשדה `next_upcoming_hebrew_year` קיים בכל הרשומות
3. ✅ לחץ על כפתור רענון ובדוק את הלוגים
4. ✅ וודא ש-Cloud Scheduler פעיל
5. ✅ אם צריך, הרץ את פונקציית התיקון לכל הרשומות

לאחר ביצוע השלבים האלה, הגיל העברי אמור להיות מדויק ב-100%!
