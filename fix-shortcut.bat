@echo off
title DocMerger Shortcut Fix
color 1F
echo.
echo ====================================================================
echo                  תיקון קיצור דרך DocMerger
echo ====================================================================
echo.
echo תהליך זה יתקן את קיצור הדרך של DocMerger בשולחן העבודה.
echo.

rem Set working directory to the location of this script
set SCRIPT_DIR=%~dp0
echo מגדיר תיקיית עבודה: %SCRIPT_DIR%
cd /d "%SCRIPT_DIR%"

echo.
echo מוחק קיצור דרך קיים (אם קיים)...
if exist "%USERPROFILE%\Desktop\DocMerger.lnk" del /f /q "%USERPROFILE%\Desktop\DocMerger.lnk"

echo.
echo יוצר קיצור דרך חדש...
cscript //nologo create-shortcut.vbs

echo.
echo ====================================================================
echo פעולת התיקון הושלמה בהצלחה!
echo.
echo * קיצור הדרך DocMerger נוצר מחדש בשולחן העבודה.
echo * תיקיית העבודה הוגדרה ל: %SCRIPT_DIR%
echo.
echo נסה כעת להפעיל את האפליקציה דרך הקיצור החדש.
echo ====================================================================
echo.

pause 