$root = $PSScriptRoot
$port = 8080
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$port (Ctrl+C to stop)"

$mimes = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.svg'  = 'image/svg+xml'
  '.json' = 'application/json; charset=utf-8'
  '.ico'  = 'image/x-icon'
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
    $path = Join-Path $root $rel
    $resp = $ctx.Response
    $resp.Headers.Add('Cache-Control', 'no-store')
    if ((Test-Path $path -PathType Leaf)) {
      try {
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $ext = [System.IO.Path]::GetExtension($path).ToLower()
        $mime = $mimes[$ext]
        if (-not $mime) { $mime = 'application/octet-stream' }
        $resp.ContentType = $mime
        $resp.ContentLength64 = $bytes.Length
        $resp.OutputStream.Write($bytes, 0, $bytes.Length)
        Write-Host "200 $rel"
      } catch {
        $resp.StatusCode = 500
        Write-Host "500 $rel - $_"
      }
    } else {
      $resp.StatusCode = 404
      Write-Host "404 $rel"
    }
    $resp.OutputStream.Close()
  }
} finally {
  $listener.Stop()
}
