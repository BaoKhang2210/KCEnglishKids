param([string]$Output = (Join-Path $PSScriptRoot '../../docs/badge-art-v2-preview.png'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$clientRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$badgeSource = Get-Content -LiteralPath (Join-Path $clientRoot 'src/data/badges.ts') -Raw -Encoding UTF8
$artSource = Get-Content -LiteralPath (Join-Path $clientRoot 'src/data/badgeArtwork.ts') -Raw -Encoding UTF8
$badgeMatches = [regex]::Matches($badgeSource, "id: '([^']+)',\s*icon: '[^']+',\s*name: '([^']+)'")
$sheet = New-Object Drawing.Bitmap(1300, 1470)
$graphics = [Drawing.Graphics]::FromImage($sheet)
$heading = New-Object Drawing.Font('Arial', 25, ([Drawing.FontStyle]::Bold))
$font = New-Object Drawing.Font('Arial', 11, ([Drawing.FontStyle]::Bold))
$ink = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(47, 77, 65))
$format = New-Object Drawing.StringFormat
$format.Alignment = [Drawing.StringAlignment]::Center
try {
    $graphics.Clear([Drawing.Color]::FromArgb(252, 250, 243))
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawString('KCEnglishKids | 25 unique achievement badges', $heading, $ink, 26, 22)
    for ($index = 0; $index -lt $badgeMatches.Count; $index++) {
        $id = $badgeMatches[$index].Groups[1].Value
        $label = $badgeMatches[$index].Groups[2].Value
        $mapping = [regex]::Match($artSource, ($id + ": (oldCollection|newCollection) \+ '([^']+)'"))
        if (-not $mapping.Success) { throw "No artwork for $id" }
        $collection = if ($mapping.Groups[1].Value -eq 'oldCollection') { 'koko-friends-v1' } else { 'koko-badges-v2' }
        $imagePath = Join-Path $clientRoot ('public/images/rewards/' + $collection + '/' + $mapping.Groups[2].Value)
        $image = [Drawing.Image]::FromFile($imagePath)
        $x = 15 + ($index % 5) * 255
        $y = 90 + [Math]::Floor($index / 5) * 270
        try { $graphics.DrawImage($image, [int]($x + 15), [int]$y, 220, 220) } finally { $image.Dispose() }
        $graphics.DrawString($label, $font, $ink, [Drawing.RectangleF]::new($x, ($y + 225), 250, 42), $format)
    }
    $sheet.Save([IO.Path]::GetFullPath($Output), [Drawing.Imaging.ImageFormat]::Png)
} finally {
    $graphics.Dispose(); $sheet.Dispose(); $heading.Dispose(); $font.Dispose(); $ink.Dispose(); $format.Dispose()
}
Write-Output ('Saved badge preview: ' + $Output)
