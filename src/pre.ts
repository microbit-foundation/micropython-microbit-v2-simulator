import { createBoard, BoardUI } from "./board/ui";
import { FileSystem } from "./board/fs";
import * as constants from "./board/constants";

declare global {
  interface Window {
    board: BoardUI;
    fs: FileSystem;
    constants: typeof constants;

    conversions: {
      convertAudioBuffer: (source: number, target: AudioBuffer) => void;
    };

    HEAPU8: Uint8Array;
  }
}

// Initialize the globals used by the HAL.
window.fs = new FileSystem();
const onSensorChange = () =>
  window.parent.postMessage(
    {
      kind: "sensor_change",
      sensors: window.board.sensors,
    },
    "*"
  );
window.board = createBoard(onSensorChange);
window.constants = constants;
window.conversions = {
  convertAudioBuffer: (source: number, target: AudioBuffer) => {
    const channel = target.getChannelData(0);
    const heap = window.HEAPU8;
    for (let i = 0; i < channel.length; ++i) {
      // Convert from uint8 to -1..+1 float.
      channel[i] = (heap[source + i] / 255) * 2 - 1;
    }
    return target;
  },
};
