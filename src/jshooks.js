/*
 * This file is part of the MicroPython project, http://micropython.org/
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2017-2018 Rami Ali
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
    mp_js_write: function(ptr, len) {
        for (var i = 0; i < len; ++i) {
            var c = String.fromCharCode(getValue(ptr + i, 'i8'));
            var mp_js_stdout = document.getElementById('mp_js_stdout');
            var print = new Event('print');
            print.data = c;
            mp_js_stdout.dispatchEvent(print);
        }
    },

    mp_js_ticks_ms: function() {
        return (new Date()).getTime() - MP_JS_EPOCH;
    },

    mp_js_hal_init: function() {
        var c = document.getElementById('uBitDisplay');
        var ctx = c.getContext('2d');
        ctx.fillStyle = `rgb(0, 0, 0)`;
        ctx.fillRect(0, 0, 200, 200);
    },

    mp_js_hal_display_set_pixel: function(x, y, value) {
        var c = document.getElementById('uBitDisplay');
        var ctx = c.getContext('2d');
        ctx.fillStyle = `rgb(${value}, 0, 0)`;
        ctx.fillRect(40 * x, 40 * y, 40, 40);
    },
});
