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
  mp_js_hal_init: async function () {
    Module.board.initialize();
  },

  mp_js_hal_deinit: function () {
    Module.board.stopComponents();
  },

  mp_js_hal_ticks_ms: function () {
    return Module.board.ticksMilliseconds();
  },

  mp_js_hal_stdin_pop_char: function () {
    return Module.board.readSerialInput();
  },

  mp_js_hal_stdout_tx_strn: function (ptr, len) {
    Module.board.writeSerialOutput(UTF8ToString(ptr, len));
  },

  mp_js_hal_filesystem_find: function (name, len) {
    return Module.fs.find(UTF8ToString(name, len));
  },

  mp_js_hal_filesystem_create: function (name, len) {
    const filename = UTF8ToString(name, len);
    return Module.fs.create(filename);
  },

  mp_js_hal_filesystem_name: function (idx, buf) {
    const name = Module.fs.name(idx);
    if (name === undefined) {
      return -1;
    }
    const len = lengthBytesUTF8(name);
    stringToUTF8(name, buf, len + 1);
    return len;
  },

  mp_js_hal_filesystem_size: function (idx) {
    return Module.fs.size(idx);
  },

  mp_js_hal_filesystem_remove: function (idx) {
    return Module.fs.remove(idx);
  },

  mp_js_hal_filesystem_readbyte: function (idx, offset) {
    return Module.fs.readbyte(idx, offset);
  },

  mp_js_hal_filesystem_write: function (idx, buf, len) {
    const data = new Uint8Array(HEAP8.buffer, buf, len);
    return Module.fs.write(idx, data);
  },

  mp_js_hal_reset: function () {
    Module.board.throwReset();
  },

  mp_js_hal_panic: function (code) {
    Module.board.throwPanic(code);
  },

  mp_js_hal_temperature: function () {
    return Module.board.temperature.value;
  },

  mp_js_hal_button_get_presses: function (button) {
    return Module.board.buttons[button].getAndClearPresses();
  },

  mp_js_hal_button_is_pressed: function (button) {
    return Module.board.buttons[button].isPressed();
  },

  mp_js_hal_pin_is_touched: function (pin) {
    return Module.board.pins[pin].isTouched();
  },

  mp_js_hal_display_get_pixel: function (x, y) {
    return Module.board.display.getPixel(x, y);
  },

  mp_js_hal_display_set_pixel: function (x, y, value) {
    Module.board.display.setPixel(x, y, value);
  },

  mp_js_hal_display_clear: function () {
    Module.board.display.clear();
  },

  mp_js_hal_display_read_light_level: function () {
    return Module.board.display.lightLevel.value;
  },

  mp_js_hal_accelerometer_get_x: function () {
    return Module.board.accelerometer.state.accelerometerX.value;
  },

  mp_js_hal_accelerometer_get_y: function () {
    return Module.board.accelerometer.state.accelerometerY.value;
  },

  mp_js_hal_accelerometer_get_z: function () {
    return Module.board.accelerometer.state.accelerometerZ.value;
  },

  mp_js_hal_accelerometer_get_gesture: function () {
    return Module.conversions.convertAccelerometerStringToNumber(
      Module.board.accelerometer.state.gesture.value
    );
  },

  mp_js_hal_accelerometer_set_range: function (r) {
    Module.board.accelerometer.setRange(r);
  },

  mp_js_hal_compass_get_x: function () {
    return Module.board.compass.state.compassX.value;
  },

  mp_js_hal_compass_get_y: function () {
    return Module.board.compass.state.compassY.value;
  },

  mp_js_hal_compass_get_z: function () {
    return Module.board.compass.state.compassZ.value;
  },

  mp_js_hal_compass_get_field_strength: function () {
    return Module.board.compass.getFieldStrength();
  },

  mp_js_hal_compass_get_heading: function () {
    return Module.board.compass.state.compassHeading.value;
  },

  mp_js_hal_audio_set_volume: function (value) {
    Module.board.audio.setVolume(value);
  },

  mp_js_hal_audio_init: function (sample_rate) {
    Module.board.audio.default.init(sample_rate);
  },

  mp_js_hal_audio_write_data: function (buf, num_samples) {
    Module.board.audio.default.writeData(
      Module.conversions.convertAudioBuffer(
        Module.HEAPU8,
        buf,
        Module.board.audio.default.createBuffer(num_samples)
      )
    );
  },

  mp_js_hal_audio_speech_init: function (sample_rate) {
    Module.board.audio.speech.init(sample_rate);
  },

  mp_js_hal_audio_speech_write_data: function (buf, num_samples) {
    Module.board.audio.speech.writeData(
      Module.conversions.convertAudioBuffer(
        Module.HEAPU8,
        buf,
        Module.board.audio.speech.createBuffer(num_samples)
      )
    );
  },

  mp_js_hal_audio_period_us: function (period_us) {
    Module.board.audio.setPeriodUs(period_us);
  },

  mp_js_hal_audio_amplitude_u10: function (amplitude_u10) {
    Module.board.audio.setAmplitudeU10(amplitude_u10);
  },

  mp_js_hal_microphone_init: function () {
    Module.board.microphone.microphoneOn();
  },

  mp_js_hal_microphone_set_threshold: function (kind, value) {
    Module.board.microphone.setThreshold(
      Module.conversions.convertSoundThresholdNumberToString(kind),
      value
    );
  },

  mp_js_hal_microphone_get_level: function () {
    return Module.board.microphone.soundLevel.value;
  },

  mp_js_hal_audio_play_expression: function (expr) {
    return Module.board.audio.playSoundExpression(UTF8ToString(expr));
  },

  mp_js_hal_audio_stop_expression: function () {
    return Module.board.audio.stopSoundExpression();
  },

  mp_js_hal_audio_is_expression_active: function () {
    return Module.board.audio.isSoundExpressionActive();
  },

  mp_js_radio_enable: function (group, max_payload, queue) {
    Module.board.radio.enable({ group, maxPayload: max_payload, queue });
  },

  mp_js_radio_disable: function () {
    Module.board.radio.disable();
  },

  mp_js_radio_update_config: function (group, max_payload, queue) {
    Module.board.radio.updateConfig({ group, maxPayload: max_payload, queue });
  },

  mp_js_radio_send: function (buf, len, buf2, len2) {
    const data = new Uint8Array(len + len2);
    data.set(HEAPU8.slice(buf, buf + len));
    data.set(HEAPU8.slice(buf2, buf2 + len2), len);
    Module.board.radio.send(data);
  },

  mp_js_radio_peek: function () {
    const packet = Module.board.radio.peek();
    if (packet) {
      return Module.board.module.writeRadioRxBuffer(packet);
    }
    return null;
  },

  mp_js_radio_pop: function () {
    Module.board.radio.pop();
  },

  mp_js_hal_log_delete: function (full_erase) {
    // We don't have a notion of non-full erase.
    Module.board.dataLogging.delete();
  },

  mp_js_hal_log_set_mirroring: function (serial) {
    Module.board.dataLogging.setMirroring(serial);
  },

  mp_js_hal_log_set_timestamp: function (period) {
    Module.board.dataLogging.setTimestamp(period);
  },

  mp_js_hal_log_begin_row: function () {
    return Module.board.dataLogging.beginRow();
  },

  mp_js_hal_log_end_row: function () {
    return Module.board.dataLogging.endRow();
  },

  mp_js_hal_log_data: function (key, value) {
    return Module.board.dataLogging.logData(
      UTF8ToString(key),
      UTF8ToString(value)
    );
  },
});
