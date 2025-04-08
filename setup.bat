@echo off
color 1F
title DocMerger Setup

echo ====================================================================
echo                        DocMerger Setup Wizard
echo ====================================================================
echo.
echo Welcome to the DocMerger installation wizard. This program will 
echo install DocMerger on your computer and create a desktop shortcut.
echo.
echo DocMerger is a simple tool to merge PDF and Word documents.
echo.
echo ====================================================================
echo.

echo Do you want to install DocMerger? (Y/N)
set /p choice="> "
if /i "%choice%" NEQ "Y" goto :abort

echo.
echo ====================================================================
echo Step 1: Installing dependencies (this may take a few minutes)
echo ====================================================================
echo.

call install.bat

echo.
echo ====================================================================
echo Installation Completed Successfully
echo ====================================================================
echo.
echo DocMerger has been installed successfully.
echo.
echo - A desktop shortcut has been created.
echo - You can start DocMerger by double-clicking on the desktop icon.
echo.
echo Thank you for installing DocMerger!
echo.
goto :end

:abort
echo.
echo Installation was cancelled. No changes were made to your system.
echo.

:end
pause
exit 