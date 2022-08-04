import * as conversions from "./board/conversions";
import { FileSystem } from "./board/fs";
import {
  createMessageListener,
  onSensorChange,
  WebAssemblyOperations,
} from "./board/listener";
import { BoardUI, createBoard } from "./board/ui";

declare global {
  interface Window {
    board: BoardUI;
    fs: FileSystem;
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
window.conversions = conversions;

window.addEventListener("message", createMessageListener(window.board));
