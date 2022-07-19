import { createBoard, BoardUI } from "./board/ui";
import { FileSystem } from "./board/fs";
import * as constants from "./board/constants";

declare global {
  interface Window {
    board: BoardUI;
    fs: FileSystem;
    constants: typeof constants;
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
