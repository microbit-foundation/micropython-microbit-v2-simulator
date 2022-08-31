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
    board.initialize();
  },

  mp_js_hal_deinit: function () {
    board.dispose();
  },

  mp_js_hal_ticks_ms: function () {
    return board.ticksMilliseconds();
  },

  mp_js_hal_stdin_pop_char: function () {
    return board.readSerialInput();
  },

  mp_js_hal_stdout_tx_strn: function (ptr, len) {
    board.writeSerialOutput(UTF8ToString(ptr, len));
  },

  mp_js_hal_filesystem_find: function (name, len) {
    return fs.find(UTF8ToString(name, len));
  },

  mp_js_hal_filesystem_create: function (name, len) {
    const filename = UTF8ToString(name, len);
    return fs.create(filename);
  },

  mp_js_hal_filesystem_name: function (idx, buf) {
    const name = fs.name(idx);
    if (name === undefined) {
      return -1;
    }
    const len = lengthBytesUTF8(name);
    stringToUTF8(name, buf, len + 1);
    return len;
  },

  mp_js_hal_filesystem_size: function (idx) {
    return fs.size(idx);
  },

  mp_js_hal_filesystem_remove: function (idx) {
    return fs.remove(idx);
  },

  mp_js_hal_filesystem_readbyte: function (idx, offset) {
    return fs.readbyte(idx, offset);
  },

  mp_js_hal_filesystem_write: function (idx, buf, len) {
    const data = new Uint8Array(HEAP8.buffer, buf, len);
    return fs.write(idx, data);
  },

  mp_js_hal_reset: function () {
    return board.reset();
  },

  mp_js_hal_panic: function (code) {
    return board.panic(code);
  },

  mp_js_hal_temperature: function () {
    return board.temperature.value;
  },

  mp_js_hal_button_get_presses: function (button) {
    return board.buttons[button].getAndClearPresses();
  },

  mp_js_hal_button_is_pressed: function (button) {
    return board.buttons[button].isPressed();
  },

  mp_js_hal_pin_is_touched: function (pin) {
    return board.pins[pin].isTouched();
  },

  mp_js_hal_display_get_pixel: function (x, y) {
    return board.display.getPixel(x, y);
  },

  mp_js_hal_display_set_pixel: function (x, y, value) {
    board.display.setPixel(x, y, value);
  },

  mp_js_hal_display_clear: function () {
    board.display.clear();
  },

  mp_js_hal_display_read_light_level: function () {
    return board.display.lightLevel.value;
  },

  mp_js_hal_accelerometer_get_x: function () {
    return board.accelerometer.state.accelerometerX.value;
  },

  mp_js_hal_accelerometer_get_y: function () {
    return board.accelerometer.state.accelerometerY.value;
  },

  mp_js_hal_accelerometer_get_z: function () {
    return board.accelerometer.state.accelerometerZ.value;
  },

  mp_js_hal_accelerometer_get_gesture: function () {
    return conversions.convertAccelerometerStringToNumber(
      board.accelerometer.state.gesture.value
    );
  },

  mp_js_hal_accelerometer_set_range: function (r) {
    board.accelerometer.setRange(r);
  },

  mp_js_hal_compass_get_x: function () {
    return board.compass.state.compassX.value;
  },

  mp_js_hal_compass_get_y: function () {
    return board.compass.state.compassY.value;
  },

  mp_js_hal_compass_get_z: function () {
    return board.compass.state.compassZ.value;
  },

  mp_js_hal_compass_get_field_strength: function () {
    return board.compass.getFieldStrength();
  },

  mp_js_hal_compass_get_heading: function () {
    return board.compass.state.compassHeading.value;
  },

  mp_js_hal_audio_set_volume: function (value) {
    board.audio.setVolume(value);
  },

  mp_js_hal_audio_init: function (sample_rate) {
    board.audio.default.init(sample_rate);
  },

  mp_js_hal_audio_write_data: function (buf, num_samples) {
    board.audio.default.writeData(
      conversions.convertAudioBuffer(
        buf,
        board.audio.default.createBuffer(num_samples)
      )
    );
  },

  mp_js_hal_audio_speech_init: function (sample_rate) {
    board.audio.speech.init(sample_rate);
  },

  mp_js_hal_audio_speech_write_data: function (buf, num_samples) {
    board.audio.speech.writeData(
      conversions.convertAudioBuffer(
        buf,
        board.audio.speech.createBuffer(num_samples)
      )
    );
  },

  mp_js_hal_audio_period_us: function (period_us) {
    board.audio.setPeriodUs(period_us);
  },

  mp_js_hal_audio_amplitude_u10: function (amplitude_u10) {
    board.audio.setAmplitudeU10(amplitude_u10);
  },

  mp_js_hal_microphone_init: function () {
    board.microphone.microphoneOn();
  },

  mp_js_hal_microphone_set_threshold: function (kind, value) {
    board.microphone.setThreshold(
      // `+ 1` is temporary, see https://github.com/microbit-foundation/micropython-microbit-v2/pull/109
      conversions.convertSoundEventNumberToString(kind + 1),
      value
    );
  },

  mp_js_hal_microphone_get_level: function () {
    return board.microphone.soundLevel.value;
  },

  mp_js_hal_audio_play_expression_by_name: function (name) {
    return board.audio.playSoundExpression(UTF8ToString(name));
  },

  mp_js_hal_audio_stop_expression: function () {
    return board.audio.stopSoundExpression();
  },

  mp_js_hal_audio_is_expression_active: function () {
    return board.audio.isSoundExpressionActive();
  },

  mp_js_radio_enable: function (group, max_payload, queue) {
    board.radio.enable({ group, maxPayload: max_payload, queue });
  },

  mp_js_radio_disable: function () {
    board.radio.disable();
  },

  mp_js_radio_update_config: function (group, max_payload, queue) {
    board.radio.updateConfig({ group, maxPayload: max_payload, queue });
  },

  mp_js_radio_send: function (buf, len, buf2, len2) {
    const data = new Uint8Array(len + len2);
    data.set(HEAPU8.slice(buf, buf + len));
    data.set(HEAPU8.slice(buf2, buf2 + len2), len);
    board.radio.send(data);
  },

  mp_js_radio_peek: function () {
    const packet = board.radio.peek();
    if (packet) {
      return board.operations.writeRadioRxBuffer(packet);
    }
    return null;
  },

  mp_js_radio_pop: function () {
    board.radio.pop();
  },

  mp_js_hal_log_delete: function (full_erase) {
    // We don't have a notion of non-full erase.
    board.dataLogging.delete();
  },

  mp_js_hal_log_set_mirroring: function (serial) {
    board.dataLogging.setMirroring(serial);
  },

  mp_js_hal_log_set_timestamp: function (period) {
    board.dataLogging.setTimestamp(period);
  },

  mp_js_hal_log_begin_row: function () {
    return board.dataLogging.beginRow();
  },

  mp_js_hal_log_end_row: function () {
    return board.dataLogging.endRow();
  },

  mp_js_hal_log_data: function (key, value) {
    return board.dataLogging.logData(UTF8ToString(key), UTF8ToString(value));
  },
});
