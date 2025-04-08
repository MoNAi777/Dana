# DocMerger - מיזוג קבצי Word ו-PDF

מערכת פשוטה לאיחוד קבצי PDF ו-Word למסמך אחד.

## תכונות

- העלאת קבצי PDF ו-Word (docx/doc)
- גרירה ושחרור עם תצוגת תור קבצים
- סידור קבצים באמצעות גרירה
- אפשרות לבחור פלט סופי: PDF, Word או שניהם
- תמיכה מלאה בעברית (RTL)

## דרישות מערכת

- Node.js 14 ומעלה
- NPM או Yarn
- דפדפן מודרני (Chrome, Firefox, Safari, Edge)

## התקנה קלה (אשף ההתקנה)

1. פתח את תיקיית הפרויקט
2. לחץ פעמיים על הקובץ `setup.bat`
3. עקוב אחרי ההנחיות באשף ההתקנה
4. בסיום ההתקנה יווצר קיצור דרך על שולחן העבודה

## הפעלת התוכנה

לחץ פעמיים על האייקון "DocMerger" שנוצר על שולחן העבודה.

- השרת יפעל בכתובת: `http://localhost:5000`
- האפליקציה תיפתח בדפדפן בכתובת: `http://localhost:3000`

## התקנה ידנית

יש לבצע את הצעדים הבאים כדי להתקין ולהפעיל את האפליקציה:

### התקנת צד שרת (Backend)

```bash
cd docmerger/server
npm install
```

### התקנת צד לקוח (Frontend)

```bash
cd docmerger/client
npm install
```

## הפעלה ידנית

### הפעלת השרת

```bash
cd docmerger/server
npm start
```

השרת יפעל בכתובת: `http://localhost:5000`

### הפעלת צד לקוח

```bash
cd docmerger/client
npm start
```

האפליקציה תיפתח בדפדפן בכתובת: `http://localhost:3000`

## שימוש באפליקציה

1. גרור קבצי PDF או Word לאזור הגרירה, או לחץ לבחירת קבצים מהמחשב
2. סדר את הקבצים באמצעות גרירה ושחרור לפי הסדר הרצוי
3. בחר את פורמט הפלט הרצוי (PDF או Word)
4. לחץ על כפתור "מזג קבצים"
5. המסמך המאוחד יורד אוטומטית למחשב

## פיתוח

### מבנה הפרויקט

- `/client` - צד לקוח (React)
  - `/public` - קבצים סטטיים
  - `/src` - קוד מקור React
  - `/src/components` - רכיבי React

- `/server` - צד שרת (Node.js)
  - `server.js` - נקודת כניסה לשרת
  - `fileProcessor.js` - לוגיקת עיבוד קבצים
  - `/uploads` - תיקיית העלאות זמנית (נוצרת אוטומטית)
  - `/tmp` - תיקייה זמנית לקבצים מעובדים (נוצרת אוטומטית)

## טכנולוגיות

- צד לקוח:
  - React
  - react-beautiful-dnd (גרירה ושחרור)
  - Axios (בקשות HTTP)

- צד שרת:
  - Node.js
  - Express
  - pdf-lib (טיפול בקבצי PDF)
  - mammoth (חילוץ טקסט מקבצי Word)
  - docx (יצירת קבצי Word)
  - pdf-parse (חילוץ טקסט מקבצי PDF)
  - multer (העלאת קבצים) 