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
    mp_js_hal_init: function() {
        MP_JS_EPOCH = (new Date()).getTime();
        stdin_buffer = [];

        // Create terminal and set up input data event.
        term = new Terminal({
            cols: 80,
            rows: 24,
            useStyle: true,
            screenKeys: true,
            cursorBlink: false
        });
        term.open(document.getElementById("term"));
        term.removeAllListeners("data");
        term.on("data", function(data) {
            // Pasted data from clipboard will likely contain
            // LF as EOL chars.
            data = data.replace(/\n/g, "\r");
            for (var i = 0; i < data.length; i++) {
                stdin_buffer.push(data.charCodeAt(i));
            }
        });

        // Create display canvas.
        var c = document.getElementById('uBitDisplay');
        display_context = c.getContext('2d');
        display_context.fillStyle = `rgb(0, 0, 0)`;
        display_context.fillRect(0, 0, 200, 200);

        // Create audio output context.
        audio_context = new AudioContext();
        audio_osc = null;
        audio_frequency = 440;
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
        for (var i = 0; i < len; ++i) {
            var c = String.fromCharCode(getValue(ptr + i, 'i8'));
            term.write(c);
        }
    },

    mp_js_hal_display_set_pixel: function(x, y, value) {
        display_context.fillStyle = `rgb(${value}, 0, 0)`;
        display_context.fillRect(40 * x, 40 * y, 40, 40);
    },

    mp_js_hal_audio_period_us: function(period_us) {
        audio_frequency = 1000000 / period_us;
        if (audio_osc) {
            audio_osc.frequency.value = audio_frequency;
        }
    },

    mp_js_hal_audio_amplitude_u10: function(amplitude_u10) {
        if (audio_osc) {
            audio_osc.stop();
            audio_osc = null;
        }
        if (amplitude_u10) {
            audio_osc = audio_context.createOscillator();
            audio_osc.type = "sine";
            audio_osc.connect(audio_context.destination);
            audio_osc.frequency.value = audio_frequency;
            audio_osc.start();
        }
    },
});
