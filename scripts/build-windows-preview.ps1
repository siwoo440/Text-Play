$ErrorActionPreference = "Stop" # 오류 즉시 중단
$scriptDirectoryPath = Split-Path -Parent $MyInvocation.MyCommand.Path # 스크립트 폴더 경로
$repositoryRootPath = (Resolve-Path (Join-Path $scriptDirectoryPath "..")).Path # 저장소 루트 경로
$currentDirectoryPath = (Resolve-Path ".").Path # 현재 실행 경로

if ($currentDirectoryPath -ne $repositoryRootPath) # 저장소 루트 확인
{ # 조건 시작
    throw "저장소 루트에서 scripts/build-windows-preview.ps1을 실행해야 합니다." # 실행 위치 오류
} # 조건 종료

$cargoCommand = Get-Command cargo -ErrorAction SilentlyContinue # Cargo 명령 조회

if ($null -eq $cargoCommand) # Cargo 경로 보완 확인
{ # 조건 시작
    $userProfilePath = [Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile) # 사용자 폴더 경로
    $cargoDirectoryPath = Join-Path $userProfilePath ".cargo\bin" # Cargo 설치 폴더
    $cargoExecutablePath = Join-Path $cargoDirectoryPath "cargo.exe" # Cargo 실행 파일 경로

    if (-not (Test-Path -LiteralPath $cargoExecutablePath)) # Cargo 설치 확인
    { # 조건 시작
        throw "Cargo를 찾지 못했습니다: $cargoExecutablePath" # Cargo 누락 오류
    } # 조건 종료

    $env:Path = "$cargoDirectoryPath;$env:Path" # 현재 빌드 경로 보완
} # 조건 종료

function Invoke-PnpmStep # pnpm 단계 실행 함수
{ # 함수 시작
    param # 매개변수 시작
    ( # 매개변수 묶음 시작
        [Parameter(Mandatory = $true)] # 필수 값 표시
        [string]$ScriptName # 스크립트 이름
    ) # 매개변수 묶음 종료

    Write-Host "[windows-preview] pnpm $ScriptName" # 실행 단계 출력
    & pnpm $ScriptName # pnpm 스크립트 실행

    if ($LASTEXITCODE -ne 0) # 실행 결과 확인
    { # 조건 시작
        throw "pnpm $ScriptName 단계 실패: $LASTEXITCODE" # 실패 알림
    } # 조건 종료
} # 함수 종료

# pnpm test:run 전체 테스트
Invoke-PnpmStep -ScriptName "test:run" # 전체 테스트 실행
Invoke-PnpmStep -ScriptName "typecheck" # 타입 검사 실행
Invoke-PnpmStep -ScriptName "lint" # 린트 실행
Invoke-PnpmStep -ScriptName "build" # 웹 빌드 실행
Invoke-PnpmStep -ScriptName "desktop:build" # 데스크톱 번들 실행
Invoke-PnpmStep -ScriptName "desktop:verify-assets" # 오프라인 자산 검사
# pnpm test:e2e:desktop 데스크톱 사용자 흐름
Invoke-PnpmStep -ScriptName "test:e2e:desktop" # 데스크톱 E2E 실행
Invoke-PnpmStep -ScriptName "tauri:check" # Rust 검사 실행
# pnpm tauri:build Windows NSIS 빌드
Invoke-PnpmStep -ScriptName "tauri:build" # 설치 파일 빌드

Write-Host "[windows-preview] node scripts/finalize-windows-preview.mjs" # 후처리 단계 출력
& node "scripts/finalize-windows-preview.mjs" # 설치 파일 후처리

if ($LASTEXITCODE -ne 0) # 후처리 결과 확인
{ # 조건 시작
    throw "Windows 설치 파일 후처리 실패: $LASTEXITCODE" # 후처리 실패 알림
} # 조건 종료
