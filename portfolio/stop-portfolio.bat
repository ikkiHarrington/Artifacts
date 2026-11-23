@echo off
rem ============================================================
rem 裏で動いている資産レビュー(portfolio)のサーバーを止める
rem
rem 使い方: このファイルをダブルクリックする
rem - ポートで待ち受けている node のプロセスだけを止める(ほかのプログラムは止めない)
rem - 環境変数 PORTFOLIO_PORT でポートを指定できる(既定 3001)
rem - 環境変数 PORTFOLIO_NO_PAUSE=1 なら最後に一時停止しない
rem ============================================================
chcp 65001 >nul
setlocal
if not defined PORTFOLIO_PORT set "PORTFOLIO_PORT=3001"

powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort %PORTFOLIO_PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if (-not $c) { Write-Output '資産レビューは動いていません。'; exit 0 }; $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue; if (-not $p -or $p.ProcessName -ne 'node') { Write-Output ('ポート %PORTFOLIO_PORT% はほかのプログラム(' + $p.ProcessName + ')が使っているため、止めませんでした。'); exit 1 }; Stop-Process -Id $p.Id -Force; Write-Output '資産レビューを停止しました。'"
set "RESULT=%ERRORLEVEL%"

if not defined PORTFOLIO_NO_PAUSE pause
exit /b %RESULT%
