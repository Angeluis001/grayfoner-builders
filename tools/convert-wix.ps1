# Convert archived Wix Thunderbolt SSR HTML into static deployable pages.
$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
# Script is in tools/ under project
$root = "C:\Users\angel\Documents\grayfoner-builders"
$arch = Join-Path $root "_archive"
$mediaDir = Join-Path $root "media"

function Convert-WixPage {
  param(
    [string]$SourcePath,
    [string]$DestPath,
    [string]$PageTitle
  )

  $html = [System.IO.File]::ReadAllText($SourcePath)

  # Remove all scripts (Wix runtime not needed for SSR snapshot)
  $html = [regex]::Replace($html, '(?is)<script\b[^>]*>.*?</script>', '')
  $html = [regex]::Replace($html, '(?is)<script\b[^>]*/>', '')

  # Remove noscript tracking-ish blocks we don't need? keep structure
  # Remove Wayback if any slipped in
  $html = [regex]::Replace($html, '(?is)<!-- BEGIN WAYBACK TOOLBAR INSERT -->.*?<!-- END WAYBACK TOOLBAR INSERT -->', '')

  # Rewrite site links to local static pages
  $linkMap = @{
    'https://www.grayfonerbuilders.com.au/' = 'index.html'
    'https://www.grayfonerbuilders.com.au' = 'index.html'
    'https://www.grayfonerbuilders.com.au/new-houses' = 'new-houses.html'
    'https://www.grayfonerbuilders.com.au/renovations' = 'renovations.html'
    'https://www.grayfonerbuilders.com.au/patios' = 'patios.html'
    'https://www.grayfonerbuilders.com.au/retaining-walls' = 'retaining-walls.html'
    'https://www.grayfonerbuilders.com.au/copy-of-alton-downs' = 'copy-of-alton-downs.html'
    'http://www.grayfonerbuilders.com.au/' = 'index.html'
    'http://www.grayfonerbuilders.com.au' = 'index.html'
  }
  foreach ($k in $linkMap.Keys) {
    $html = $html.Replace($k, $linkMap[$k])
  }
  # Anchor-style home links sometimes path only
  $html = $html -replace 'href="/"', 'href="index.html"'
  $html = $html -replace 'href="/new-houses"', 'href="new-houses.html"'
  $html = $html -replace 'href="/renovations"', 'href="renovations.html"'
  $html = $html -replace 'href="/patios"', 'href="patios.html"'
  $html = $html -replace 'href="/retaining-walls"', 'href="retaining-walls.html"'
  $html = $html -replace 'href="/copy-of-alton-downs"', 'href="copy-of-alton-downs.html"'

  # Map wixstatic media to local media/ when file exists
  $mediaFiles = @{}
  if (Test-Path $mediaDir) {
    Get-ChildItem $mediaDir -File | ForEach-Object { $mediaFiles[$_.Name] = $true }
  }

  # Rewrite full wixstatic URLs that include /media/FILENAME...
  $html = [regex]::Replace($html, 'https://static\.wixstatic\.com/media/([^"''\s\)]+)', {
    param($m)
    $path = $m.Groups[1].Value
    # extract base filename before /v1/
    $base = $path
    if ($path -match '^([^/]+)') { $base = $Matches[1] }
    # strip query-like nothing; base may include ~mv2.jpg
    if ($mediaFiles.ContainsKey($base)) {
      return "media/$base"
    }
    # keep original CDN as fallback
    return $m.Value
  })

  # Also handle protocol-relative //static.wixstatic.com
  $html = [regex]::Replace($html, '//static\.wixstatic\.com/media/([^"''\s\)]+)', {
    param($m)
    $path = $m.Groups[1].Value
    $base = $path
    if ($path -match '^([^/]+)') { $base = $Matches[1] }
    if ($mediaFiles.ContainsKey($base)) {
      return "media/$base"
    }
    return "https://static.wixstatic.com/media/$path"
  })

  # Inject Google Fonts fallback for Wix proprietary fonts + static snapshot fixes
  $inject = @'
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Raleway:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style id="static-snapshot-fixes">
  /* Map Wix proprietary fonts to free equivalents */
  [style*="didot"], .font_0, .font_1, .font_2 {
    font-family: "Playfair Display", Didot, "Times New Roman", serif !important;
  }
  body, .font_7, .font_8, .font_9, .font_10 {
    font-family: Raleway, Helvetica, Arial, sans-serif;
  }
  /* Ensure snapshot is visible without Wix JS hydration */
  html, body {
    margin: 0;
    padding: 0;
    background: #f2f2f2;
  }
  #SITE_CONTAINER {
    min-height: 100vh;
  }
  /* Hide Wix accessibility skip noise sometimes left in DOM */
  .SKIP_TO_CONTENT_BTN { position: absolute; left: -9999px; }
  /* Make gallery images fill their frames when local */
  img {
    max-width: 100%;
  }
  /* Smooth anchor scroll for menu */
  html { scroll-behavior: smooth; }
</style>
'@

  if ($html -match '</head>') {
    $html = $html -replace '</head>', ($inject + '</head>')
  }

  # Ensure title
  if ($PageTitle) {
    $html = [regex]::Replace($html, '<title>[^<]*</title>', "<title>$PageTitle</title>")
  }

  # Remove problematic modulepreload / link to missing wix assets that 404
  $html = [regex]::Replace($html, '(?i)<link[^>]+parastorage\.com[^>]*>', '')
  $html = [regex]::Replace($html, '(?i)<link[^>]+wixstatic\.com/[^>]*\.css[^>]*>', {
    param($m)
    # keep wixstatic css if any - rare
    return $m.Value
  })

  # Write UTF8
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($DestPath, $html, $utf8NoBom)
  Write-Host "Wrote $DestPath ($([math]::Round((Get-Item $DestPath).Length/1KB)) KB)"
}

$map = @{
  "home.html" = @{ dest = "index.html"; title = "HOME | Grayfoner" }
  "new-houses.html" = @{ dest = "new-houses.html"; title = "New Homes | Grayfoner" }
  "renovations.html" = @{ dest = "renovations.html"; title = "Extensions & Renovations | Grayfoner" }
  "patios.html" = @{ dest = "patios.html"; title = "Patios & Decks | Grayfoner" }
  "retaining-walls.html" = @{ dest = "retaining-walls.html"; title = "Retaining & Exterior | Grayfoner" }
  "copy-of-alton-downs.html" = @{ dest = "copy-of-alton-downs.html"; title = "Stables / Arena Roof | Grayfoner" }
}

foreach ($src in $map.Keys) {
  $srcPath = Join-Path $arch $src
  if (-not (Test-Path $srcPath)) {
    Write-Warning "Missing $srcPath"
    continue
  }
  $destPath = Join-Path $root $map[$src].dest
  Convert-WixPage -SourcePath $srcPath -DestPath $destPath -PageTitle $map[$src].title
}

Write-Host "Done."
