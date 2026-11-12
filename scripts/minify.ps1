param(
  [Parameter(Mandatory=$true)]
  [string]$EsbuildPath
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$version = & $EsbuildPath --version
if ($LASTEXITCODE -ne 0 -or $version -ne '0.28.2') { throw 'esbuild 0.28.2 is required' }
& $EsbuildPath (Join-Path $root 'app.js') --minify-whitespace --charset=utf8 --target=es2020 "--outfile=$(Join-Path $root 'app.min.js')"
if ($LASTEXITCODE -ne 0) { throw "esbuild failed with exit code $LASTEXITCODE" }
