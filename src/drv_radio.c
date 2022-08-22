/*
 * This file is part of the MicroPython project, http://micropython.org/
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2022 Damien P. George
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

#include "py/runtime.h"
#include "drv_radio.h"
#include "jshal.h"

// Format:
// 1 byte for len
// N data bytes as per len
// 1 byte RSSI
// 4 bytes time
#define RADIO_PACKET_OVERHEAD (1 + 1 + 4)

static uint8_t rx_buf_size = 0;

void microbit_radio_enable(microbit_radio_config_t *config) {
    microbit_radio_disable();

    uint8_t group = config->prefix0;
    mp_js_radio_enable(group, config->max_payload, config->queue_len);

    // We have an rx buffer of size 1, the queue itself is in the JavaScript.
    rx_buf_size = config->max_payload + RADIO_PACKET_OVERHEAD;
    MP_STATE_PORT(radio_buf) = m_new(uint8_t, rx_buf_size);
}

void microbit_radio_disable(void) {
    mp_js_radio_disable();

    // free any old buffers
    if (MP_STATE_PORT(radio_buf) != NULL) {
        m_del(uint8_t, MP_STATE_PORT(radio_buf), rx_buf_size);
        MP_STATE_PORT(radio_buf) = NULL;
        rx_buf_size = 0;
    }
}

// Exposed so JavaScript can write directly into the max_payload sized buffer.
uint8_t *microbit_radio_rx_buffer() {
    return MP_STATE_PORT(radio_buf);
}

void microbit_radio_update_config(microbit_radio_config_t *config) {
    // This is not called if the max_payload or queue length change.
    // Instead we are disabled then enabled.
    uint8_t group = config->prefix0;
    mp_js_radio_update_config(group, config->max_payload, config->queue_len);
}

// This assumes the radio is enabled.
void microbit_radio_send(const void *buf, size_t len, const void *buf2, size_t len2) {
    mp_js_radio_send(buf, len, buf2, len2);
}

const uint8_t *microbit_radio_peek(void) {
    // This call writes to the rx buffer.
    return mp_js_radio_peek();
}

void microbit_radio_pop(void) {
    mp_js_radio_pop();
}
