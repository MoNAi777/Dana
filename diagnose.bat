@echo off
title DocMerger Diagnostics
color 1F
echo.
echo ====================================================================
echo                DocMerger - בדיקת תקינות המערכת
echo ====================================================================
echo.

rem Set working directory to the location of this script
set SCRIPT_DIR=%~dp0
echo מיקום נוכחי: %SCRIPT_DIR%
cd /d "%SCRIPT_DIR%"

echo.
echo [1/5] בודק קיום תיקיות נדרשות...
if not exist "server" (
  echo [X] שגיאה: תיקיית server לא נמצאה!
) else (
  echo [V] תיקיית server קיימת
)

if not exist "client" (
  echo [X] שגיאה: תיקיית client לא נמצאה!
) else (
  echo [V] תיקיית client קיימת
)

echo.
echo [2/5] בודק התקנת Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [X] שגיאה: Node.js לא מותקן! נדרש להתקין מ-https://nodejs.org
) else (
  echo [V] Node.js מותקן: 
  node --version
)

echo.
echo [3/5] בודק התקנת ספריות בשרת...
if exist "server\node_modules" (
  echo [V] ספריות השרת מותקנות
) else (
  echo [X] שגיאה: ספריות השרת לא מותקנות! הרץ את install.bat
)

echo.
echo [4/5] בודק התקנת ספריות בלקוח...
if exist "client\node_modules" (
  echo [V] ספריות הלקוח מותקנות
) else (
  echo [X] שגיאה: ספריות הלקוח לא מותקנות! הרץ את install.bat
)

echo.
echo [5/5] בודק קיצור דרך בשולחן העבודה...
if exist "%USERPROFILE%\Desktop\DocMerger.lnk" (
  echo [V] קיצור דרך DocMerger קיים בשולחן העבודה
) else (
  echo [X] קיצור דרך DocMerger לא קיים! יש להריץ fix-shortcut.bat ליצירתו מחדש
)

echo.
echo ====================================================================
echo                          המלצות לפתרון
echo ====================================================================
echo.
echo * אם חסרות תיקיות או ספריות, הרץ את install.bat להתקנה מחדש
echo * אם חסר קיצור דרך, הרץ את fix-shortcut.bat ליצירתו מחדש
echo * השתמש בקובץ launch-docmerger.bat להפעלת האפליקציה
echo * וודא שאתה מריץ פקודות מתוך תיקיית הפרויקט ולא מ-D:\Dana
echo.
echo ====================================================================
echo.

pause 