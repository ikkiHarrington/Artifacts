# 01-blink: Lチカ + Debug Probe でデバッグ

オンボード LED(GP25)を 0.5 秒ごとに点滅させ、`count=… led=on/off` をシリアルに出力する。目的は、LED を光らせること自体より、**Debug Probe でプログラムを止めて中を覗けるようになること**。

## 準備

1. Debug Probe の D ポートと、Pico H の DEBUG 端子を JST ケーブルでつなぐ。
2. Debug Probe の U ポートを、Pico の GP0 / GP1 / GND につなぐ(配線は [../README.md](../README.md) を参照)。
3. Debug Probe と Pico を、それぞれ USB で PC につなぐ。
4. VS Code で **このフォルダ(`pico/01-blink`)を開く**。

## 1. 動かす

1. `Raspberry Pi Pico: Compile Pico Project` でビルドする。
2. `Raspberry Pi Pico: Flash Pico Project (SWD)` で書き込む。LED が点滅すれば成功。
3. Debug Probe の COM ポートを 115200 bps で開き、`count=1 led=on` … が流れることを確認する。

## 2. デバッガで止める

`F5` を押すと、書き込みのあと `main` の先頭で止まる。

| 操作 | キー |
|---|---|
| 続行 | `F5` |
| ステップオーバー(1 行進める) | `F10` |
| ステップイン(関数の中へ入る) | `F11` |
| ブレークポイントの設定・解除 | 行番号の左をクリック、または `F9` |

## 3. 練習課題

1. **変数を覗く**:`gpio_put(...)` の行にブレークポイントを置いて続行する。止まるたびに、左の VARIABLES で `count` と `led_on` が変わることを確かめる。
2. **変数を書き換える**:止めた状態で `count` をダブルクリックして `1000` にし、続行する。シリアルの出力が `count=1001` から続くことを確かめる。
3. **関数の中に入る**:`gpio_put` で `F11` を押す。最終的に `sio_hw->gpio_set` か `gpio_clr` への書き込み 1 回になることを確かめる。これが「LED を点ける」ことの正体で、**特定のアドレスに値を書くだけ**。
4. **レジスタを見る**:左下の XPERIPHERALS で `SIO` → `GPIO_OUT` を開く。`gpio_put` を `F10` で 1 行ずつ越えるたびに、bit 25 が 0 と 1 で切り替わることを確かめる。
5. **レジスタを直接書く**:止めた状態で、XPERIPHERALS から `GPIO_OUT` の bit 25 を書き換える。コードを進めなくても LED が点いたり消えたりする。
6. **止めると何が起きるか**:`sleep_ms` の中で止めて数秒待ってから続行する。LED とシリアルの出力が止まっていたことを確認する。CPU が止まれば、プログラムの時間も止まる。

## 分かったら次へ

- `BLINK_INTERVAL_MS` を変えて、点滅の速さを変える。
- `printf` を消したとき、`arm-none-eabi-size build/blink.elf` の `text` がどれだけ減るか調べる(printf は意外と大きい)。
- 次は [02 ボタンと割り込み](../README.md#カリキュラム)。
