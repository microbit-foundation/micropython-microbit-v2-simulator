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
        board.initialize();

        messageListener = (e) => {
            if (e.source === window.parent) {
                const { data } = e;
                switch (data.kind) {
                    case "flash": {
                        if (data.filesystem) {
                            fs.clear();
                            Object.entries(data.filesystem).forEach(([name, value]) => {
                                const idx = fs.create(name);
                                fs.write(idx, value)
                            });
                            // Ctrl-C, Ctrl-D to restart.
                            // Can/should we do this programatically?
                            stdin_buffer.push(3, 4);
                        }
                        break;
                    }
                    case "serial_input": {
                        const text = data.data;
                        for (let i = 0; i < text.length; i++) {
                            stdin_buffer.push(text.charCodeAt(i));
                        }
                        break;
                    }
                    case "sensor_set": {
                        const sensor = board.getSensor(data.sensor);
                        const value = data.value;
                        if (sensor && value) {
                          sensor.value = sensor.type === "range" ? parseInt(value, 10) : value;
                        }
                        break;
                    }
                }
            }
        };
        window.addEventListener("message", messageListener);
        window.parent.postMessage({
            kind: "ready",
            sensors: board.sensors,
        }, "*")
    },

    mp_js_hal_deinit: function() {
        board.dispose();
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
        }, "*");
    },

    mp_js_hal_filesystem_find: function(name, len) {
        return fs.find(UTF8ToString(name, len));
    },

    mp_js_hal_filesystem_create: function(name, len) {
        const filename = UTF8ToString(name, len);
        return fs.create(filename);
    },

    mp_js_hal_filesystem_name: function(idx, buf) {
        const name = fs.name(idx);
        if (name === undefined) {
            return -1;
        }
        const len = lengthBytesUTF8(name);
        stringToUTF8(name, buf, len + 1);
        return len;
    },

    mp_js_hal_filesystem_size: function(idx) {
        return fs.size(idx);
    },

    mp_js_hal_filesystem_remove: function(idx) {
        return fs.remove(idx);
    },

    mp_js_hal_filesystem_readbyte: function(idx, offset) {
        return fs.readbyte(idx, offset);
    },

    mp_js_hal_filesystem_write: function(idx, buf, len) {
        const data = new Uint8Array(HEAP8.buffer, buf, len);
        return fs.write(idx, data);
    },

    mp_js_hal_temperature: function() {
        return board.temperature.value;
    },

    mp_js_hal_button_get_presses: function(button) {
        return board.buttons[button].getAndClearPresses()
    },

    mp_js_hal_button_is_pressed: function(button) {
        return board.buttons[button].isPressed();
    },

    mp_js_hal_pin_is_touched: function(pin) {
        return board.pins[pin].isTouched();
    },

    mp_js_hal_display_get_pixel: function(x, y) {
        return board.display.getPixel(x, y);
    },

    mp_js_hal_display_set_pixel: function(x, y, value) {
        board.display.setPixel(x, y, value);
    },

    mp_js_hal_display_clear: function() {
        board.display.clear();
    },

    mp_js_hal_display_read_light_level: function() {
        return board.display.lightLevel.value;
    },

    mp_js_hal_accelerometer_get_x: function() {
        return board.accelerometer.x.value;
    },

    mp_js_hal_accelerometer_get_y: function() {
        return board.accelerometer.y.value;
    },

    mp_js_hal_accelerometer_get_z: function() {
        return board.accelerometer.z.value;
    },

    mp_js_hal_accelerometer_get_gesture: function() {
        // Equivalent to gesture_name_map.
        // Is there a way to access e.g. MICROBIT_HAL_ACCELEROMETER_EVT_NONE ?
        switch (board.accelerometer.gesture.value) {
            case "none":
                return MICROBIT_HAL_ACCELEROMETER_EVT_NONE;
            case "up":
                return MICROBIT_HAL_ACCELEROMETER_EVT_TILT_UP;
            case "down":
                return MICROBIT_HAL_ACCELEROMETER_EVT_TILT_DOWN;
            case "left":
                return MICROBIT_HAL_ACCELEROMETER_EVT_TILT_LEFT;
            case "right":
                return MICROBIT_HAL_ACCELEROMETER_EVT_TILT_RIGHT;
            case "face up":
                return MICROBIT_HAL_ACCELEROMETER_EVT_FACE_UP;
            case "face down":
                return MICROBIT_HAL_ACCELEROMETER_EVT_FACE_DOWN;
            case "freefall":
                return MICROBIT_HAL_ACCELEROMETER_EVT_FREEFALL;
            case "2g":
                return MICROBIT_HAL_ACCELEROMETER_EVT_2G;
            case "3g":
                return MICROBIT_HAL_ACCELEROMETER_EVT_3G;
            case "6g":
                return MICROBIT_HAL_ACCELEROMETER_EVT_6G
            case "8g":
                return MICROBIT_HAL_ACCELEROMETER_EVT_8G
            case "shake":
                return MICROBIT_HAL_ACCELEROMETER_EVT_SHAKE;
        }

    },

    mp_js_hal_accelerometer_set_range: function(r) {
        board.accelerometer.setRange(r)
    },

    mp_js_hal_audio_period_us: function(period_us) {
        board.audio.setPeriodUs(period_us);
    },

    mp_js_hal_audio_amplitude_u10: function(amplitude_u10) {
        board.audio.setAmplitudeU10(amplitude_u10);
    },

});
