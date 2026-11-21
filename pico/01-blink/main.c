// 01-blink: オンボード LED を点滅させ、回数と状態をシリアルに出力する。
//
// 出力は UART0(GP0 = TX、GP1 = RX、115200 bps)と USB の両方に出る。
// Debug Probe の U ポートをつなげば、デバッガで止めても出力が途切れない
// (USB 側は、CPU を止めると PC との接続が切れる)。
// デバッグの練習内容は README.md を参照。

#include <stdio.h>

#include "pico/stdlib.h"

// 無線なしの Pico では GP25。ボード定義(PICO_BOARD=pico)から来る。
#define LED_PIN PICO_DEFAULT_LED_PIN

#define BLINK_INTERVAL_MS 500

int main(void) {
    stdio_init_all();

    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    uint32_t count = 0;
    bool led_on = false;

    while (true) {
        led_on = !led_on;
        gpio_put(LED_PIN, led_on);  // ← 最初のブレークポイントはここに置く
        count++;

        printf("count=%lu led=%s\n", (unsigned long)count, led_on ? "on" : "off");
        sleep_ms(BLINK_INTERVAL_MS);
    }
}
