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
        var c = document.getElementById('uBitDisplay');
        var ctx = c.getContext('2d');
        ctx.fillStyle = `rgb(0, 0, 0)`;
        ctx.fillRect(0, 0, 200, 200);

        audio_context = new AudioContext();
        audio_osc = null;
        audio_frequency = 440;
    },

    mp_js_hal_display_set_pixel: function(x, y, value) {
        var c = document.getElementById('uBitDisplay');
        var ctx = c.getContext('2d');
        ctx.fillStyle = `rgb(${value}, 0, 0)`;
        ctx.fillRect(40 * x, 40 * y, 40, 40);
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
