import { test, expect } from "@playwright/test";

// Run with playwright.public.config.ts against a normal build, never the E2E account server.

const affected = ["/legal", "/legal-notices", "/pqr"];
for (const route of affected) test(`H02 public main landmark, content and keyboard: ${route}`, async ({ page, context }, info) => {
  const requests: string[] = [];
  page.on("request", request => { if (request.method() !== "GET") requests.push(`${request.method()} ${new URL(request.url()).pathname}`); });
  const response = await page.goto(route);
  expect(response?.status()).toBe(200);
  await expect(page.locator(".legal-page h1")).toHaveText(route === "/pqr" ? "Peticiones, quejas y reclamos" : "Centro Legal y de Privacidad");
  const cookies = page.getByRole("button", { name: "Solo necesarias", exact: true });
  if (await cookies.isVisible()) await cookies.click();
  await expect(page.locator(".public-frame > header")).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  const slug = route.slice(1);
  for (const fullPage of [false, true]) {
    const name = `h02-${slug}-${fullPage ? "full" : "viewport"}`;
    const path = info.outputPath(name + ".png");
    await page.screenshot({ path, fullPage }); await info.attach(name, { path, contentType: "image/png" });
  }
  const structure = await page.evaluate(() => {
    const root = document.querySelector(".public-frame")!;
    const rect = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    return {
      mainCount: document.querySelectorAll("main, [role='main']").length,
      nestedCount: document.querySelectorAll("main main, main [role='main'], [role='main'] main, [role='main'] [role='main']").length,
      headings: Array.from(root.querySelectorAll("h1,h2,h3")).map(el => ({ level: el.tagName, text: el.textContent, rect: rect(el) })),
      text: (root as HTMLElement).innerText,
      links: Array.from(root.querySelectorAll("a")).map(el => ({ text: el.textContent, href: el.getAttribute("href") })),
      controls: Array.from(root.querySelectorAll("input,select,textarea,button")).map(el => ({ tag: el.tagName, type: el.getAttribute("type"), text: el.textContent })),
      regions: [root, root.querySelector(".legal-page")!, root.querySelector("header")!, root.querySelector("footer")!].map(rect),
      skipLinks: Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href^='#']")).map(el => ({ href: el.hash, targetExists: Boolean(document.getElementById(el.hash.slice(1))) })),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  const aria = await page.locator("body").ariaSnapshot();
  const session = await context.newCDPSession(page);
  const ax = await session.send("Accessibility.getFullAXTree"); await session.detach();
  const axMainCount = ax.nodes.filter(node => !node.ignored && node.role?.value === "main").length;
  await info.attach("h02-dom-ax", { body: JSON.stringify({ route, viewport: page.viewportSize(), structure, aria, axMainCount, environment: "public routes; no mocked responses, seeded users or E2E access required" }, null, 2), contentType: "application/json" });
  expect(structure.mainCount).toBe(1);
  expect(structure.nestedCount).toBe(0);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("main")).toBeVisible();
  expect(axMainCount).toBe(1);
  expect(structure.overflow).toBe(false);
  expect(structure.skipLinks.every(link => link.targetExists)).toBe(true);
  // Gratis remains visible at both widths; Terms is intentionally hidden in the mobile header.
  // Actual Tab navigation, without forcing DOM focus.
  const target = page.locator(".public-frame > header a[href='/trial']");
  await expect(target).toBeVisible();
  for (let i = 0; i < 25 && !await target.evaluate(el => el === document.activeElement); i++) await page.keyboard.press("Tab");
  await expect(target).toBeFocused();
  const focus = await target.evaluate(el => ({ visible: el.matches(":focus-visible"), outline: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }));
  expect(focus.visible).toBe(true); expect(focus.outline).not.toBe("none"); expect(parseFloat(focus.width)).toBeGreaterThan(0);
  await page.keyboard.press("Enter"); await expect(page).toHaveURL(/\/trial$/);
  await expect(page.locator(".public-frame h1")).toBeVisible();
  await page.goBack(); await expect(page).toHaveURL(new RegExp(`${route}$`));
  await expect(page.getByRole("main")).toHaveCount(1);
  if (route === "/pqr") {
    await expect(page.locator(".legal-login-card a[href='/login']")).toBeVisible();
    await expect(page.locator(".privacy-request-form")).toHaveCount(0); // Normal signed-out public state, not simulated authentication.
  }
  expect(requests).toEqual([]); // No form, subscription or other write submitted.
  await info.attach("h02-keyboard", { body: JSON.stringify({ route, focus, requests, navigation: "Tab → Gratis → Enter → back", skipLinks: structure.skipLinks }), contentType: "application/json" });
});

test("H02 public frame siblings retain a single main without test authentication", async ({ page }, info) => {
  const results = [];
  for (const route of ["/terms", "/privacy", "/data-policy", "/cookies", "/data-deletion", "/payments", "/retract", "/ai-privacy", "/provider-info", "/security", "/trial", "/login", "/signup", "/verify-email", "/forgot-password", "/upgrade"]) {
    await page.goto(route);
    await expect(page.locator(".public-frame h1")).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.locator("main main, main [role='main'], [role='main'] main")).toHaveCount(0);
    results.push({ route, heading: await page.locator("h1").innerText(), mainCount: await page.getByRole("main").count() });
  }
  await page.goto("/app/today");
  await expect(page).toHaveURL(/\/login/); // E2E's fictitious account must not bypass the normal public login.
  await info.attach("h02-public-siblings", { body: JSON.stringify(results, null, 2), contentType: "application/json" });
});
