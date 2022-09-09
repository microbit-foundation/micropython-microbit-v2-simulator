import {
  MICROBIT_HAL_ACCELEROMETER_EVT_2G,
  MICROBIT_HAL_ACCELEROMETER_EVT_3G,
  MICROBIT_HAL_ACCELEROMETER_EVT_6G,
  MICROBIT_HAL_ACCELEROMETER_EVT_8G,
  MICROBIT_HAL_ACCELEROMETER_EVT_FACE_DOWN,
  MICROBIT_HAL_ACCELEROMETER_EVT_FACE_UP,
  MICROBIT_HAL_ACCELEROMETER_EVT_FREEFALL,
  MICROBIT_HAL_ACCELEROMETER_EVT_NONE,
  MICROBIT_HAL_ACCELEROMETER_EVT_SHAKE,
  MICROBIT_HAL_ACCELEROMETER_EVT_TILT_DOWN,
  MICROBIT_HAL_ACCELEROMETER_EVT_TILT_LEFT,
  MICROBIT_HAL_ACCELEROMETER_EVT_TILT_RIGHT,
  MICROBIT_HAL_ACCELEROMETER_EVT_TILT_UP,
  MICROBIT_HAL_MICROPHONE_SET_THRESHOLD_HIGH,
  MICROBIT_HAL_MICROPHONE_SET_THRESHOLD_LOW,
} from "./constants";

export function convertSoundThresholdNumberToString(
  value: number
): "low" | "high" {
  switch (value) {
    case MICROBIT_HAL_MICROPHONE_SET_THRESHOLD_LOW:
      return "low";
    case MICROBIT_HAL_MICROPHONE_SET_THRESHOLD_HIGH:
      return "high";
    default:
      throw new Error(`Invalid value ${value}`);
  }
}

export function convertAccelerometerStringToNumber(value: string): number {
  switch (value) {
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
      return MICROBIT_HAL_ACCELEROMETER_EVT_6G;
    case "8g":
      return MICROBIT_HAL_ACCELEROMETER_EVT_8G;
    case "shake":
      return MICROBIT_HAL_ACCELEROMETER_EVT_SHAKE;
    default:
      throw new Error(`Invalid value ${value}`);
  }
}

export function convertAccelerometerNumberToString(value: number): string {
  switch (value) {
    case MICROBIT_HAL_ACCELEROMETER_EVT_NONE:
      return "none";
    case MICROBIT_HAL_ACCELEROMETER_EVT_TILT_UP:
      return "up";
    case MICROBIT_HAL_ACCELEROMETER_EVT_TILT_DOWN:
      return "down";
    case MICROBIT_HAL_ACCELEROMETER_EVT_TILT_LEFT:
      return "left";
    case MICROBIT_HAL_ACCELEROMETER_EVT_TILT_RIGHT:
      return "right";
    case MICROBIT_HAL_ACCELEROMETER_EVT_FACE_UP:
      return "face up";
    case MICROBIT_HAL_ACCELEROMETER_EVT_FACE_DOWN:
      return "face down";
    case MICROBIT_HAL_ACCELEROMETER_EVT_FREEFALL:
      return "freefall";
    case MICROBIT_HAL_ACCELEROMETER_EVT_2G:
      return "2g";
    case MICROBIT_HAL_ACCELEROMETER_EVT_3G:
      return "3g";
    case MICROBIT_HAL_ACCELEROMETER_EVT_6G:
      return "6g";
    case MICROBIT_HAL_ACCELEROMETER_EVT_8G:
      return "8g";
    case MICROBIT_HAL_ACCELEROMETER_EVT_SHAKE:
      return "shake";
    default:
      throw new Error(`Invalid value ${value}`);
  }
}

export const convertAudioBuffer = (
  heap: Uint8Array,
  source: number,
  target: AudioBuffer
) => {
  const channel = target.getChannelData(0);
  for (let i = 0; i < channel.length; ++i) {
    // Convert from uint8 to -1..+1 float.
    channel[i] = (heap[source + i] / 255) * 2 - 1;
  }
  return target;
};
