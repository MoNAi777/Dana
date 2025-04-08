@echo off
echo DocMerger Installation
echo ====================
echo.

echo Step 1: Installing server dependencies...
cd server
call npm install
cd ..

echo.
echo Step 2: Installing client dependencies...
cd client
call npm install
cd ..

echo.
echo Step 3: Creating application icon...
powershell -ExecutionPolicy Bypass -File download-icon.ps1

echo.
echo Step 4: Creating desktop shortcut...
cscript //nologo create-shortcut.vbs

echo.
echo Installation complete!
echo.
echo DocMerger has been installed successfully.
echo A shortcut has been created on your desktop.
echo.
echo To start the application, you can:
echo 1. Double-click the "DocMerger" icon on your desktop, or
echo 2. Run start-all.bat from this folder
echo.
pause 