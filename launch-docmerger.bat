@echo off
title DocMerger Launcher
color 1F
echo.
echo ====================================================================
echo                    DocMerger - מיזוג קבצי PDF ו-Word
echo ====================================================================
echo.
echo טוען את האפליקציה, אנא המתן...
echo.

rem Set working directory to the location of this script
set SCRIPT_DIR=%~dp0
echo מגדיר תיקיית עבודה: %SCRIPT_DIR%
cd /d "%SCRIPT_DIR%"

rem Ensure we're in the correct directory by checking for server folder
if not exist "server" (
  echo שגיאה: תיקיית server לא נמצאה. ייתכן שהקיצור דרך מנוי לתיקייה לא נכונה.
  echo המיקום הנוכחי: %CD%
  echo.
  pause
  exit /b 1
)

rem Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo שגיאה: Node.js לא מותקן במחשב זה.
  echo.
  echo אנא התקן את Node.js מהאתר https://nodejs.org
  echo.
  pause
  exit /b 1
)

rem Start the server
echo מפעיל את השרת...
start cmd /k "cd /d "%SCRIPT_DIR%server" & npm start"

rem Wait for server to start
echo ממתין לעליית השרת...
timeout /t 5 /nobreak >nul

rem Start the client
echo מפעיל את הלקוח...
start cmd /k "cd /d "%SCRIPT_DIR%client" & npm start"

echo.
echo ====================================================================
echo האפליקציה הופעלה בהצלחה!
echo.
echo - השרת פועל בכתובת: http://localhost:5000
echo - הלקוח פועל בכתובת: http://localhost:3000
echo.
echo האפליקציה צריכה להיפתח בדפדפן באופן אוטומטי.
echo אם הדפדפן לא נפתח, פתח את הדפדפן וגלוש לכתובת:
echo http://localhost:3000
echo.
echo אל תסגור את חלון זה או את החלונות שנפתחו.
echo ====================================================================
echo.

timeout /t 10
exit 