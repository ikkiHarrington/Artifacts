# Raspberry Pi Pico で組み込みを学ぶ

Raspberry Pi Pico H(RP2040)と Raspberry Pi Debug Probe を使い、C/C++ SDK(pico-sdk)で組み込みを学ぶための作業場所。

## 手元の機材

- Raspberry Pi Pico H ×2(ピンヘッダ付き。無線なし)
- Raspberry Pi Debug Probe(SWD デバッガ + UART ブリッジ)
- ブレッドボード ×2、ジャンパーワイヤ、タクトスイッチ ×2
- USB ケーブル(A - microB)×2

## 開発環境(Windows)

VS Code の拡張「Raspberry Pi Pico」(`raspberry-pi.raspberry-pi-pico`)を使う。CMake 以外のツールは `%USERPROFILE%\.pico-sdk` に入り、システムの PATH は変更しない。CMake は、システムに入っているもの(`C:/Program Files/CMake`、3.30)を各プロジェクトの `.vscode/settings.json` で指定している。

各プロジェクトは、既定で Debug ビルド(`-Og -g`)になるよう `CMakeLists.txt` で設定している(SDK の既定は Release)。デバッガで変数を追いやすくするため。

| ツール | バージョン | 置き場所 |
|---|---|---|
| pico-sdk | 2.3.1 | `.pico-sdk/sdk/2.3.1` |
| Arm GNU Toolchain | 15.2.Rel1 | `.pico-sdk/toolchain/15_2_Rel1` |
| Ninja | 1.13.2 | `.pico-sdk/ninja/v1.13.2` |
| picotool / pioasm | 2.3.1 | `.pico-sdk/picotool/2.3.1`、`.pico-sdk/tools/2.3.1` |
| OpenOCD | 0.12.0+dev | `.pico-sdk/openocd/0.12.0+dev` |

この PC で実際に行った作業(入れたもの、間違えたことと対処、元に戻す方法)は [SETUP.md](SETUP.md) にまとめてある。

### 新しい PC で用意するとき

1. VS Code に拡張「Raspberry Pi Pico」を入れる。
2. 左のサイドバーの Pico アイコンから **Import Pico Project** を選び、`pico/01-blink` などのフォルダを指定する。足りないツールは拡張がダウンロードする。

### ビルドと書き込み

各プロジェクトのフォルダ(例:`pico/01-blink`)を **VS Code で単独のフォルダとして開く**。リポジトリのルートを開くと、拡張がプロジェクトを認識しない。

- **ビルド**:ステータスバーの `Compile`、またはコマンドパレットの `Raspberry Pi Pico: Compile Pico Project`
- **Debug Probe で書き込んで実行**:`Raspberry Pi Pico: Flash Pico Project (SWD)`
- **デバッグ**:`F5`(`Pico Debug (Cortex-Debug)`)。`main` で止まるので、ステップ実行や変数・レジスタの確認ができる
- **USB で書き込んで実行**:`Raspberry Pi Pico: Run Pico Project (USB)`
- **Debug Probe も拡張も使わずに書き込む**:BOOTSEL ボタンを押しながら Pico を USB につなぐと、`RPI-RP2` ドライブとして見える。`build/<名前>.uf2` をそこへコピーする

## 配線

### Debug Probe と Pico H

Debug Probe には 2 つのポートがある。

- **D ポート(SWD)**:付属の JST - JST ケーブルで、Pico H の端にある 3 ピンのデバッグ端子(DEBUG)につなぐ。挿すだけでよい。
- **U ポート(UART)**:付属の JST - ジャンパーケーブルで、Pico のピンにつなぐ。TX と RX は**交差**させる。

| Debug Probe の U ポート | Pico H |
|---|---|
| TX(オレンジ) | GP1 / UART0 RX(2 番ピン) |
| RX(黄) | GP0 / UART0 TX(1 番ピン) |
| GND(黒) | GND(3 番ピン) |

ケーブルの色は、Debug Probe の本体とケーブルの印字でも確認すること。UART の出力は、PC 側に現れる COM ポート(「USB シリアル デバイス」)を 115200 bps で開くと見える。VS Code では拡張「Serial Monitor」が使える。

電源:Debug Probe は Pico に電源を供給しない。Pico は別の USB ケーブルで PC につなぐ。

### タクトスイッチ(02 以降で使う)

Pico の内部プルアップを使うので、抵抗はいらない。スイッチはブレッドボード中央の溝をまたぐように挿し、**対角の足**を次のようにつなぐ(対角の足どうしは必ず「押したときだけつながる」組み合わせになる)。

| スイッチ | Pico H |
|---|---|
| SW1 | GP14(19 番ピン)と GND(18 番ピン) |
| SW2 | GP15(20 番ピン)と GND(18 番ピン) |

押していないときは High(1)、押すと Low(0)になる。

## カリキュラム

今の機材だけで進められる順番。番号はフォルダ名に対応する(できたものから追加する)。

| # | テーマ | 学ぶこと |
|---|---|---|
| 01 | Lチカ + デバッグ | GPIO 出力、Debug Probe でのブレークポイント・ステップ実行・ペリフェラルのレジスタ表示、UART への printf |
| 02 | ボタンと割り込み | GPIO 入力、プルアップ、ポーリングと割り込みの違い、`volatile`、チャタリングの除去 |
| 03 | 内蔵温度センサー | ADC、換算式、タイマーによる定期処理 |
| 04 | USB HID マクロキーボード | TinyUSB、USB ディスクリプタ、2 つのボタンにショートカットを割り当てる |
| 05 | Pico 2 枚で通信 | UART / I2C / SPI の送り手と受け手を両方作る |
| 06 | Pico をロジックアナライザにする | sigrok / PulseView で 05 の信号を観察する |
| 07 | PIO 入門 | PIO アセンブリ、ステートマシン、自作の信号出力 |

あると広がる追加部品:LED と抵抗(330Ω 前後)、SSD1306 OLED(I2C)、WS2812 の LED、可変抵抗。
