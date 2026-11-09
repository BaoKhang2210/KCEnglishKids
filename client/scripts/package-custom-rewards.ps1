param(
    [string]$Manifest = (Join-Path $PSScriptRoot '../public/images/rewards/koko-friends-v1/prompts.json'),
    [string]$AssetRoot = (Join-Path $PSScriptRoot '../public/images/rewards/koko-friends-v1')
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetRoot = [IO.Path]::GetFullPath($AssetRoot)
New-Item -ItemType Directory -Force -Path $assetRoot | Out-Null
$items = Get-Content -LiteralPath $Manifest -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($item in $items.assets) {
    if ($item.name -notmatch '^[a-z-]+$') { throw 'Invalid asset filename' }
    $inputImage = [Drawing.Image]::FromFile($item.originalPath)
    $bitmap = New-Object Drawing.Bitmap(512, 512, ([Drawing.Imaging.PixelFormat]::Format32bppArgb))
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.Clear([Drawing.Color]::Transparent)
        $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $ratio = [Math]::Min(512.0 / $inputImage.Width, 512.0 / $inputImage.Height)
        $width = [int]($inputImage.Width * $ratio)
        $height = [int]($inputImage.Height * $ratio)
        $graphics.DrawImage($inputImage, [Drawing.Rectangle]::new([int]((512-$width)/2), [int]((512-$height)/2), $width, $height))
        $bitmap.Save((Join-Path $assetRoot ($item.name + '.png')), [Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
        $inputImage.Dispose()
    }
}
Write-Output ('Packaged ' + $items.assets.Count + ' transparent reward illustrations at 512px.')
