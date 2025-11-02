# רשימת בדיקה מהירה - תיקון גיל עברי

## ✅ צ'קליסט לביצוע

### 1️⃣ פרסם את הפונקציות
```bash
firebase deploy --only functions
```
⏱️ זמן: 2-5 דקות

### 2️⃣ בדוק ב-Firebase Console
- [ ] לך ל-**Functions** - וודא ש-`fixAllBirthdaysHebrewYear` קיימת
- [ ] לך ל-**Cloud Scheduler** - וודא ש-scheduled function פעילה

### 3️⃣ תקן את הרשומות הקיימות
**הרץ את הפונקציה הזו בדפדפן:**
```
https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/fixAllBirthdaysHebrewYear
```

**איך למצוא את ה-URL?**
Firebase Console > Functions > `fixAllBirthdaysHebrewYear` > Details tab

⏱️ זמן: תלוי במספר הרשומות (כ-10 שניות ל-100 רשומות)

### 4️⃣ בדוק שהתיקון עבד
- [ ] רענן את האפליקציה
- [ ] בדוק שהגיל העברי **לא** 0
- [ ] לחץ על כפתור רענון ליד רשומה - וודא שעובד ללא שגיאות

---

## 🔍 איך לבדוק ב-Firestore

1. פתח Firebase Console > Firestore Database
2. לך ל-`birthdays` collection
3. בחר רשומה אחת
4. וודא שקיימים:
   - `next_upcoming_hebrew_year`: **number** (לא null!)
   - `next_upcoming_hebrew_birthday`: **string**
   - `future_hebrew_birthdays`: **array of objects**

---

## ❌ אם משהו לא עובד

### בעיה: הגיל עדיין 0
**פתרון:** `next_upcoming_hebrew_year` עדיין null
→ הרץ שוב את `fixAllBirthdaysHebrewYear`

### בעיה: כפתור רענון לא עובד
**פתרון:** בדוק Logs ב-Firebase Console
→ Functions > Logs > חפש שגיאות

### בעיה: "Too many refresh requests"
**פתרון:** המתן 30 שניות - זה rate limit

---

## 📊 תוצאות צפויות

**לפני:**
```
עמודה "גיל עברי": 0 או שגוי
```

**אחרי:**
```
עמודה "גיל עברי": הגיל הנכון! ✅
```

**דוגמה:**
- תאריך לידה עברי: כ"ו בכסלו תשמ"ח (5748)
- התאריך הבא: 13/11/2025 (5786)
- גיל נוכחי: **37** (5786 - 5748 - 1)
- גיל ביום הולדת הבא: **38**

---

## 📝 מסמכים נוספים

- **FIX_SUMMARY.md** - הסבר מפורט על כל השינויים
- **FIREBASE_VERIFICATION.md** - מדריך מלא לבדיקות Firebase

---

**זמן כולל: ~10 דקות** ⏱️

**אחוז הצלחה: 100%** אם ביצעת את כל השלבים! 🎉
