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

void mp_js_hal_init(void);
void mp_js_hal_deinit(void);

uint32_t mp_js_rng_generate_random_word();

uint32_t mp_js_hal_ticks_ms(void);
void mp_js_hal_stdout_tx_strn(const char *ptr, size_t len);
int mp_js_hal_stdin_pop_char(void);

int mp_js_hal_filesystem_find(const char *name, size_t len);
int mp_js_hal_filesystem_create(const char *name, size_t len);
int mp_js_hal_filesystem_name(int idx, char *buf);
int mp_js_hal_filesystem_size(int idx);
void mp_js_hal_filesystem_remove(int idx);
int mp_js_hal_filesystem_readbyte(int idx, size_t offset);
bool mp_js_hal_filesystem_write(int idx, const char *buf, size_t len);

void mp_js_hal_panic(int code);
__attribute__((noreturn)) void mp_js_hal_reset(void);

int mp_js_hal_temperature(void);

int mp_js_hal_button_get_presses(int button);
bool mp_js_hal_button_is_pressed(int button);

bool mp_js_hal_pin_is_touched(int pin);
int mp_js_hal_pin_get_touches(int pin);
int mp_js_hal_pin_get_analog_period_us(int pin);
int mp_js_hal_pin_set_analog_period_us(int pin, int period);

int mp_js_hal_display_get_pixel(int x, int y);
void mp_js_hal_display_set_pixel(int x, int y, int value);
void mp_js_hal_display_clear(void);
int mp_js_hal_display_read_light_level(void);

int mp_js_hal_accelerometer_get_x(void);
int mp_js_hal_accelerometer_get_y(void);
int mp_js_hal_accelerometer_get_z(void);
int mp_js_hal_accelerometer_get_gesture(void);
void mp_js_hal_accelerometer_set_range(int r);

int mp_js_hal_compass_get_x(void);
int mp_js_hal_compass_get_y(void);
int mp_js_hal_compass_get_z(void);
int mp_js_hal_compass_get_field_strength(void);
int mp_js_hal_compass_get_heading(void);

void mp_js_hal_audio_set_volume(int value);
void mp_js_hal_audio_init(uint32_t sample_rate);
void mp_js_hal_audio_write_data(const uint8_t *buf, size_t num_samples);
void mp_js_hal_audio_speech_init(uint32_t sample_rate);
void mp_js_hal_audio_speech_write_data(const uint8_t *buf, size_t num_samples);
void mp_js_hal_audio_period_us(int period);
void mp_js_hal_audio_amplitude_u10(int amplitude);
void mp_js_hal_audio_play_expression(const char *name);
void mp_js_hal_audio_stop_expression(void);
bool mp_js_hal_audio_is_expression_active(void);

void mp_js_hal_microphone_init(void);
void mp_js_hal_microphone_set_threshold(int kind, int value);
int mp_js_hal_microphone_get_level(void);
void mp_js_hal_microphone_start_recording(uint8_t *buf, size_t max_len, size_t *cur_len, int rate);
bool mp_js_hal_microphone_is_recording(void);
void mp_js_hal_microphone_stop_recording(void);

void mp_js_radio_enable(uint8_t group, uint8_t max_payload, uint8_t queue);
void mp_js_radio_disable(void);
void mp_js_radio_update_config(uint8_t group, uint8_t max_payload, uint8_t queue);
void mp_js_radio_send(const void *buf, size_t len, const void *buf2, size_t len2);
uint8_t *mp_js_radio_peek(void);
void mp_js_radio_pop(void);

void mp_js_hal_log_delete(bool full_erase);
void mp_js_hal_log_set_mirroring(bool serial);
void mp_js_hal_log_set_timestamp(int period);
int mp_js_hal_log_begin_row(void);
int mp_js_hal_log_end_row(void);
int mp_js_hal_log_data(const char *key, const char *value);
