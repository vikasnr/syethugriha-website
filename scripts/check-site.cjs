const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'syethugriha-check-'));
const profile = path.join(output, 'profile');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser, socket, sequence = 0, checks = 0;
const pending = new Map(), errors = [];

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve: result => { clearTimeout(timeout); resolve(result); }, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description);
  return result.result.value;
}
async function check(expression, label) {
  assert.equal(await evaluate(expression), true, label); checks++;
}
async function navigate(url) {
  await send('Page.navigate', { url });
  for (let i = 0; i < 100; i++) {
    await delay(50);
    if (await evaluate('document.readyState === "complete" && typeof current !== "undefined" && !!current')) return;
  }
  throw new Error('Page initialization timed out: ' + url);
}
async function screenshot(name) {
  await delay(350);
  const result = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(result.data, 'base64'));
}

(async () => {
  browser = spawn(chrome, ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--allow-file-access-from-files', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  browser.on('error', error => { console.error(error.message); process.exitCode = 1; });
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await delay(100);
  assert.ok(fs.existsSync(portFile), 'Chrome must start with remote debugging');
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.id && pending.has(message.id)) {
      const task = pending.get(message.id); pending.delete(message.id);
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    }
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await navigate(pathToFileURL(path.join(root, 'index.html')).href);
  await check('document.querySelector("#formFallback").hidden === false && document.querySelector("#googleFormHost").hidden', 'Unconfigured form has contact fallback');
  await check('document.querySelector(".wa").href === "https://wa.me/917406061330"', 'WhatsApp uses business number');
  await check('document.querySelector("#homeSvc a:nth-child(1)").textContent.includes("Home Interiors") && document.querySelector("#homeSvc a:nth-child(2)").textContent.includes("Renovation")', 'Primary services lead');
  await check('document.querySelector(".hero img").fetchPriority === "high"', 'Hero image is prioritised');
  await check('matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.documentElement).scrollBehavior === "auto"', 'Reduced motion is respected');
  for (const width of [360, 390, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const route of ['home', 'services', 'projects', 'process', 'experience', 'consult', 'heritage', 'duplex', 'pastel']) {
      await evaluate(`go(${JSON.stringify(route)}, {noPush:true})`);
      await check('document.documentElement.scrollWidth <= innerWidth', `No overflow: ${route} at ${width}px`);
      await check('document.querySelectorAll(".view.on").length === 1', `One active route: ${route}`);
    }
    await evaluate('go("home", {noPush:true})');
    await screenshot(`home-${width}`);
    if(width === 390) {
      await evaluate('go("consult", {noPush:true})'); await screenshot('consult-390');
      await check('getComputedStyle(document.querySelector(".mobile-contact")).display === "grid" && getComputedStyle(document.querySelector(".wa")).display === "none"', 'Mobile contact bar replaces floating button');
      await evaluate('document.querySelector("#burger").focus(); document.querySelector("#burger").click()');
      await check('document.activeElement.id === "dclose" && !document.querySelector("#drawer").inert && document.querySelector("#main").inert', 'Drawer opens and isolates background');
      await evaluate('document.querySelector("#drawer .drawer-foot a:last-child").focus()');
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await check('document.activeElement.id === "dclose"', 'Drawer traps Tab focus');
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await check('document.querySelector("#drawer").inert && !document.querySelector("#main").inert && document.activeElement.id === "burger"', 'Escape closes drawer and restores focus');
    }
  }
  await evaluate('go("projects"); document.querySelector("#rgrid button").click()');
  await check('document.querySelector("#lb").open', 'Gallery opens lightbox');
  const caption = await evaluate('document.querySelector("#lbCap").textContent');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  assert.notEqual(await evaluate('document.querySelector("#lbCap").textContent'), caption); checks++;
  await evaluate('document.querySelector("#lbClose").click(); go("home"); go("services"); history.back()');
  await delay(150); await check('current === "home"', 'Browser back restores route');
  await evaluate('history.forward()'); await delay(150); await check('current === "services"', 'Browser forward restores route');
  await evaluate('go("unknown")'); await check('current === "home"', 'Unknown routes fall back to home');
  await evaluate('go("experience")');
  await check('document.querySelector("#vid .play").getAttribute("aria-label").includes("Play") && document.querySelector("#vid video").getAttribute("preload") === "none"', 'Walkthrough loads on demand');

  // Exercise configuration branches using temporary fixtures; do not submit a form.
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const [label, url, configured] of [
    ['valid', 'https://docs.google.com/forms/d/e/test-public-form/viewform?usp=header', true],
    ['editor', 'https://docs.google.com/forms/d/test/edit', false],
    ['invalid', 'https://example.com/viewform', false]
  ]) {
    const fixture = html.replace('<head>', `<head><base href="${pathToFileURL(root + path.sep).href}">`).replace('<script src="site-config.js"></script>', `<script>const SITE_CONFIG = {googleFormResponderUrl:${JSON.stringify(url)},googleFormEmbedUrl:""};</script>`);
    const fixturePath = path.join(output, `form-${label}.html`); fs.writeFileSync(fixturePath, fixture);
    await navigate(pathToFileURL(fixturePath).href);
    await evaluate('go("consult", {noPush:true})');
    await check(`document.querySelector("#googleFormHost").hidden === ${!configured} && document.querySelector("#formFallback").hidden === ${configured}`, `Google Forms ${label} configuration`);
    if(configured) {
      await check('new URL(document.querySelector("#googleFormHost iframe").src).searchParams.get("embedded") === "true" && document.querySelector("#googleFormLink").href.includes("/viewform")', 'Configured embed and external fallback use responder URL');
    }
  }
  assert.deepEqual(errors, [], 'No uncaught browser exceptions'); checks++;
  console.log(`Passed ${checks} checks. Screenshots: ${output}`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if(socket?.readyState === 1) { try { await send('Browser.close'); } catch {} socket.close(); }
  if(browser && browser.exitCode === null) browser.kill();
});
