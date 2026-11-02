import { expect, Page, test } from "@playwright/test";

// The test host can't be used here: it's served by page.route, which the
// service worker bypasses. Loaded at the top level, the simulator's parent is
// itself, so this script plays the embedder.
function embedInSelf() {
  const w = window as any;
  w.serial = "";
  window.addEventListener("message", (e) => {
    switch (e.data?.kind) {
      case "serial_output":
        w.serial += e.data.data;
        break;
      case "request_flash":
        window.postMessage(
          {
            kind: "flash",
            filesystem: {
              "main.py": new TextEncoder().encode("print('offline ok')\n"),
            },
          },
          "*",
        );
        break;
    }
  });
}

async function expectRunsProgram(page: Page) {
  await page.locator(".play-button").click();
  await expect
    .poll(() => page.evaluate(() => (window as any).serial))
    .toMatch(/offline ok/);
}

async function installServiceWorker(page: Page) {
  await page.goto("/simulator.html?flag=sw");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve),
      );
    }
  });
}

test("runs offline straight after installing", async ({ page, context }) => {
  await page.addInitScript(embedInSelf);
  await installServiceWorker(page);
  await context.setOffline(true);
  await page.reload();
  await expectRunsProgram(page);
});

test("without the flag an installed service worker is removed", async ({
  page,
}) => {
  await installServiceWorker(page);
  await page.goto("/simulator.html");
  await expect
    .poll(() =>
      page
        .evaluate(async () =>
          Boolean(await navigator.serviceWorker.getRegistration()),
        )
        // The simulator reloads itself after unregistering.
        .catch(() => true),
    )
    .toBe(false);
});
