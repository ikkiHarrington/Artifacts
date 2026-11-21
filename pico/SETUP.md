# 環境構築の作業記録(2026-11-22)

Claude Code が、この PC(Windows 11)に Pico の開発環境を入れたときの記録。何をどこに入れたか、途中で何を間違えてどう直したか、元に戻す方法をまとめる。

## 方針

- VS Code の公式拡張「Raspberry Pi Pico」を使う。ツール類はこの拡張と同じフォルダ構成で `%USERPROFILE%\.pico-sdk` に置き、システムの PATH は変えない。
- 本来は、拡張の GUI で「Import Pico Project」を実行すると、拡張がツールをダウンロードする。今回は Claude Code が GUI を操作できないため、拡張が使う URL とフォルダ構成を拡張の中身(`data/0.22.0/versionBundles.json`、`supportedToolchains.ini`、`github-cache.json`、`dist/extension.js`)から調べ、同じものを手作業で入れた。
- バージョンは、拡張が持つ最新の組み合わせ(SDK 2.3.1 のバンドル)に合わせた。

## 1. VS Code 拡張のインストール

`code --install-extension raspberry-pi.raspberry-pi-pico` を実行した。依存する拡張も一緒に入った。

| 拡張 | バージョン | 役割 |
|---|---|---|
| raspberry-pi.raspberry-pi-pico | 0.23.0 | 本体 |
| marus25.cortex-debug | 1.12.1 | Arm マイコンのデバッグ(F5) |
| mcu-debug.peripheral-viewer | 1.6.5 | ペリフェラルのレジスタ表示(XPERIPHERALS) |
| mcu-debug.memory-view | 0.0.29 | メモリの表示 |
| mcu-debug.rtos-views | 0.0.18 | RTOS の表示 |
| mcu-debug.debug-tracker-vscode | 0.0.15 | 上記の拡張が使う共通部品 |
| paulober.pico-w-go | 4.6.1 | MicroPython 用 |

## 2. ツールのダウンロードと配置

合計で約 1.6GB(ツールチェーン 1.1GB、SDK 422MB、残りは 30MB ほど)。

| ツール | バージョン | 置き場所(`%USERPROFILE%\.pico-sdk\` 以下) | 入手元 |
|---|---|---|---|
| pico-sdk | 2.3.1 | `sdk\2.3.1` | `git clone --depth 1 --branch 2.3.1 https://github.com/raspberrypi/pico-sdk.git`、続けて `git submodule update --init --depth 1`(TinyUSB、lwIP、btstack、cyw43-driver、mbedtls) |
| Arm GNU Toolchain | 15.2.Rel1 | `toolchain\15_2_Rel1` | armkeil.blob.core.windows.net の `arm-gnu-toolchain-15.2.rel1-mingw-w64-x86_64-arm-none-eabi.zip` |
| Ninja | 1.13.2 | `ninja\v1.13.2` | github.com/ninja-build/ninja の `ninja-win.zip` |
| picotool | 2.3.1 | `picotool\2.3.1` | github.com/raspberrypi/pico-sdk-tools(v2.3.1-0)の `picotool-2.3.1-x64-win.zip` |
| pioasm | 2.3.1 | `tools\2.3.1` | 同じリリースの `pico-sdk-tools-2.3.1-x64-win.zip` |
| OpenOCD | 0.12.0+dev | `openocd\0.12.0+dev` | 同じリリースの `openocd-0.12.0+dev-x64-win.zip` |
| pico-vscode.cmake | — | `cmake\pico-vscode.cmake` | 拡張の `scripts/` からコピー |

CMake は新しく入れず、もともと入っていた `C:\Program Files\CMake`(3.30.2)を使っている。

各ツールが起動することを確認した:`arm-none-eabi-gcc` 15.2.1、OpenOCD 0.12.0+dev、Ninja 1.13.2。

## 3. プロジェクト `pico/01-blink` の作成

拡張がプロジェクト生成に使うスクリプト(拡張の `scripts/pico_project.py`)で雛形を作った。指定した主な設定は、ボード `pico`、デバッガ `DebugProbe (CMSIS-DAP)`、stdio を UART と USB の両方に出す、の 3 つ。生成後に次の点を変えた。

- `main.c`:Hello world を、オンボード LED の点滅と `count=… led=on/off` の出力に書き換えた。
- `CMakeLists.txt`:既定のビルドを Debug(`-Og -g`)にした。SDK の既定は Release で、デバッガで変数が「optimized out」になり、練習課題ができないため。拡張が管理する「DO NOT EDIT」のブロックには触れていない。
- `.vscode/tasks.json`:ninja のパスが `ninja.exe.exe` になっていたのを直した(下の「間違えたこと」の 2)。

CMake + Ninja でビルドが通り、`build/blink.uf2` ができることを確認した(Debug ビルドで text 39KB)。

## 間違えたことと、その対処

1. **一部のツールを違う場所に展開した**
   - 原因:zip の展開に PowerShell の `Expand-Archive` を使い、展開先を Git Bash 形式のパス(`/c/Users/ikki/...`)で渡した。PowerShell がこれを `C:\c\Users\ikki\...` と解釈した。
   - 影響:Ninja、picotool、pioasm、OpenOCD が `C:\c\Users\ikki\.pico-sdk` に展開された。
   - 対処:Ninja、picotool、pioasm は正しい場所に移した。OpenOCD は Git Bash の `unzip` で正しい場所に展開し直した。
   - 後始末:空になった `C:\c` は、Claude Code からの削除がブロックされたため手動で削除した(作業後に、無くなっていることを確認済み)。
2. **ツールチェーンの配置を間違えた**
   - 原因:zip に最上位フォルダがあると思い込み、`bin` フォルダを探して 1 つ上を配置した。実際の zip には最上位フォルダがなく、内側の `arm-none-eabi/` を拾ってしまった。
   - 対処:`unzip` で `toolchain\15_2_Rel1` に直接展開し直した。
3. **`tasks.json` の `ninja.exe.exe`**
   - 原因:ジェネレーターに `.exe` 付きの ninja のパスを渡したところ、ジェネレーターが Windows 用にさらに `.exe` を付けた。
   - 対処:手で直した。

## まだ確認していないこと

- 実機(Pico H + Debug Probe)への書き込み、デバッグ(F5)、シリアル出力。
- VS Code の拡張が、手作業で入れたツールをそのまま認識するか(フォルダ構成とバージョンは合わせてある)。認識しなかった場合は、拡張が足りないものをダウンロードし直すはず。

## 元に戻す方法

- ツール:`%USERPROFILE%\.pico-sdk` フォルダを削除する。
- 拡張:VS Code の拡張画面で上の表の拡張をアンインストールする。
- 作業用にダウンロードした zip は Claude Code の一時フォルダにあり、自動で消える。
