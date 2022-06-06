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

void microbit_radio_enable(microbit_radio_config_t *config) {
    // TODO: enable the radio, based on the given config.

    // Set to non-NULL to indicate to modradio that the radio is enabled.
    MP_STATE_PORT(radio_buf) = (void *)1;
}

void microbit_radio_disable(void) {
    // TODO: disable the radio.

    // Set to NULL to indicate to modradio that the radio is disabled.
    MP_STATE_PORT(radio_buf) = NULL;
}

void microbit_radio_update_config(microbit_radio_config_t *config) {
    // TODO: change radio configuration based on config argument.
}

// This assumes the radio is enabled.
void microbit_radio_send(const void *buf, size_t len, const void *buf2, size_t len2) {
    // TODO: send packet over the radio, packet defined by concatenation of buf and buf2.
}

const uint8_t *microbit_radio_peek(void) {
    // TODO: return a pointer to the next available packet, or NULL if none available.
    return NULL; // no packet
}

void microbit_radio_pop(void) {
    // TODO: pop the next available packet, if there is one.
}
