$ErrorActionPreference = "Stop" # 오류 즉시 중단
$scriptDirectoryPath = Split-Path -Parent $MyInvocation.MyCommand.Path # 스크립트 폴더 경로
$repositoryRootPath = (Resolve-Path (Join-Path $scriptDirectoryPath "..")).Path # 저장소 루트 경로
$executablePath = Join-Path $repositoryRootPath "src-tauri\target\release\mate-text-play-preview.exe" # 실행 파일 경로

Set-Location $repositoryRootPath # 저장소 루트 이동

if ($null -eq (Get-Command cargo -ErrorAction SilentlyContinue)) # Cargo 경로 보완 확인
{ # 조건 시작
    $cargoDirectoryPath = Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)) ".cargo\bin" # Cargo 설치 폴더
    if (-not (Test-Path -LiteralPath (Join-Path $cargoDirectoryPath "cargo.exe"))) # Cargo 설치 확인
    { # 조건 시작
        throw "Cargo를 찾지 못했습니다. https://rustup.rs 에서 Rust를 설치하세요." # Cargo 누락 오류
    } # 조건 종료
    $env:Path = "$cargoDirectoryPath;$env:Path" # 현재 빌드 경로 보완
} # 조건 종료

$chatbotRepositoryPath = Join-Path $repositoryRootPath "..\ChatBot" # 옆 폴더 ChatBot 저장소 경로
if (Test-Path -LiteralPath (Join-Path $chatbotRepositoryPath ".git")) # ChatBot 저장소 확인
{ # 조건 시작
    Write-Host "[local-exe] ChatBot 새 기능 확인" # 확인 안내
    & node scripts/chatbot-status.mjs $chatbotRepositoryPath # ChatBot 새 커밋 안내(실패해도 빌드 계속)
    $global:LASTEXITCODE = 0 # 확인 결과와 빌드 결과 분리
} # 조건 종료

$runningApps = Get-Process -Name "mate-text-play-preview" -ErrorAction SilentlyContinue # 실행 중인 앱 조회
if ($null -ne $runningApps) # 실행 중 확인
{ # 조건 시작
    Write-Host "[local-exe] 실행 중인 앱 종료" # 종료 안내
    $runningApps | Stop-Process -Force # 파일 잠금 해제를 위한 종료
    Start-Sleep -Milliseconds 500 # 파일 잠금 해제 대기
} # 조건 종료

Write-Host "[local-exe] pnpm tauri build --no-bundle" # 빌드 안내
& pnpm tauri build --no-bundle # 설치 파일 없이 실행 파일만 빌드
if ($LASTEXITCODE -ne 0) # 빌드 결과 확인
{ # 조건 시작
    throw "실행 파일 빌드 실패: $LASTEXITCODE" # 빌드 실패 알림
} # 조건 종료

Write-Host "[local-exe] 실행: $executablePath" # 실행 안내
Start-Process -FilePath $executablePath # 새 실행 파일 실행
