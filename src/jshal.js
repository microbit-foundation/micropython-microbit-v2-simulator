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

mergeInto(LibraryManager.library, {
    mp_js_hal_init: async function() {
        MP_JS_EPOCH = (new Date()).getTime();
        stdin_buffer = [];

        messageListener = (e) => {
            if (e.source === window.parent) {
                switch (e.data.kind) {
                    case "serial_input": {
                        const text = e.data.data;
                        for (let i = 0; i < text.length; i++) {
                            stdin_buffer.push(text.charCodeAt(i));
                        }
                        break;
                    }
                }
            }
        };
        window.addEventListener("message", messageListener);
        board = await createBoard()
        window.parent.postMessage({
            kind: "ready"
        })
    },

    mp_js_hal_deinit: function() {
        if (board) {
            board.dispose();
            board = null;
        }
        if (messageListener) {
            window.removeEventListener("message", messageListener);
            messageListener = null;
        }
    },

    mp_js_hal_ticks_ms: function() {
        return (new Date()).getTime() - MP_JS_EPOCH;
    },

    mp_js_hal_stdin_pop_char: function() {
        if (stdin_buffer.length > 0) {
            return stdin_buffer.shift();
        } else {
            return -1;
        }
    },

    mp_js_hal_stdout_tx_strn: function(ptr, len) {
        const data = UTF8ToString(ptr, len);
        window.parent.postMessage({
            kind: "serial_output",
            data
        });
    },

    mp_js_hal_button_get_presses: function(button) {
        return board.buttons[button].getAndClearPresses()
    },

    mp_js_hal_button_is_pressed: function(button) {
        return board.buttons[button].isPressed();
    },

    mp_js_hal_display_set_pixel: function(x, y, value) {
        board.display.setPixel(x, y, value);
    },

    mp_js_hal_display_read_light_level: function() {
        return board.display.lightLevel.value;
    },

    mp_js_hal_audio_period_us: function(period_us) {
        board.audio.setPeriodUs(period_us);
    },

    mp_js_hal_audio_amplitude_u10: function(amplitude_u10) {
        board.audio.setAmplitudeU10(amplitude_u10);
    },

});
