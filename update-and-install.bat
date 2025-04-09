@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo ======================================================
echo =        DocMerger - עדכון והתקנה אוטומטית        =
echo ======================================================
echo.

:: בדיקה האם git מותקן
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo שגיאה: Git אינו מותקן במערכת.
    echo אנא התקן Git מ: https://git-scm.com/download/win
    echo לאחר התקנת Git, הפעל שוב סקריפט זה.
    pause
    exit /b 1
)

:: בדיקה האם node.js מותקן
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo שגיאה: Node.js אינו מותקן במערכת.
    echo אנא התקן Node.js מ: https://nodejs.org/
    echo לאחר התקנת Node.js, הפעל שוב סקריפט זה.
    pause
    exit /b 1
)

echo מעדכן את הקוד מ-GitHub...
git pull
if %ERRORLEVEL% NEQ 0 (
    echo שגיאה בעדכון מ-GitHub. בדוק את החיבור לאינטרנט או הרשאות הגישה.
    pause
    exit /b 1
)
echo הקוד עודכן בהצלחה!
echo.

echo מתקין תלויות שרת...
cd server
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo אזהרה: התרחשה שגיאה בהתקנת תלויות השרת.
    echo המשך על אחריותך...
    echo.
) else (
    echo תלויות שרת הותקנו בהצלחה!
    echo.
)

echo מתקין תלויות צד לקוח...
cd ../client
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo אזהרה: התרחשה שגיאה בהתקנת תלויות הלקוח.
    echo המשך על אחריותך...
    echo.
) else (
    echo תלויות לקוח הותקנו בהצלחה!
    echo.
)

cd ..

echo יוצר קיצור דרך בשולחן העבודה...
cscript /nologo create-shortcut.vbs
if %ERRORLEVEL% NEQ 0 (
    echo אזהרה: התרחשה שגיאה ביצירת קיצור הדרך.
    echo.
) else (
    echo קיצור דרך נוצר בהצלחה!
    echo.
)

echo.
echo ====================================================================
echo =                  תהליך ההתקנה הושלם בהצלחה!                    =
echo ====================================================================
echo.
echo כדי להפעיל את האפליקציה:
echo 1. לחץ על קיצור הדרך DocMerger בשולחן העבודה
echo    או
echo 2. הפעל את הסקריפט launch-docmerger.bat מתיקיית הפרויקט
echo.
echo האפליקציה תיפתח בדפדפן ב: http://localhost:3000
echo.

set /p start_now=האם להפעיל את האפליקציה עכשיו? (y/n): 
if /i "%start_now%"=="y" (
    echo.
    echo מפעיל את DocMerger...
    call launch-docmerger.bat
) else (
    echo.
    echo תודה! ניתן להפעיל את האפליקציה בכל עת באמצעות קיצור הדרך בשולחן העבודה.
)

echo.
echo לחץ על מקש כלשהו ליציאה...
pause > nul 