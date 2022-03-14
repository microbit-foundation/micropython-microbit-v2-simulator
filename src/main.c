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

#include <stdio.h>
#include <stdlib.h>

#include "py/gc.h"
#include "py/lexer.h"
#include "py/mperrno.h"
#include "py/mphal.h"
#include "py/runtime.h"
#include "shared/readline/readline.h"
#include "shared/runtime/gchelper.h"
#include "shared/runtime/pyexec.h"
#include "drv_system.h"
#include "drv_display.h"
#include "modmicrobit.h"
#include "emscripten.h"
#include "jshooks.h"

extern void microbit_hal_init(void);

void mp_js_main(int heap_size) {
    for (;;) {
        microbit_hal_init();
        microbit_system_init();
        microbit_display_init();

        #if MICROPY_ENABLE_GC
        char *heap = (char *)malloc(heap_size * sizeof(char));
        gc_init(heap, heap + heap_size);
        #endif

        #if MICROPY_ENABLE_PYSTACK
        static mp_obj_t pystack[1024];
        mp_pystack_init(pystack, &pystack[MP_ARRAY_SIZE(pystack)]);
        #endif

        mp_init();

        pyexec_event_repl_init();
        for (;;) {
            int c = mp_hal_stdin_rx_chr();
            if (pyexec_event_repl_process_char(c)) {
                // Exit for a soft reset.
                break;
            }
        }

        mp_printf(MP_PYTHON_PRINTER, "MPY: soft reboot\n");
        //microbit_soft_timer_deinit();
        gc_sweep_all();
        mp_deinit();
    }
}

EM_JS(int, mp_js_stdin_pop_char, (), {
    if (Module.stdin_buffer.length > 0) {
        return Module.stdin_buffer.shift();
    } else {
        return -1;
    }
});

EM_JS(void, mp_js_stdin_push_char, (int c), {
    Module.stdin_buffer.push(c);
});

void nlr_jump_fail(void *val) {
    printf("FATAL: uncaught NLR %p\n", val);
    exit(1);
}

STATIC void gc_scan_func(void *begin, void *end) {
    gc_collect_root((void **)begin, (void **)end - (void **)begin + 1);
}

void gc_collect(void) {
    gc_collect_start();
    emscripten_scan_stack(gc_scan_func);
    emscripten_scan_registers(gc_scan_func);
    gc_collect_end();
}

mp_lexer_t *mp_lexer_new_from_file(const char *filename) {
    mp_raise_OSError(MP_ENOENT);
}

mp_import_stat_t mp_import_stat(const char *path) {
    return MP_IMPORT_STAT_NO_EXIST;
}
