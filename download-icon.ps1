$iconUrl = "https://raw.githubusercontent.com/microsoft/fluentui-system-icons/master/assets/Document/PDF/SVG/ic_fluent_document_pdf_24_regular.svg"
$outputSvg = "$PSScriptRoot\app-icon.svg"
$outputIco = "$PSScriptRoot\icon.ico"
$fallbackIconPath = "$PSScriptRoot\fallback-icon.txt"

Write-Host "Creating application icon..."

try {
    # Try to download the icon
    Write-Host "Downloading icon from the web..."
    Invoke-WebRequest -Uri $iconUrl -OutFile $outputSvg -TimeoutSec 10
    $downloadSuccess = $true
} catch {
    Write-Host "Could not download icon: $_"
    $downloadSuccess = $false
}

# If ImageMagick is installed and download was successful, try to convert the SVG to ICO
if ($downloadSuccess) {
    try {
        # Check if ImageMagick is installed
        $magickExists = Get-Command magick -ErrorAction SilentlyContinue
        
        if ($magickExists) {
            Write-Host "Converting SVG to ICO using ImageMagick..."
            & magick convert "$outputSvg" -resize 256x256 "$outputIco"
            
            if (Test-Path $outputIco) {
                Write-Host "Icon created successfully using ImageMagick."
                exit 0
            }
        } else {
            Write-Host "ImageMagick not found, trying alternative method..."
            throw "ImageMagick not found"
        }
    } catch {
        Write-Host "Could not convert SVG: $_"
    }
}

# If the above methods failed, try to use the .NET method
try {
    Write-Host "Creating a basic icon using .NET..."
    
    # Create a simple icon using .NET
    Add-Type -AssemblyName System.Drawing
    
    # Create a bitmap with blue background
    $bmp = New-Object System.Drawing.Bitmap(32, 32)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(0, 120, 212))
    
    # Draw simple document icon
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 1)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    
    # Document outline
    $g.DrawRectangle($pen, 8, 6, 16, 20)
    
    # Folded corner
    $points = @(
        [System.Drawing.Point]::new(24, 6),
        [System.Drawing.Point]::new(24, 10),
        [System.Drawing.Point]::new(20, 6)
    )
    $g.FillPolygon($brush, $points)
    
    # Text lines
    $g.DrawLine($pen, 12, 14, 20, 14)
    $g.DrawLine($pen, 12, 18, 20, 18)
    $g.DrawLine($pen, 12, 22, 20, 22)
    
    $g.Dispose()
    
    # Save as icon
    $bmp.Save($outputIco, [System.Drawing.Imaging.ImageFormat]::Icon)
    $bmp.Dispose()
    
    if (Test-Path $outputIco) {
        Write-Host "Icon created successfully using .NET Drawing."
        exit 0
    }
} catch {
    Write-Host "Could not create icon using .NET Drawing: $_"
}

# Final fallback: Use the base64 encoded icon if it exists
if (Test-Path $fallbackIconPath) {
    try {
        Write-Host "Using fallback icon..."
        $base64Content = Get-Content $fallbackIconPath -Raw
        $bytes = [Convert]::FromBase64String($base64Content)
        [System.IO.File]::WriteAllBytes($outputIco, $bytes)
        
        if (Test-Path $outputIco) {
            Write-Host "Fallback icon created successfully."
            exit 0
        }
    } catch {
        Write-Host "Could not create fallback icon: $_"
    }
}

# If we got here, all methods failed
Write-Host "Warning: Could not create icon file. The application will work, but will not have a custom icon."
if (-not (Test-Path $outputIco)) {
    # Create an empty file so the shortcut creation doesn't fail
    Set-Content -Path $outputIco -Value "" -Force
}

exit 1 