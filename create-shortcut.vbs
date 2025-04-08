Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.SpecialFolders("Desktop") & "\DocMerger.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)

' Get full path of the script directory
scriptDir = oWS.CurrentDirectory
WScript.Echo "Creating shortcut with working directory: " & scriptDir

' Set shortcut properties
oLink.TargetPath = scriptDir & "\launch-docmerger.bat"
oLink.Description = "DocMerger - מיזוג קבצי Word ו-PDF"
oLink.IconLocation = scriptDir & "\icon.ico"
oLink.WorkingDirectory = scriptDir

' Save the shortcut
oLink.Save
WScript.Echo "Shortcut created successfully on desktop" 