# Convert archived Wix Thunderbolt SSR HTML into static deployable pages.
$ErrorActionPreference = "Stop"
$root = "C:\Users\angel\Documents\grayfoner-builders"
$arch = Join-Path $root "_archive\pages"
$mediaDir = Join-Path $root "media"
$legacyArch = Join-Path $root "_archive"

# Full site map: slug -> output filename
$siteMap = [ordered]@{
  "home" = "index.html"
  "new-houses" = "new-houses.html"
  "renovations" = "renovations.html"
  "patios" = "patios.html"
  "retaining-walls" = "retaining-walls.html"
  "copy-of-alton-downs" = "copy-of-alton-downs.html"
  "alton-downs" = "alton-downs.html"
  "mount-cotton" = "mount-cotton.html"
  "salisbury" = "salisbury.html"
  "garbutt" = "garbutt.html"
  "paddington" = "paddington.html"
  "coopers-plains" = "coopers-plains.html"
  "flagstone" = "flagstone.html"
  "greenbank" = "greenbank.html"
  "greenbank-1" = "greenbank-1.html"
  "jimboomba" = "jimboomba.html"
  "spring-mountain" = "spring-mountain.html"
  "copy-of-garbutt" = "copy-of-garbutt.html"
  "copy-of-greenbank" = "copy-of-greenbank.html"
}

$titles = @{
  "home" = "HOME | Grayfoner"
  "new-houses" = "New Homes | Grayfoner"
  "renovations" = "Extensions & Renovations | Grayfoner"
  "patios" = "Patios & Decks | Grayfoner"
  "retaining-walls" = "Retaining & Exterior | Grayfoner"
  "copy-of-alton-downs" = "Stables / Arena Roof | Grayfoner"
  "alton-downs" = "Alton Downs | Grayfoner"
  "mount-cotton" = "Mount Cotton | Grayfoner"
  "salisbury" = "Salisbury | Grayfoner"
  "garbutt" = "Garbutt - Extension | Grayfoner"
  "paddington" = "Paddington - Renovation | Grayfoner"
  "coopers-plains" = "Coopers Plains outdoor area | Grayfoner"
  "flagstone" = "Flagstone deck | Grayfoner"
  "greenbank" = "Greenbank patio | Grayfoner"
  "greenbank-1" = "Greenbank Sand Stone Retaining | Grayfoner"
  "jimboomba" = "Jimboomba patio | Grayfoner"
  "spring-mountain" = "Spring Mountain deck | Grayfoner"
  "copy-of-garbutt" = "Grayfoner"
  "copy-of-greenbank" = "Grayfoner"
}

function Get-MediaFiles {
  $map = @{}
  if (Test-Path $mediaDir) {
    Get-ChildItem $mediaDir -File | ForEach-Object { $map[$_.Name] = $true }
  }
  return $map
}

function Convert-WixPage {
  param(
    [string]$SourcePath,
    [string]$DestPath,
    [string]$PageTitle
  )

  $html = [System.IO.File]::ReadAllText($SourcePath)
  $mediaFiles = Get-MediaFiles

  # Remove scripts
  $html = [regex]::Replace($html, '(?is)<script\b[^>]*>.*?</script>', '')
  $html = [regex]::Replace($html, '(?is)<script\b[^>]*/>', '')
  $html = [regex]::Replace($html, '(?is)<!-- BEGIN WAYBACK TOOLBAR INSERT -->.*?<!-- END WAYBACK TOOLBAR INSERT -->', '')

  # Fix broken prior rewrites if any
  $html = $html.Replace('index.html/', '/')
  $html = $html.Replace('https:https://', 'https://')
  $html = $html.Replace('http:https://', 'https://')

  # Rewrite full domain URLs to local files (order matters: longer paths first)
  $slugs = $siteMap.Keys | Where-Object { $_ -ne 'home' } | Sort-Object { -$_.Length }
  foreach ($slug in $slugs) {
    $dest = $siteMap[$slug]
    $html = $html.Replace("https://www.grayfonerbuilders.com.au/$slug", $dest)
    $html = $html.Replace("https://grayfonerbuilders.com.au/$slug", $dest)
    $html = $html.Replace("http://www.grayfonerbuilders.com.au/$slug", $dest)
    $html = $html.Replace("http://grayfonerbuilders.com.au/$slug", $dest)
    $html = $html.Replace("href=`"/$slug`"", "href=`"$dest`"")
    $html = $html.Replace("href=`"/$slug/`"", "href=`"$dest`"")
  }

  # Home root
  $html = $html.Replace('https://www.grayfonerbuilders.com.au/', 'index.html')
  $html = $html.Replace('https://www.grayfonerbuilders.com.au"', 'index.html"')
  $html = $html.Replace("https://www.grayfonerbuilders.com.au'", "index.html'")
  $html = $html.Replace('https://grayfonerbuilders.com.au/', 'index.html')
  $html = $html.Replace('href="/"', 'href="index.html"')

  # Localize media when present
  foreach ($name in @($mediaFiles.Keys)) {
    $esc = [regex]::Escape($name)
    $html = [regex]::Replace($html, "https://static\.wixstatic\.com/media/$esc[^`"'\s\)]*", "media/$name")
    $html = [regex]::Replace($html, "//static\.wixstatic\.com/media/$esc[^`"'\s\)]*", "media/$name")
  }

  # Protocol-relative fonts/CDN
  $html = $html.Replace("'//static.parastorage.com", "'https://static.parastorage.com")
  $html = $html.Replace('"//static.parastorage.com', '"https://static.parastorage.com')
  $html = $html.Replace('url(//static.parastorage.com', 'url(https://static.parastorage.com')
  $html = $html.Replace("'//static.wixstatic.com", "'https://static.wixstatic.com")
  $html = $html.Replace('"//static.wixstatic.com', '"https://static.wixstatic.com')

  # Remove parastorage module links that 404 offline
  $html = [regex]::Replace($html, '(?i)<link[^>]+parastorage\.com[^>]*>', '')

  $inject = @'
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Raleway:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style id="static-snapshot-fixes">
  body, .font_7, .font_8, .font_9, .font_10 {
    font-family: Raleway, Helvetica, Arial, sans-serif;
  }
  html, body { margin: 0; padding: 0; background: #f2f2f2; }
  #SITE_CONTAINER { min-height: 100vh; }
  .SKIP_TO_CONTENT_BTN { position: absolute; left: -9999px; }
  img { max-width: 100%; }
  html { scroll-behavior: smooth; }
</style>
'@
  if ($html -match '</head>') {
    $html = $html -replace '</head>', ($inject + '</head>')
  }

  if ($PageTitle) {
    $html = [regex]::Replace($html, '<title>[^<]*</title>', "<title>$PageTitle</title>")
  }

  # Nav smooth scroll
  $navJs = @'
<script>
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('a[href*="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var href = a.getAttribute("href") || "";
      var id = href.indexOf("#") >= 0 ? href.split("#")[1] : "";
      if (!id) return;
      var el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        try { history.replaceState(null, "", "#" + id); } catch (err) {}
      }
    });
  });
});
</script>
'@
  if ($html -match '</body>') {
    $html = $html.Replace('</body>', $navJs + '</body>')
  }

  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($DestPath, $html, $utf8NoBom)
  $kb = [math]::Round((Get-Item $DestPath).Length / 1KB)
  Write-Host "Wrote $DestPath ($kb KB)"
}

# Prefer _archive/pages, fall back to _archive root for known files
foreach ($slug in $siteMap.Keys) {
  $src = Join-Path $arch "$slug.html"
  if (-not (Test-Path $src)) {
    # legacy locations
    if ($slug -eq 'home') {
      $src = Join-Path $legacyArch "home.html"
    } else {
      $src = Join-Path $legacyArch "$slug.html"
    }
  }
  if (-not (Test-Path $src) -or (Get-Item $src).Length -lt 10000) {
    Write-Warning "Missing/small source for $slug"
    continue
  }
  $dest = Join-Path $root $siteMap[$slug]
  $title = $titles[$slug]
  Convert-WixPage -SourcePath $src -DestPath $dest -PageTitle $title
}

# Fix menu anchors on index.html
$indexPath = Join-Path $root "index.html"
if (Test-Path $indexPath) {
  $html = [System.IO.File]::ReadAllText($indexPath)
  $html = $html.Replace(
    'id="comp-ihm8jbpc0label">HOME</p>',
    'id="comp-ihm8jbpc0label">HOME</p>'
  )
  # Force correct menu targets by label context
  $pairs = @(
    @('comp-ihm8jbpc0label">HOME', 'index.html'),
    @('comp-ihm8jbpc1label">ABOUT', 'index.html#about'),
    @('comp-ihm8jbpc2label">SERVICES', 'index.html#services'),
    @('comp-ihm8jbpc3label">PORTFOLIO', 'index.html#portfolio'),
    @('comp-ihm8jbpc4label">TESTIMONIALS', 'index.html#testimonials'),
    @('comp-ihm8jbpc5label">CONTACT', 'index.html#contact')
  )
  foreach ($pair in $pairs) {
    $label = $pair[0]
    $target = $pair[1]
    $idx = $html.IndexOf($label)
    if ($idx -lt 0) { continue }
    # search backwards for href=
    $sliceStart = [Math]::Max(0, $idx - 300)
    $slice = $html.Substring($sliceStart, $idx - $sliceStart)
    if ($slice -match 'href="[^"]*"') {
      $oldHref = $Matches[0]
      $newSlice = $slice.Replace($oldHref, "href=`"$target`"")
      $html = $html.Substring(0, $sliceStart) + $newSlice + $html.Substring($idx)
    }
  }
  [System.IO.File]::WriteAllText($indexPath, $html, (New-Object System.Text.UTF8Encoding $false))
  Write-Host "Fixed menu anchors on index.html"
}

Write-Host "Done converting all pages."
