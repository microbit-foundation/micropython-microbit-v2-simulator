// Matches microbithal.h

// General error codes, only define the ones needed by this HAL.
export const MICROBIT_HAL_DEVICE_OK = 0;
export const MICROBIT_HAL_DEVICE_NO_RESOURCES = -1;
export const MICROBIT_HAL_DEVICE_ERROR = -2;

// These numbers refer to indices in the (private) pin_obj table.
export const MICROBIT_HAL_PIN_P0 = 0;
export const MICROBIT_HAL_PIN_P1 = 1;
export const MICROBIT_HAL_PIN_P2 = 2;
export const MICROBIT_HAL_PIN_P3 = 3;
export const MICROBIT_HAL_PIN_P4 = 4;
export const MICROBIT_HAL_PIN_P5 = 5;
export const MICROBIT_HAL_PIN_P6 = 6;
export const MICROBIT_HAL_PIN_P7 = 7;
export const MICROBIT_HAL_PIN_P8 = 8;
export const MICROBIT_HAL_PIN_P9 = 9;
export const MICROBIT_HAL_PIN_P10 = 10;
export const MICROBIT_HAL_PIN_P11 = 11
export const MICROBIT_HAL_PIN_P12 = 12;
export const MICROBIT_HAL_PIN_P13 = 13;
export const MICROBIT_HAL_PIN_P14 = 14;
export const MICROBIT_HAL_PIN_P15 = 15;
export const MICROBIT_HAL_PIN_P16 = 16;
export const MICROBIT_HAL_PIN_P19 = 17;
export const MICROBIT_HAL_PIN_P20 = 18;
export const MICROBIT_HAL_PIN_FACE = 19;
export const MICROBIT_HAL_PIN_SPEAKER = 20;
export const MICROBIT_HAL_PIN_USB_TX = 30;
export const MICROBIT_HAL_PIN_USB_RX = 31;
export const MICROBIT_HAL_PIN_MIXER = 33;

// These match the micro:bit v1 constants.
export const MICROBIT_HAL_PIN_PULL_UP = 0;
export const MICROBIT_HAL_PIN_PULL_DOWN = 1;
export const MICROBIT_HAL_PIN_PULL_NONE = 2;

export const MICROBIT_HAL_PIN_TOUCH_RESISTIVE = 0;
export const MICROBIT_HAL_PIN_TOUCH_CAPACITIVE = 1;

export const MICROBIT_HAL_ACCELEROMETER_EVT_NONE = 0;
export const MICROBIT_HAL_ACCELEROMETER_EVT_TILT_UP = 1;
export const MICROBIT_HAL_ACCELEROMETER_EVT_TILT_DOWN = 2;
export const MICROBIT_HAL_ACCELEROMETER_EVT_TILT_LEFT = 3;
export const MICROBIT_HAL_ACCELEROMETER_EVT_TILT_RIGHT = 4;
export const MICROBIT_HAL_ACCELEROMETER_EVT_FACE_UP = 5;
export const MICROBIT_HAL_ACCELEROMETER_EVT_FACE_DOWN = 6;
export const MICROBIT_HAL_ACCELEROMETER_EVT_FREEFALL = 7;
export const MICROBIT_HAL_ACCELEROMETER_EVT_3G = 8;
export const MICROBIT_HAL_ACCELEROMETER_EVT_6G = 9;
export const MICROBIT_HAL_ACCELEROMETER_EVT_8G = 10;
export const MICROBIT_HAL_ACCELEROMETER_EVT_SHAKE = 11;
export const MICROBIT_HAL_ACCELEROMETER_EVT_2G = 12;

// Microphone events, passed to microbit_hal_level_detector_callback().
export const MICROBIT_HAL_MICROPHONE_EVT_THRESHOLD_LOW = 1;
export const MICROBIT_HAL_MICROPHONE_EVT_THRESHOLD_HIGH = 2;

// Threshold kind, passed to microbit_hal_microphone_set_threshold().
export const MICROBIT_HAL_MICROPHONE_SET_THRESHOLD_LOW = 0;
export const MICROBIT_HAL_MICROPHONE_SET_THRESHOLD_HIGH = 1;

export const MICROBIT_HAL_LOG_TIMESTAMP_NONE = 0;
export const MICROBIT_HAL_LOG_TIMESTAMP_MILLISECONDS = 1;
export const MICROBIT_HAL_LOG_TIMESTAMP_SECONDS = 10;
export const MICROBIT_HAL_LOG_TIMESTAMP_MINUTES = 600;
export const MICROBIT_HAL_LOG_TIMESTAMP_HOURS = 36000;
export const MICROBIT_HAL_LOG_TIMESTAMP_DAYS = 864000;
