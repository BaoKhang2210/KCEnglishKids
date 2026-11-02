$ErrorActionPreference = 'Stop'
$assetRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/images/rewards/fluent-3d'))
$revision = '1ffb34c752ecf5d402f04cfb4b392c77f57c54bc'
$names = @('Paw prints','Backpack','Dog face','Red apple','Teddy bear','Deciduous tree','House with garden','Compass','Rainbow','Crown','Star','Glowing star','Sparkles','Sun','Honeybee','Fire','Calendar','Volcano','Bullseye','Brain','Speaker high volume','Gem stone','1st place medal','Old key','Trophy','Lion','Tiger face','Panda','Rocket','Unicorn','T-rex','Artist palette','Dolphin','Balloon','Strawberry')
New-Item -ItemType Directory -Force -Path $assetRoot | Out-Null
foreach ($name in $names) {
  $file = $name.ToLowerInvariant().Replace(' ','_') + '_3d.png'
  $url = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/' + $revision + '/assets/' + [Uri]::EscapeDataString($name) + '/3D/' + $file
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile (Join-Path $assetRoot $file)
}
Invoke-WebRequest -UseBasicParsing -Uri ('https://raw.githubusercontent.com/microsoft/fluentui-emoji/' + $revision + '/LICENSE') -OutFile (Join-Path $assetRoot 'LICENSE.txt')
Write-Output ('Imported ' + $names.Length + ' Fluent 3D images at ' + $revision)
