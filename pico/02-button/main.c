// 02-button: タクトスイッチの入力を、ポーリングと割り込みの 2 通りで読む。
//
// SW1(GP14)はポーリングで、SW2(GP15)は割り込みで読む。配線は ../README.md を参照。
// どちらで動かすかは MODE で切り替える。
//
// 「TODO(課題 N)」の箇所を自分で実装する。課題の順番・確かめ方・ヒントは README.md を参照。
// TODO のままでもビルドは通る(ボタンに反応しないだけ)。

#include <stdio.h>

#include "pico/stdlib.h"

#define MODE_POLLING   1  // 課題 1
#define MODE_INTERRUPT 2  // 課題 2〜4
#define MODE MODE_POLLING

#define LED_PIN PICO_DEFAULT_LED_PIN
#define SW1_PIN 14
#define SW2_PIN 15

// ポーリングで SW1 を読む間隔。課題 1 の後半で 0 にして試す。
#define POLL_INTERVAL_MS 10

// SW2 が押された回数。割り込みの中で増やし、run_interrupt() で表示する。
// TODO(課題 3):この宣言に足りないものがある。
static uint32_t sw2_count = 0;

// ---------------------------------------------------------------------------
// 課題 1:ポーリング
// ---------------------------------------------------------------------------

// TODO(課題 1):SW1 を入力として使えるようにする。内部プルアップも有効にする。
static void sw1_init(void) {
}

// TODO(課題 1):SW1 が押されているとき true を返す。
//   押していないときと押したときで、ピンが High と Low のどちらになるかに注意する。
static bool sw1_pressed(void) {
    return false;
}

static void run_polling(void) {
    sw1_init();

    bool last = false;
    while (true) {
        bool now = sw1_pressed();
        if (now != last) {
            printf("SW1 %s\n", now ? "pressed" : "released");
            gpio_put(LED_PIN, now);
            last = now;
        }
        sleep_ms(POLL_INTERVAL_MS);
    }
}

// ---------------------------------------------------------------------------
// 課題 2〜4:割り込み
// ---------------------------------------------------------------------------

// TODO(課題 2):SW2 の割り込みが起きたときに呼ばれる関数を書き、中で sw2_count を 1 増やす。
//   関数の引数の形は、割り込みを登録する SDK の関数が決めている。
// TODO(課題 4):チャタリングで、1 回押しただけで何回も数えられないようにする。

// TODO(課題 2):SW2 を入力にして内部プルアップを有効にし、押したときに上の関数が呼ばれるよう登録する。
static void sw2_init(void) {
}

static void run_interrupt(void) {
    sw2_init();

    uint32_t last = sw2_count;
    while (true) {
        // sw2_count が変わるまで、何もせずに待つ(課題 3 で使う)。
        while (sw2_count == last) {
            tight_loop_contents();
        }
        last = sw2_count;
        printf("SW2 count=%lu\n", (unsigned long)last);
        gpio_put(LED_PIN, last % 2);
    }
}

int main(void) {
    stdio_init_all();

    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    printf("02-button: mode=%s\n", MODE == MODE_POLLING ? "polling" : "interrupt");

#if MODE == MODE_POLLING
    run_polling();
#else
    run_interrupt();
#endif
}
