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

function initServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then(
        function (_registration) {
          console.log("Simulator ServiceWorker registration successful");
        },
        function (err) {
          console.log("Simulator ServiceWorker registration failed: ", err);
        }
      );
    });
  }
}

initServiceWorker();
const fs = new FileSystem();
const board = createBoard(new Notifications(window.parent), fs);
window.addEventListener("message", createMessageListener(board));
