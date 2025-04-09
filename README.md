# DocMerger - מערכת למיזוג קבצי PDF ו-Word

מערכת DocMerger מאפשרת למשתמשים למזג מגוון סוגי קבצים לקובץ מאוחד בפורמט PDF או DOCX.
המערכת מותאמת לעברית ומציעה ממשק משתמש נוח וידידותי.

## תכונות המערכת

- **תמיכה במגוון סוגי קבצים**:
  - **מסמכים**: PDF, DOC, DOCX, RTF, ODT
  - **מצגות**: PPT, PPTX, ODP
  - **גיליונות אלקטרוניים**: XLS, XLSX, ODS, CSV
  - **תמונות**: JPG, PNG, GIF, BMP, TIFF, WebP
  - **טקסט**: TXT

- **תמיכה מלאה בעברית**:
  - ממשק משתמש בעברית
  - טיפול מותאם בטקסט עברי (RTL)
  - זיהוי אוטומטי של מלל בעברית

- **חוויית משתמש נוחה**:
  - ממשק גרירה ושחרור (Drag & Drop)
  - אפשרות סידור קבצים בסדר הרצוי
  - חיווי על התקדמות התהליך
  - הורדה אוטומטית של הקובץ המאוחד

- **אפשרויות פלט**:
  - PDF - לשמירה על מראה אחיד של הקבצים
  - DOCX - לעריכה קלה לאחר המיזוג

## התקנה מהירה

### דרישות מערכת

- **Node.js** (גרסה 12 ומעלה)
- **Git**
- **מערכת הפעלה**: Windows 10 ומעלה

### התקנה בשיטת ה"קליק האחד"

פשוט הפעל את הסקריפט `update-and-install.bat` והוא ידאג להכל:
1. יעדכן את הקוד מ-GitHub
2. יתקין את כל התלויות הנדרשות
3. ייצור קיצור דרך בשולחן העבודה
4. יציע להפעיל את האפליקציה מיד בסיום

### התקנה ידנית

אם ברצונך להתקין באופן ידני, בצע את השלבים הבאים:

1. **שכפול מאגר הקוד**:
   ```
   git clone https://github.com/MoNAi777/Dana.git
   cd docmerger
   ```

2. **התקנת תלויות צד שרת**:
   ```
   cd server
   npm install
   ```

3. **התקנת תלויות צד לקוח**:
   ```
   cd ../client
   npm install
   ```

4. **יצירת קיצור דרך**:
   ```
   cd ..
   cscript create-shortcut.vbs
   ```

5. **הפעלת האפליקציה**:
   ```
   start-docmerger.bat
   ```

## כיצד להשתמש באפליקציה

1. הפעל את האפליקציה דרך קיצור הדרך בשולחן העבודה או באמצעות הרצת `launch-docmerger.bat`
2. גרור קבצים לאזור הנחיתה או לחץ לבחירת קבצים
3. סדר את הקבצים בסדר הרצוי באמצעות גרירה ושחרור
4. בחר את פורמט הפלט (PDF או DOCX)
5. לחץ על כפתור "מזג קבצים"
6. המסמך המאוחד יורד אוטומטית למחשב

## פתרון בעיות נפוצות

### האפליקציה אינה נפתחת

- ודא שהריצו את `npm install` בתיקיות `server` ו-`client`
- בדוק אם יש תהליכים שכבר תופסים את פורטים 3000 או 5000
- נסה להפעיל את הסקריפט `diagnose.bat` לאבחון אוטומטי

### שגיאות בעת מיזוג קבצים

- ודא שהקבצים אינם נעולים על ידי תוכנות אחרות
- ודא שהקבצים אינם פגומים
- בדוק את גודל הקבצים (מקסימום 50MB לקובץ)

### בעיות בהצגת טקסט עברי

- ודא שיש תמיכה בעברית במערכת ההפעלה
- נסה להשתמש בפורמט פלט DOCX
- בדוק שהקובץ המקורי עצמו תקין וקריא

## רישיון ושימוש

התוכנה פותחה על ידי DocMerger Team וניתנת לשימוש חופשי.
&copy; 2025 DocMerger - כלי מיזוג קבצים מאובטח

---
לשאלות ותמיכה: support@docmerger.com 