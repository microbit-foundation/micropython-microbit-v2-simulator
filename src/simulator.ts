import * as conversions from "./board/conversions";
import { FileSystem } from "./board/fs";
import { EmscriptenModule } from "./board/wasm";
import {
  Board,
  createBoard,
  createMessageListener,
  Notifications,
} from "./board";

declare global {
  interface Window {
    // Provided by firmware.js
    createModule: (args: object) => Promise<EmscriptenModule>;
  }
}

const fs = new FileSystem();
const board = createBoard(new Notifications(window.parent), fs);
window.addEventListener("message", createMessageListener(board));
