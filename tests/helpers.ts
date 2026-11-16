import simpleNetwork from "../snippets/simple-network.html";
import complexNetwork from "../snippets/complex-network.html";
import tripleNetwork from "../snippets/triple-network.html";

export const snippets: Record<string, string> = {
  "simple-network": simpleNetwork,
  "complex-network": complexNetwork,
  "triple-network": tripleNetwork,
};

// The editor model is large and partly private; the tests reach into it freely.
export type Net = any;

export const until = async (fn: () => unknown, what: string, ms = 20000) => {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    try { if (await fn()) return; } catch {}
    await new Promise(r => setTimeout(r, 20));
  }
  throw new Error("timeout waiting for " + what);
};

export const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export const nodes = (el: Net) => [...el.renderRoot.querySelectorAll("ww-node.physical-node")] as HTMLElement[];
export const scene = (el: Net) => el.renderRoot.querySelector("ww-scene") as any;
export const dataBlock = (el: Net) => el.querySelector(':scope > script[type="application/json"][slot="data"]') as HTMLScriptElement;
export const saved = (el: Net) => JSON.parse(dataBlock(el).textContent!);

export const settle = async (el: Net) => {
  await el.updateComplete;
  await wait(50);
  await el.updateComplete;
};

export const move = (el: Net, items: [string, number, number][]) => {
  const detail = { items: items.map(([key, x, y]) => ({ key, item: null, x, y })), dx: 0, dy: 0 };
  const event = new CustomEvent("ww-move", { detail, bubbles: true, composed: true, cancelable: true });
  scene(el).dispatchEvent(event);
  return event;
};

export const connect = (el: Net, from: string, to: string) => {
  const event = new CustomEvent("ww-connect", { detail: { from, to, kind: "edge", source: null, target: null }, bubbles: true, composed: true, cancelable: true });
  scene(el).dispatchEvent(event);
  return event;
};

export const steps = (el: Net) => {
  const log = { start: 0, end: 0 };
  el.addEventListener("ww-transactionstart", () => log.start++);
  el.addEventListener("ww-transactionend", () => log.end++);
  return log;
};

/** Mounts a snippet in document.body. `lang` is put on the wrapping element. */
export const mount = async (attrs = "", lang = "", snippet = "simple-network"): Promise<Net> => {
  const holder = document.createElement("div");
  holder.innerHTML = snippets[snippet].replace(/contenteditable=""/, "").replace("<ww-network", "<ww-network " + attrs);
  if (lang) holder.setAttribute("lang", lang);
  document.body.append(holder);
  const el = holder.querySelector("ww-network") as Net;
  await until(() => el.shadowRoot && el.networkAvailable, "network ready");
  await el.updateComplete;
  return el;
};

export const unmountAll = () => {
  document.designMode = "off";
  document.body.querySelectorAll("ww-network").forEach(el => el.parentElement?.remove());
};
