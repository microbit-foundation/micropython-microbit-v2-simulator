import { defineConfig, devices } from "@playwright/test";
import { SimulatorOptions } from "./e2e/fixtures";

const port = 3000;

export default defineConfig<SimulatorOptions>({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Emscripten assertions catch errors that the release firmware hides,
      // e.g. calling an export with the wrong number of arguments.
      name: "chromium-debug-wasm",
      use: { ...devices["Desktop Chrome"], simulatorFlags: ["debugWasm"] },
    },
  ],
  webServer: {
    // The config turns off clean URLs, whose redirects drop the flags.
    command: `npx serve build -l ${port} -c ../e2e/serve.json`,
    url: `http://localhost:${port}/simulator.html`,
    reuseExistingServer: !process.env.CI,
  },
});
