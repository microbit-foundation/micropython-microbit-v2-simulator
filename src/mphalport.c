#include <emscripten.h>
#include "py/mphal.h"
#include "py/stream.h"
#include "microbithal_js.h"
#include "jshal.h"

static uint8_t stdin_ringbuf_array[260];
ringbuf_t stdin_ringbuf = {stdin_ringbuf_array, sizeof(stdin_ringbuf_array), 0, 0};

uintptr_t mp_hal_stdio_poll(uintptr_t poll_flags) {
    uintptr_t ret = 0;
    if ((poll_flags & MP_STREAM_POLL_RD) && stdin_ringbuf.iget != stdin_ringbuf.iput) {
        ret |= MP_STREAM_POLL_RD;
    }
    return ret;
}

void mp_hal_stdout_tx_strn(const char *str, size_t len) {
    mp_js_hal_stdout_tx_strn(str, len);
}

int mp_hal_stdin_rx_chr(void) {
    for (;;) {
        int c = ringbuf_get(&stdin_ringbuf);
        if (c != -1) {
            return c;
        }
        mp_handle_pending(true);
        microbit_hal_idle();
    }
}

mp_uint_t mp_hal_ticks_us(void) {
    return mp_js_hal_ticks_ms() * 1000;
}

mp_uint_t mp_hal_ticks_ms(void) {
    return mp_js_hal_ticks_ms();
}

