param(
  [switch]$Stop
)

if ($Stop) {
  $jobsToStop = @('FunctionsEmulator','FirebaseCoreEmulators','FirebaseEmulators')
  $foundAny = $false
  foreach ($jn in $jobsToStop) {
    $job = Get-Job -Name $jn -ErrorAction SilentlyContinue
    if ($job) {
      $foundAny = $true
      Write-Host "Parando $jn..." -ForegroundColor Yellow
      try { Stop-Job -Job $job -ErrorAction SilentlyContinue } catch {}
      try { Receive-Job -Job $job -ErrorAction SilentlyContinue | Out-Null } catch {}
      try { Remove-Job -Job $job -ErrorAction SilentlyContinue } catch {}
      Write-Host "$jn finalizado" -ForegroundColor Green
    }
  }
  if (-not $foundAny) {
    Write-Host "Nenhum job de emuladores encontrado" -ForegroundColor Gray
  }
  exit 0
}

Write-Host "IngressosZ - Iniciando ambiente de desenvolvimento..." -ForegroundColor Cyan
$root = Get-Location

Write-Host "Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($nodeVersion -match "v(\d+)\.") {
  $majorVersion = [int]$Matches[1]
  if ($majorVersion -ge 18) {
    Write-Host "Node.js $nodeVersion" -ForegroundColor Green
  } else {
    Write-Host "Node.js 18+ necessário. Atual: $nodeVersion" -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "Node.js não encontrado" -ForegroundColor Red
  exit 1
}

Write-Host "Verificando Firebase CLI..." -ForegroundColor Yellow
try {
  $firebaseVersion = firebase --version
  Write-Host "Firebase CLI $firebaseVersion" -ForegroundColor Green
} catch {
  Write-Host "Firebase CLI não encontrado. Instale: npm install -g firebase-tools" -ForegroundColor Red
  exit 1
}

Write-Host "Verificando arquivos de configuração..." -ForegroundColor Yellow
if (-not (Test-Path 'functions/.env')) {
  Write-Host 'functions/.env não encontrado' -ForegroundColor Yellow
  if (Test-Path 'functions/.env.example') {
    Write-Host 'Copiando .env.example para .env' -ForegroundColor Cyan
    Copy-Item 'functions/.env.example' 'functions/.env'
  } else {
    Write-Host 'functions/.env.example não existe' -ForegroundColor Red
  }
} else {
  Write-Host 'functions/.env OK' -ForegroundColor Green
}

if (-not (Test-Path 'ingressosZ/.env.local')) {
  Write-Host 'ingressosZ/.env.local não encontrado' -ForegroundColor Yellow
  if (Test-Path 'ingressosZ/.env.example') {
    Write-Host 'Copiando .env.example para .env.local' -ForegroundColor Cyan
    Copy-Item 'ingressosZ/.env.example' 'ingressosZ/.env.local'
  } else {
    Write-Host '.env.local será criado quando necessário' -ForegroundColor Gray
  }
} else {
  Write-Host 'ingressosZ/.env.local OK' -ForegroundColor Green
}

Write-Host "Verificando dependências..." -ForegroundColor Yellow
if (-not (Test-Path 'functions/node_modules')) {
  Write-Host 'Instalando dependências do backend' -ForegroundColor Cyan
  Set-Location functions
  npm install
  Set-Location ..
} else {
  Write-Host 'Dependências do backend OK' -ForegroundColor Green
}

if (-not (Test-Path 'ingressosZ/node_modules')) {
  Write-Host 'Instalando dependências do frontend' -ForegroundColor Cyan
  Set-Location ingressosZ
  npm install
  Set-Location ..
} else {
  Write-Host 'Dependências do frontend OK' -ForegroundColor Green
}

Write-Host "Compilando Cloud Functions..." -ForegroundColor Yellow
Set-Location functions
$buildResult = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host 'Functions compiladas' -ForegroundColor Green
} else {
  Write-Host 'Erro ao compilar Functions' -ForegroundColor Red
  Write-Host $buildResult -ForegroundColor Red
  Set-Location ..
  exit 1
}
Set-Location ..

Write-Host 'Iniciando Emuladores (Functions + Auth/Firestore)...' -ForegroundColor Yellow
$funcJob = Get-Job -Name 'FunctionsEmulator' -ErrorAction SilentlyContinue
if (-not $funcJob) {
  Start-Job -Name 'FunctionsEmulator' -ScriptBlock {
    Set-Location "$using:root\functions"
    npm run serve
  } | Out-Null
  Write-Host 'Functions Emulator iniciado' -ForegroundColor Green
} else {
  Write-Host 'Functions Emulator já em execução' -ForegroundColor Green
}

$coreJob = Get-Job -Name 'FirebaseCoreEmulators' -ErrorAction SilentlyContinue
if (-not $coreJob) {
  Start-Job -Name 'FirebaseCoreEmulators' -ScriptBlock {
    Set-Location "$using:root"
    firebase emulators:start --config firebase.json --project ingressosz --only auth,firestore
  } | Out-Null
  Write-Host 'Auth/Firestore Emulators iniciados' -ForegroundColor Green
} else {
  Write-Host 'Auth/Firestore Emulators já em execução' -ForegroundColor Green
}
