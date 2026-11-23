@echo off
rem ============================================================
rem 資産レビュー(portfolio)を裏で起動して、ブラウザで開く
rem
rem 使い方: このファイルをダブルクリックする(デスクトップにショートカットを置いてもよい)
rem 停止  : stop-portfolio.bat を実行する
rem
rem - サーバーはウィンドウを出さずに裏で動く。このウィンドウは起動後に自動で閉じる
rem - 本番用の形(next start)で動かす。コードが変わっていればビルドし直す
rem - すでに起動していれば、ブラウザを開くだけ
rem - 初回(node_modules がない)は npm install を実行する
rem - 設定(AI_PROVIDER など)は portfolio\.env.local から読まれる。変えたら停止して起動し直す
rem - ログは portfolio\logs\ に出る
rem
rem 環境変数(任意):
rem   PORTFOLIO_PORT=3001        使うポート(既定 3001)
rem   PORTFOLIO_NO_BROWSER=1     ブラウザを開かない
rem ============================================================
chcp 65001 >nul
setlocal
cd /d "%~dp0"
if not defined PORTFOLIO_PORT set "PORTFOLIO_PORT=3001"
set "URL=http://127.0.0.1:%PORTFOLIO_PORT%"

where node >nul 2>nul
if errorlevel 1 (
  echo [エラー] Node.js が見つかりません。https://nodejs.org/ からインストールしてください。
  pause
  exit /b 1
)

curl -s -o nul "%URL%/api/portfolio" >nul 2>nul
if not errorlevel 1 (
  echo すでに起動しています。ブラウザを開きます。
  if not defined PORTFOLIO_NO_BROWSER start "" "%URL%"
  exit /b 0
)

if not exist "node_modules\" (
  echo 初回のため、依存パッケージをインストールします...
  call npm install
  if errorlevel 1 goto :fail_install
)

rem ビルドがない、またはビルド後にコード・設定ファイルが変わっていればビルドし直す
powershell -NoProfile -Command "$b = '.next\BUILD_ID'; if (-not (Test-Path $b)) { exit 1 }; $t = (Get-Item $b).LastWriteTime; $newer = Get-ChildItem src, package.json, package-lock.json, next.config.ts, tsconfig.json -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt $t } | Select-Object -First 1; if ($newer) { exit 1 } else { exit 0 }"
if errorlevel 1 (
  echo ビルドしています(1分ほどかかります^)...
  call npm run build
  if errorlevel 1 goto :fail_build
)

if not exist "logs\" mkdir logs
echo 資産レビューを起動しています: %URL%
powershell -NoProfile -Command "Start-Process -FilePath node -ArgumentList 'node_modules\next\dist\bin\next', 'start', '-H', '127.0.0.1', '-p', '%PORTFOLIO_PORT%' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -RedirectStandardOutput 'logs\server.log' -RedirectStandardError 'logs\server-error.log'"
if errorlevel 1 goto :fail_start

rem 応答が返るまで最大 60 秒待つ
powershell -NoProfile -Command "for ($i = 0; $i -lt 60; $i++) { try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 '%URL%/api/portfolio' | Out-Null; exit 0 } catch { Start-Sleep -Seconds 1 } }; exit 1"
if errorlevel 1 goto :fail_start

echo 起動しました。止めるときは stop-portfolio.bat を実行してください。
if not defined PORTFOLIO_NO_BROWSER start "" "%URL%"
exit /b 0

:fail_install
echo [エラー] npm install に失敗しました。上のメッセージを確認してください。
pause
exit /b 1

:fail_build
echo [エラー] ビルドに失敗しました。上のメッセージを確認してください。
pause
exit /b 1

:fail_start
echo [エラー] サーバーを起動できませんでした。logs\server-error.log を確認してください。
if exist "logs\server-error.log" type "logs\server-error.log"
pause
exit /b 1
