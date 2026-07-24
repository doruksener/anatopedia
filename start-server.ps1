$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Get-FreePort {
    param([int]$Start = 8080, [int]$End = 8090)
    for ($port = $Start; $port -le $End; $port++) {
        $probe = $null
        try {
            $probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
            $probe.Start()
            $probe.Stop()
            return $port
        } catch {
            if ($probe) { try { $probe.Stop() } catch {} }
        }
    }
    throw "8080-8090 aralığında boş port bulunamadı."
}

$Port = Get-FreePort
$Address = [System.Net.IPAddress]::Loopback
$Listener = [System.Net.Sockets.TcpListener]::new($Address, $Port)
$Listener.Start()
$Url = "http://127.0.0.1:$Port/"

$MimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.htm' = 'text/html; charset=utf-8'
    '.js' = 'text/javascript; charset=utf-8'
    '.mjs' = 'text/javascript; charset=utf-8'
    '.css' = 'text/css; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.webmanifest' = 'application/manifest+json; charset=utf-8'
    '.svg' = 'image/svg+xml'
    '.png' = 'image/png'
    '.jpg' = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.webp' = 'image/webp'
    '.ico' = 'image/x-icon'
    '.txt' = 'text/plain; charset=utf-8'
    '.md' = 'text/markdown; charset=utf-8'
    '.stl' = 'model/stl'
    '.glb' = 'model/gltf-binary'
    '.gltf' = 'model/gltf+json'
}

function Send-Response {
    param(
        [System.Net.Sockets.NetworkStream]$Stream,
        [int]$StatusCode,
        [string]$StatusText,
        [byte[]]$Body,
        [string]$ContentType = 'text/plain; charset=utf-8',
        [bool]$HeadOnly = $false
    )
    $Header = "HTTP/1.1 $StatusCode $StatusText`r`n" +
              "Content-Type: $ContentType`r`n" +
              "Content-Length: $($Body.Length)`r`n" +
              "Cache-Control: no-cache`r`n" +
              "X-Content-Type-Options: nosniff`r`n" +
              "Connection: close`r`n`r`n"
    $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($Header)
    $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
    if (-not $HeadOnly -and $Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }
    $Stream.Flush()
}

Write-Host ''
Write-Host '==============================================' -ForegroundColor DarkCyan
Write-Host ' Anatopedia başlatıldı' -ForegroundColor Cyan
Write-Host " Adres: $Url" -ForegroundColor White
Write-Host ' Bu pencere açık kalmalı.' -ForegroundColor Yellow
Write-Host ' Kapatmak için Ctrl+C veya pencereyi kapat.' -ForegroundColor Yellow
Write-Host ' İlk 3D model yüklemesi internet gerektirir.' -ForegroundColor Yellow
Write-Host '==============================================' -ForegroundColor DarkCyan
Write-Host ''

Start-Process $Url

try {
    while ($true) {
        $Client = $Listener.AcceptTcpClient()
        try {
            $Stream = $Client.GetStream()
            $Reader = [System.IO.StreamReader]::new($Stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
            $RequestLine = $Reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($RequestLine)) {
                $Client.Close()
                continue
            }

            while ($true) {
                $Line = $Reader.ReadLine()
                if ([string]::IsNullOrEmpty($Line)) { break }
            }

            $Parts = $RequestLine.Split(' ')
            if ($Parts.Length -lt 2) {
                $Body = [System.Text.Encoding]::UTF8.GetBytes('Bad Request')
                Send-Response $Stream 400 'Bad Request' $Body
                continue
            }

            $Method = $Parts[0].ToUpperInvariant()
            $RawPath = $Parts[1].Split('?')[0]
            $DecodedPath = [System.Uri]::UnescapeDataString($RawPath).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            if ($DecodedPath -eq [System.IO.Path]::DirectorySeparatorChar) { $DecodedPath = 'index.html' }
            $DecodedPath = $DecodedPath.TrimStart([char[]]@('/', '\'))

            $Candidate = [System.IO.Path]::GetFullPath((Join-Path $Root $DecodedPath))
            $RootFull = [System.IO.Path]::GetFullPath($Root + [System.IO.Path]::DirectorySeparatorChar)

            if (-not $Candidate.StartsWith($RootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
                $Body = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
                Send-Response $Stream 403 'Forbidden' $Body
                continue
            }

            if ((Test-Path $Candidate -PathType Container)) {
                $Candidate = Join-Path $Candidate 'index.html'
            }

            if (-not (Test-Path $Candidate -PathType Leaf)) {
                $Body = [System.Text.Encoding]::UTF8.GetBytes('404 - Dosya bulunamadı')
                Send-Response $Stream 404 'Not Found' $Body
                continue
            }

            if ($Method -ne 'GET' -and $Method -ne 'HEAD') {
                $Body = [System.Text.Encoding]::UTF8.GetBytes('Method Not Allowed')
                Send-Response $Stream 405 'Method Not Allowed' $Body
                continue
            }

            $Bytes = [System.IO.File]::ReadAllBytes($Candidate)
            $Ext = [System.IO.Path]::GetExtension($Candidate).ToLowerInvariant()
            $ContentType = if ($MimeTypes.ContainsKey($Ext)) { $MimeTypes[$Ext] } else { 'application/octet-stream' }
            Send-Response $Stream 200 'OK' $Bytes $ContentType ($Method -eq 'HEAD')
        } catch {
            try {
                Write-Host "Sunucu hatası: $($_.Exception.Message)" -ForegroundColor Red
                $Body = [System.Text.Encoding]::UTF8.GetBytes("Internal Server Error")
                Send-Response $Stream 500 'Internal Server Error' $Body
            } catch {}
        } finally {
            if ($Reader) { $Reader.Dispose() }
            if ($Stream) { $Stream.Dispose() }
            $Client.Close()
        }
    }
} finally {
    $Listener.Stop()
}
