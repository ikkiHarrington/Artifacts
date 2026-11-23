@echo off
rem ============================================================
rem 資産レビュー(portfolio)を起動して、ブラウザで開く
rem
rem 使い方: このファイルをダブルクリックする(デスクトップにショートカットを置いてもよい)
rem 終了  : このウィンドウで Ctrl+C を押すか、ウィンドウを閉じる
rem
rem - すでに起動していれば、ブラウザを開くだけ
rem - 初回(node_modules がない)は npm install を実行する
rem - 設定(AI_PROVIDER など)は portfolio\.env.local から読まれる
rem - 環境変数 PORTFOLIO_NO_BROWSER=1 のときはブラウザを開かない
rem ============================================================
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "URL=http://127.0.0.1:3001"

where npm >nul 2>nul
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
  if errorlevel 1 (
    echo [エラー] npm install に失敗しました。
    pause
    exit /b 1
  )
)

rem サーバーの準備ができたらブラウザを開く(最大 60 秒待つ)
if not defined PORTFOLIO_NO_BROWSER (
  start "" /b powershell -NoProfile -Command "for ($i = 0; $i -lt 60; $i++) { try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 '%URL%/api/portfolio' | Out-Null; Start-Process '%URL%'; break } catch { Start-Sleep -Seconds 1 } }"
)

echo 資産レビューを起動しています: %URL%
echo 終了するには、このウィンドウで Ctrl+C を押してください。
call npm run dev
if errorlevel 1 (
  echo [エラー] サーバーが異常終了しました。上のメッセージを確認してください。
  pause
  exit /b 1
)
