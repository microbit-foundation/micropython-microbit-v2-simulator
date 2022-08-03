import { createBoard, BoardUI } from "./board/ui";
import { FileSystem } from "./board/fs";
import * as constants from "./board/constants";
import * as conversions from "./board/conversions";
import {
  createMessageListener,
  onSensorChange,
  WebAssemblyOperations,
} from "./board/listener";

declare global {
  interface Window {
    board: BoardUI;
    fs: FileSystem;
    constants: typeof constants;
    conversions: typeof conversions;

    HEAPU8: Uint8Array;
  }
}

// Initialize the globals used by the HAL.
window.fs = new FileSystem();
window.board = createBoard(
  new WebAssemblyOperations(),
  window.fs,
  onSensorChange
);
window.constants = constants;
window.conversions = conversions;

window.addEventListener("message", createMessageListener(window.board));
