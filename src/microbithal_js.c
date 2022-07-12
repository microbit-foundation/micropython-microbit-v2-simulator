// Implementation of the microbit HAL for a JavaScript/browser environment.

#include <emscripten.h>
#include "py/runtime.h"
#include "py/mphal.h"
#include "shared/runtime/interrupt_char.h"
#include "microbithal.h"
#include "microbithal_js.h"
#include "jshal.h"

#define BITMAP_FONT_ASCII_START 32
#define BITMAP_FONT_ASCII_END 126
#define BITMAP_FONT_WIDTH 5
#define BITMAP_FONT_HEIGHT 5

// This font data is taken from the CODAL source.
const unsigned char pendolino3[475] = {
0x0, 0x0, 0x0, 0x0, 0x0, 0x8, 0x8, 0x8, 0x0, 0x8, 0xa, 0x4a, 0x40, 0x0, 0x0, 0xa, 0x5f, 0xea, 0x5f, 0xea, 0xe, 0xd9, 0x2e, 0xd3, 0x6e, 0x19, 0x32, 0x44, 0x89, 0x33, 0xc, 0x92, 0x4c, 0x92, 0x4d, 0x8, 0x8, 0x0, 0x0, 0x0, 0x4, 0x88, 0x8, 0x8, 0x4, 0x8, 0x4, 0x84, 0x84, 0x88, 0x0, 0xa, 0x44, 0x8a, 0x40, 0x0, 0x4, 0x8e, 0xc4, 0x80, 0x0, 0x0, 0x0, 0x4, 0x88, 0x0, 0x0, 0xe, 0xc0, 0x0, 0x0, 0x0, 0x0, 0x8, 0x0, 0x1, 0x22, 0x44, 0x88, 0x10, 0xc, 0x92, 0x52, 0x52, 0x4c, 0x4, 0x8c, 0x84, 0x84, 0x8e, 0x1c, 0x82, 0x4c, 0x90, 0x1e, 0x1e, 0xc2, 0x44, 0x92, 0x4c, 0x6, 0xca, 0x52, 0x5f, 0xe2, 0x1f, 0xf0, 0x1e, 0xc1, 0x3e, 0x2, 0x44, 0x8e, 0xd1, 0x2e, 0x1f, 0xe2, 0x44, 0x88, 0x10, 0xe, 0xd1, 0x2e, 0xd1, 0x2e, 0xe, 0xd1, 0x2e, 0xc4, 0x88, 0x0, 0x8, 0x0, 0x8, 0x0, 0x0, 0x4, 0x80, 0x4, 0x88, 0x2, 0x44, 0x88, 0x4, 0x82, 0x0, 0xe, 0xc0, 0xe, 0xc0, 0x8, 0x4, 0x82, 0x44, 0x88, 0xe, 0xd1, 0x26, 0xc0, 0x4, 0xe, 0xd1, 0x35, 0xb3, 0x6c, 0xc, 0x92, 0x5e, 0xd2, 0x52, 0x1c, 0x92, 0x5c, 0x92, 0x5c, 0xe, 0xd0, 0x10, 0x10, 0xe, 0x1c, 0x92, 0x52, 0x52, 0x5c, 0x1e, 0xd0, 0x1c, 0x90, 0x1e, 0x1e, 0xd0, 0x1c, 0x90, 0x10, 0xe, 0xd0, 0x13, 0x71, 0x2e, 0x12, 0x52, 0x5e, 0xd2, 0x52, 0x1c, 0x88, 0x8, 0x8, 0x1c, 0x1f, 0xe2, 0x42, 0x52, 0x4c, 0x12, 0x54, 0x98, 0x14, 0x92, 0x10, 0x10, 0x10, 0x10, 0x1e, 0x11, 0x3b, 0x75, 0xb1, 0x31, 0x11, 0x39, 0x35, 0xb3, 0x71, 0xc, 0x92, 0x52, 0x52, 0x4c, 0x1c, 0x92, 0x5c, 0x90, 0x10, 0xc, 0x92, 0x52, 0x4c, 0x86, 0x1c, 0x92, 0x5c, 0x92, 0x51, 0xe, 0xd0, 0xc, 0x82, 0x5c, 0x1f, 0xe4, 0x84, 0x84, 0x84, 0x12, 0x52, 0x52, 0x52, 0x4c, 0x11, 0x31, 0x31, 0x2a, 0x44, 0x11, 0x31, 0x35, 0xbb, 0x71, 0x12, 0x52, 0x4c, 0x92, 0x52, 0x11, 0x2a, 0x44, 0x84, 0x84, 0x1e, 0xc4, 0x88, 0x10, 0x1e, 0xe, 0xc8, 0x8, 0x8, 0xe, 0x10, 0x8, 0x4, 0x82, 0x41, 0xe, 0xc2, 0x42, 0x42, 0x4e, 0x4, 0x8a, 0x40, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x1f, 0x8, 0x4, 0x80, 0x0, 0x0, 0x0, 0xe, 0xd2, 0x52, 0x4f, 0x10, 0x10, 0x1c, 0x92, 0x5c, 0x0, 0xe, 0xd0, 0x10, 0xe, 0x2, 0x42, 0x4e, 0xd2, 0x4e, 0xc, 0x92, 0x5c, 0x90, 0xe, 0x6, 0xc8, 0x1c, 0x88, 0x8, 0xe, 0xd2, 0x4e, 0xc2, 0x4c, 0x10, 0x10, 0x1c, 0x92, 0x52, 0x8, 0x0, 0x8, 0x8, 0x8, 0x2, 0x40, 0x2, 0x42, 0x4c, 0x10, 0x14, 0x98, 0x14, 0x92, 0x8, 0x8, 0x8, 0x8, 0x6, 0x0, 0x1b, 0x75, 0xb1, 0x31, 0x0, 0x1c, 0x92, 0x52, 0x52, 0x0, 0xc, 0x92, 0x52, 0x4c, 0x0, 0x1c, 0x92, 0x5c, 0x90, 0x0, 0xe, 0xd2, 0x4e, 0xc2, 0x0, 0xe, 0xd0, 0x10, 0x10, 0x0, 0x6, 0xc8, 0x4, 0x98, 0x8, 0x8, 0xe, 0xc8, 0x7, 0x0, 0x12, 0x52, 0x52, 0x4f, 0x0, 0x11, 0x31, 0x2a, 0x44, 0x0, 0x11, 0x31, 0x35, 0xbb, 0x0, 0x12, 0x4c, 0x8c, 0x92, 0x0, 0x11, 0x2a, 0x44, 0x98, 0x0, 0x1e, 0xc4, 0x88, 0x1e, 0x6, 0xc4, 0x8c, 0x84, 0x86, 0x8, 0x8, 0x8, 0x8, 0x8, 0x18, 0x8, 0xc, 0x88, 0x18, 0x0, 0x0, 0xc, 0x83, 0x60};

static uint16_t button_state[2];

void microbit_hal_init(void) {
    mp_js_hal_init();
}

static void microbit_hal_process_events(void) {
    // Call microbit_hal_timer_callback() every 6ms.
    static uint32_t last_ms = 0;
    uint32_t ms = mp_hal_ticks_ms();
    if (ms - last_ms >= 6) {
        last_ms = ms;
        extern void microbit_hal_timer_callback(void);
        microbit_hal_timer_callback();
    }

    // Process stdin.
    int c = mp_js_hal_stdin_pop_char();
    if (c >= 0) {
        if (c == mp_interrupt_char) {
            mp_sched_keyboard_interrupt();
        } else {
            ringbuf_put(&stdin_ringbuf, c);
        }
    }
}

void microbit_hal_background_processing(void) {
    microbit_hal_process_events();
    emscripten_sleep(0);
}

void microbit_hal_idle(void) {
    microbit_hal_process_events();
    emscripten_sleep(5);
}

void microbit_hal_reset(void) {
    //microbit_reset();
}

void microbit_hal_panic(int code) {
    //microbit_panic(code);
}

int microbit_hal_temperature(void) {
    return mp_js_hal_temperature();
}

void microbit_hal_pin_set_pull(int pin, int pull) {
    //pin_obj[pin]->setPull(pin_pull_mode_mapping[pull]);
    //pin_pull_state[pin] = pull;
}

int microbit_hal_pin_get_pull(int pin) {
    //return pin_pull_state[pin];
    return 0;
}

int microbit_hal_pin_set_analog_period_us(int pin, int period) {
    // Change the audio virtual-pin period if the pin is the special mixer pin.
    if (pin == MICROBIT_HAL_PIN_MIXER) {
        mp_js_hal_audio_period_us(period);
        return 0;
    }

    /*
    // Calling setAnalogPeriodUs requires the pin to be in analog-out mode.  So
    // test for this mode by first calling getAnalogPeriodUs, and if it fails then
    // attempt to configure the pin in analog-out mode by calling setAnalogValue.
    if ((ErrorCode)pin_obj[pin]->getAnalogPeriodUs() == DEVICE_NOT_SUPPORTED) {
        if (pin_obj[pin]->setAnalogValue(0) != DEVICE_OK) {
            return -1;
        }
    }

    // Set the analog period.
    if (pin_obj[pin]->setAnalogPeriodUs(period) == DEVICE_OK) {
        return 0;
    } else {
        return -1;
    }
    */
    return -1;
}

int microbit_hal_pin_get_analog_period_us(int pin) {
    /*
    int period = pin_obj[pin]->getAnalogPeriodUs();
    if (period != DEVICE_NOT_SUPPORTED) {
        return period;
    } else {
        return -1;
    }
    */
    return -1;
}

void microbit_hal_pin_set_touch_mode(int pin, int mode) {
    //pin_obj[pin]->isTouched((TouchMode)mode);
}

int microbit_hal_pin_read(int pin) {
    //return pin_obj[pin]->getDigitalValue();
    return 0;
}

void microbit_hal_pin_write(int pin, int value) {
    //pin_obj[pin]->setDigitalValue(value);
}

int microbit_hal_pin_read_analog_u10(int pin) {
    //return pin_obj[pin]->getAnalogValue();
    return 0;
}

void microbit_hal_pin_write_analog_u10(int pin, int value) {
    if (pin == MICROBIT_HAL_PIN_MIXER) {
        mp_js_hal_audio_amplitude_u10(value);
        return;
    }
    /*
    pin_obj[pin]->setAnalogValue(value);
    */
}

int microbit_hal_pin_is_touched(int pin) {
    if (pin == MICROBIT_HAL_PIN_FACE) {
        return mp_js_hal_pin_is_touched(pin);
    }
    /*
    if (pin == MICROBIT_HAL_PIN_FACE) {
        // For touch on the face/logo, delegate to the TouchButton instance.
        return uBit.logo.buttonActive();
    }
    return pin_obj[pin]->isTouched();
    */
    return 0;
}

void microbit_hal_pin_write_ws2812(int pin, const uint8_t *buf, size_t len) {
    //neopixel_send_buffer(*pin_obj[pin], buf, len);
}

int microbit_hal_i2c_init(int scl, int sda, int freq) {
    /*
    // TODO set pins
    int ret = uBit.i2c.setFrequency(freq);
    if (ret != DEVICE_OK) {
        return ret;;
    }
    */
    return 0;
}

int microbit_hal_i2c_readfrom(uint8_t addr, uint8_t *buf, size_t len, int stop) {
    /*
    int ret = uBit.i2c.read(addr << 1, (uint8_t *)buf, len, !stop);
    if (ret != DEVICE_OK) {
        return ret;
    }
    */
    return 0;
}

int microbit_hal_i2c_writeto(uint8_t addr, const uint8_t *buf, size_t len, int stop) {
    /*
    int ret = uBit.i2c.write(addr << 1, (uint8_t *)buf, len, !stop);
    if (ret != DEVICE_OK) {
        return ret;
    }
    */
    return 0;
}

int microbit_hal_uart_init(int tx, int rx, int baudrate, int bits, int parity, int stop) {
    /*
    // TODO set bits, parity stop
    int ret = uBit.serial.redirect(*pin_obj[tx], *pin_obj[rx]);
    if (ret != DEVICE_OK) {
        return ret;
    }
    ret = uBit.serial.setBaud(baudrate);
    if (ret != DEVICE_OK) {
        return ret;
    }
    */
    return 0;
}

//static NRF52SPI *spi = NULL;

int microbit_hal_spi_init(int sclk, int mosi, int miso, int frequency, int bits, int mode) {
    /*
    if (spi != NULL) {
        delete spi;
    }
    spi = new NRF52SPI(*pin_obj[mosi], *pin_obj[miso], *pin_obj[sclk], NRF_SPIM2);
    int ret = spi->setFrequency(frequency);
    if (ret != DEVICE_OK) {
        return ret;
    }
    ret = spi->setMode(mode, bits);
    if (ret != DEVICE_OK) {
        return ret;
    }
    */
    return 0;
}

int microbit_hal_spi_transfer(size_t len, const uint8_t *src, uint8_t *dest) {
    /*
    int ret;
    if (dest == NULL) {
        ret = spi->transfer(src, len, NULL, 0);
    } else {
        ret = spi->transfer(src, len, dest, len);
    }
    return ret;
    */
    return 0;
}

int microbit_hal_button_state(int button, int *was_pressed, int *num_presses) {
    /*
    Button *b = button_obj[button];
    if (was_pressed != NULL || num_presses != NULL) {
        uint16_t state = button_state[button];
        int p = b->wasPressed();
        if (p) {
            // Update state based on number of presses since last call.
            // Low bit is "was pressed at least once", upper bits are "number of presses".
            state = (state + (p << 1)) | 1;
        }
        if (was_pressed != NULL) {
            *was_pressed = state & 1;
            state &= ~1;
        }
        if (num_presses != NULL) {
            *num_presses = state >> 1;
            state &= 1;
        }
        button_state[button] = state;
    }
    return b->isPressed();
    */
    // Unlike CODAL, MicroPython clears the state for num_presses count
    // and was_pressed independently, so we keep the state here in the same way.
    if (was_pressed != NULL || num_presses != NULL) {
        uint16_t state = button_state[button];
        int p = mp_js_hal_button_get_presses(button);
        if (p) {
            // Update state based on number of presses since last call.
            // Low bit is "was pressed at least once", upper bits are "number of presses".
            state = (state + (p << 1)) | 1;
        }
        if (was_pressed != NULL) {
            *was_pressed = state & 1;
            state &= ~1;
        }
        if (num_presses != NULL) {
            *num_presses = state >> 1;
            state &= 1;
        }
        button_state[button] = state;
    }
    return mp_js_hal_button_is_pressed(button);
}

void microbit_hal_display_enable(int value) {
    /*
    if (value) {
        uBit.display.enable();
    } else {
        uBit.display.disable();
    }
    */
}

void microbit_hal_display_clear(void) {
    mp_js_hal_display_clear();
}

int microbit_hal_display_get_pixel(int x, int y) {
    return mp_js_hal_display_get_pixel(x, y);
}

void microbit_hal_display_set_pixel(int x, int y, int bright) {
    mp_js_hal_display_set_pixel(x, y, bright);
}

int microbit_hal_display_read_light_level(void) {
    return mp_js_hal_display_read_light_level();
}

void microbit_hal_accelerometer_get_sample(int axis[3]) {
    axis[0] = mp_js_hal_accelerometer_get_x();
    axis[1] = mp_js_hal_accelerometer_get_y();
    axis[2] = mp_js_hal_accelerometer_get_z();
}

int microbit_hal_accelerometer_get_gesture(void) {
    return mp_js_hal_accelerometer_get_gesture();
}

void microbit_hal_accelerometer_set_range(int r) {
    return mp_js_hal_accelerometer_set_range(r);
}

int microbit_hal_compass_is_calibrated(void) {
    /*
    return uBit.compass.isCalibrated();
    */
    return 0;
}

void microbit_hal_compass_clear_calibration(void) {
    /*
    uBit.compass.clearCalibration();
    */
}

void microbit_hal_compass_calibrate(void) {
    /*
    uBit.compass.calibrate();
    */
}

void microbit_hal_compass_get_sample(int axis[3]) {
    /*
    Sample3D sample = uBit.compass.getSample();
    axis[0] = sample.x;
    axis[1] = sample.y;
    axis[2] = sample.z;
    */
}

int microbit_hal_compass_get_field_strength(void) {
    /*
    return uBit.compass.getFieldStrength();
    */
    return 0;
}

int microbit_hal_compass_get_heading(void) {
    /*
    return uBit.compass.heading();
    */
    return 0;
}

const uint8_t *microbit_hal_get_font_data(char c) {
    if (c < BITMAP_FONT_ASCII_START || c > BITMAP_FONT_ASCII_END)
        return NULL;

    return pendolino3 + (c-BITMAP_FONT_ASCII_START) * ((1 + (BITMAP_FONT_WIDTH / 8)) * BITMAP_FONT_HEIGHT);
}

void microbit_hal_log_delete(bool full_erase) {
    /*
    uBit.log.clear(full_erase);
    */
}

void microbit_hal_log_set_mirroring(bool serial) {
    /*
    uBit.log.setSerialMirroring(serial);
    */
}

void microbit_hal_log_set_timestamp(int period) {
    /*
    static_assert(MICROBIT_HAL_LOG_TIMESTAMP_NONE == (int)TimeStampFormat::None);
    static_assert(MICROBIT_HAL_LOG_TIMESTAMP_MILLISECONDS == (int)TimeStampFormat::Milliseconds);
    static_assert(MICROBIT_HAL_LOG_TIMESTAMP_SECONDS == (int)TimeStampFormat::Seconds);
    static_assert(MICROBIT_HAL_LOG_TIMESTAMP_MINUTES == (int)TimeStampFormat::Minutes);
    static_assert(MICROBIT_HAL_LOG_TIMESTAMP_HOURS == (int)TimeStampFormat::Hours);
    static_assert(MICROBIT_HAL_LOG_TIMESTAMP_DAYS == (int)TimeStampFormat::Days);
    uBit.log.setTimeStamp((TimeStampFormat)period);
    */
}

int microbit_hal_log_begin_row(void) {
    /*
    if (uBit.log.beginRow() != DEVICE_OK) {
        return -1;
    }
    return 0;
    */
    return 0;
}

int microbit_hal_log_end_row(void) {
    /*
    if (uBit.log.endRow() != DEVICE_OK) {
        return -1;
    }
    return 0;
    */
    return 0;
}

int microbit_hal_log_data(const char *key, const char *value) {
    /*
    if (uBit.log.logData(key, value) != DEVICE_OK) {
        return -1;
    }
    return 0;
    */
    return 0;
}

// This is needed by the microbitfs implementation.
uint32_t rng_generate_random_word(void) {
    //return uBit.random(65536) << 16 | uBit.random(65536);
    return 0;
}

void microbit_hal_audio_select_pin(int pin) {
    /*
    if (pin < 0) {
        uBit.audio.setPinEnabled(false);
    } else {
        uBit.audio.setPinEnabled(true);
        uBit.audio.setPin(*pin_obj[pin]);
    }
    */
}

void microbit_hal_audio_select_speaker(bool enable) {
    /*
    uBit.audio.setSpeakerEnabled(enable);
    */
}

// Input value has range 0-255 inclusive.
void microbit_hal_audio_set_volume(int value) {
    /*
    if (value >= 255) {
        uBit.audio.setVolume(128);
    } else {
        uBit.audio.setVolume(value / 2);
    }
    */
}

void microbit_hal_sound_synth_callback(int event) {
    /*
    if (event == DEVICE_SOUND_EMOJI_SYNTHESIZER_EVT_DONE) {
        --sound_synth_active_count;
    }
    */
}

bool microbit_hal_audio_is_expression_active(void) {
    /*
    return sound_synth_active_count > 0;
    */
    return 0;
}

void microbit_hal_audio_play_expression_by_name(const char *name) {
    /*
    ++sound_synth_active_count;
    uBit.audio.soundExpressions.stop();
    uBit.audio.soundExpressions.playAsync(name);
    */
}

void microbit_hal_audio_stop_expression(void) {
    /*
    uBit.audio.soundExpressions.stop();
    */
}

void microbit_hal_audio_init(uint32_t sample_rate) {
    /*
    if (!data_source.started) {
        MicroBitAudio::requestActivation();
        data_source.started = true;
        data_source.callback = microbit_hal_audio_ready_callback;
        uBit.audio.mixer.addChannel(data_source, sample_rate, 255);
    }
    */
}

void microbit_hal_audio_write_data(const uint8_t *buf, size_t num_samples) {
    /*
    if ((size_t)data_source.buf.length() != num_samples) {
        data_source.buf = ManagedBuffer(num_samples);
    }
    memcpy(data_source.buf.getBytes(), buf, num_samples);
    data_source.sink->pullRequest();
    */
}

void microbit_hal_audio_speech_init(uint32_t sample_rate) {
    /*
    if (!speech_source.started) {
        MicroBitAudio::requestActivation();
        speech_source.started = true;
        speech_source.callback = microbit_hal_audio_speech_ready_callback;
        uBit.audio.mixer.addChannel(speech_source, sample_rate, 255);
    }
    */
}

void microbit_hal_audio_speech_write_data(const uint8_t *buf, size_t num_samples) {
    /*
    if ((size_t)speech_source.buf.length() != num_samples) {
        speech_source.buf = ManagedBuffer(num_samples);
    }
    memcpy(speech_source.buf.getBytes(), buf, num_samples);
    speech_source.sink->pullRequest();
    */
}

void microbit_hal_microphone_init(void) {
    /*
    if (mic == NULL) {
        mic = uBit.adc.getChannel(uBit.io.microphone);
        mic->setGain(7, 0);

        processor = new StreamNormalizer(mic->output, 0.05, true, DATASTREAM_FORMAT_8BIT_SIGNED);
        level = new LevelDetector(processor->output, 600, 200);

        uBit.io.runmic.setDigitalValue(1);
        uBit.io.runmic.setHighDrive(true);
    }
    */
}

void microbit_hal_microphone_set_threshold(int kind, int value) {
    /*
    value = value * SOUND_LEVEL_MAXIMUM / 255;
    if (kind == 0) {
        level->setLowThreshold(value);
    } else {
        level->setHighThreshold(value);
    }
    */
}

int microbit_hal_microphone_get_level(void) {
    /*
    if (level == NULL) {
        return -1;
    } else {
        int l = level->getValue();
        l = min(255, l * 255 / SOUND_LEVEL_MAXIMUM);
        return l;
    }
    */
    return 0;
}
