import * as conversions from "./board/conversions";
import { FileSystem } from "./board/fs";
import { EmscriptenModule } from "./board/wasm";
import {
  Board,
  createBoard,
  createMessageListener,
  Notifications,
} from "./board";
import { flags } from "./flags";

declare global {
  interface Window {
    // Provided by firmware.js
    createModule: (args: object) => Promise<EmscriptenModule>;
  }
}

function initServiceWorker() {
  window.addEventListener("load", () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").then(
        (registration) => {
          console.log("Simulator service worker registration successful");
          // Reload the page when a new service worker is installed.
          registration.onupdatefound = function () {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = function () {
                if (
                  installingWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  window.location.reload();
                }
              };
            }
          };
        },
        (error) => {
          console.error(
            `Simulator service worker registration failed: ${error}`
          );
        }
      );
    } else {
      console.error("Service workers are not supported.");
    }
  });
}

if (flags.sw) {
  initServiceWorker();
}
const fs = new FileSystem();
const board = createBoard(new Notifications(window.parent), fs);
window.addEventListener("message", createMessageListener(board));
