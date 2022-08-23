import * as conversions from "./board/conversions";
import { FileSystem } from "./board/fs";
import { WebAssemblyOperations } from "./board/wasm";
import {
  Board,
  createBoard,
  createMessageListener,
  Notifications,
} from "./board";

declare global {
  interface Window {
    board: Board;
    fs: FileSystem;
    conversions: typeof conversions;

    HEAPU8: Uint8Array;
  }
}

// Initialize the globals used by the HAL.
window.fs = new FileSystem();
window.board = createBoard(
  new WebAssemblyOperations(),
  new Notifications(window.parent),
  window.fs
);
window.conversions = conversions;

window.addEventListener("message", createMessageListener(window.board));
