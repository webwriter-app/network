/// <reference types="mocha" />
import "mocha/mocha.js";
import { assert } from "chai";
import { getMochaConfig } from "@webwriter/build/test";
import "../src/widgets/ww-network";
import { mount, until, unmountAll, scene, saved, settle, wait, type Net } from "./helpers";

mocha.setup(getMochaConfig());

const pointer = (target: EventTarget, type: string, x: number, y: number, buttons: number, pointerType = "touch") =>
  target.dispatchEvent(new PointerEvent(type, { pointerId: 11, pointerType, clientX: x, clientY: y, button: 0, buttons, bubbles: true, composed: true, cancelable: true, isPrimary: true }));

const centre = (element: Element) => {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

const host = (el: Net, id: string) => el.renderRoot.querySelector(`ww-node[data-ww-key="${id}"]`) as HTMLElement;
const part = (el: Net, id: string) => el.renderRoot.querySelector(`#${id}`) as HTMLElement;
const button = (el: Net, label: string) => [...el.renderRoot.querySelectorAll("sl-button")].find((b) => b.getAttribute("aria-label") === label) as HTMLElement;

async function drawn(attrs = 'contenteditable=""', snippet = "complex-network"): Promise<Net> {
  const el = await mount(attrs, "", snippet);
  await settle(el);
  await until(() => el.drawnFrames().size > 0 && scene(el).drawingOf(host(el, "host0")?.closest("ww-group") ?? host(el, "host0")), "the nets are drawn");
  return el;
}

const key = (target: Element, name: string) =>
  target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, composed: true, cancelable: true }));

describe("<ww-network> input", function () {
  this.timeout(30000);
  afterEach(unmountAll);

  describe("keyboard", function () {
    it("deletes the selected host with the Delete key", async function () {
      const el = await drawn();
      const before = saved(el).components.length;
      const node = host(el, "host0");
      node.focus();
      assert.equal(el.shadowRoot!.activeElement, node, "the host takes the focus");
      node.dispatchEvent(new CustomEvent("ww-select", { detail: { keys: ["host0"], items: [] }, bubbles: true, composed: true }));
      await settle(el);
      key(node, "Delete");
      await until(() => saved(el).components.length === before - 1, "the host is gone");
      assert.isNotOk(saved(el).components.find((c: any) => c.id === "host0"));
    });

    it("leaves the diagram alone when Delete is pressed in the simulation", async function () {
      const el = await drawn();
      const before = saved(el).components.length;
      const node = host(el, "host0");
      node.dispatchEvent(new CustomEvent("ww-select", { detail: { keys: ["host0"], items: [] }, bubbles: true, composed: true }));
      el.switchMode("simulate");
      await settle(el);
      host(el, "host0").focus();
      key(host(el, "host0"), "Delete");
      await wait(200);
      assert.equal(saved(el).components.length, before);
    });

    it("opens the toolbox groups with the keyboard and closes them with Escape", async function () {
      const el = await drawn();
      const open = button(el, "Add");
      assert.equal(open.getAttribute("aria-expanded"), "false");
      open.click();
      await settle(el);
      assert.equal(open.getAttribute("aria-expanded"), "true");
      const group = button(el, "Network devices");
      assert.equal(group.getAttribute("aria-expanded"), "false");
      group.click();
      await settle(el);
      assert.equal(group.getAttribute("aria-expanded"), "true", "a tap or Enter opens the group, no hover needed");
      const router = button(el, "Router");
      assert.notEqual(getComputedStyle(router.parentElement!.parentElement!).display, "none", "its buttons are shown");
      key(group, "Escape");
      await settle(el);
      assert.equal(group.getAttribute("aria-expanded"), "false");
      key(open, "Escape");
      await settle(el);
      assert.equal(open.getAttribute("aria-expanded"), "false");
    });

    it("labels every control of the toolbox and the scene", async function () {
      const el = await drawn();
      el.toolboxOpen = true;
      await settle(el);
      for (const control of el.renderRoot.querySelectorAll(".toolbox sl-button")) {
        assert.isNotEmpty(control.getAttribute("aria-label"), "a toolbox button without a label");
      }
      assert.isNotEmpty(el.renderRoot.querySelector(".fullscreenButton")!.getAttribute("aria-label"));
      assert.isNotEmpty(el.renderRoot.querySelector(".modeSwitch sl-select")!.getAttribute("label"));
    });
  });

  describe("touch", function () {
    it("moves a host with a finger", async function () {
      const el = await drawn();
      const node = host(el, "host0");
      const start = centre(node);
      const before = saved(el).components.find((c: any) => c.id === "host0");
      pointer(node, "pointerdown", start.x, start.y, 1);
      for (let i = 1; i <= 6; i++) { pointer(window, "pointermove", start.x + i * 6, start.y + i * 3, 1); await wait(30); }
      pointer(window, "pointerup", start.x + 36, start.y + 18, 0);
      await until(() => {
        const now = saved(el).components.find((c: any) => c.id === "host0");
        return Math.hypot(now.x - before.x, now.y - before.y) > 5;
      }, "the host follows the finger");
    });

    it("makes the toolbox buttons at least 40 pixels wide", async function () {
      const el = await drawn();
      el.toolboxOpen = true;
      await settle(el);
      for (const control of el.renderRoot.querySelectorAll(".toolbox__open, .fullscreenButton")) {
        assert.isAtLeast(control.getBoundingClientRect().width, 40);
      }
    });
  });

  describe("layout", function () {
    const at = async (width: number) => {
      const el = await drawn();
      (el.parentElement as HTMLElement).style.width = `${width}px`;
      await settle(el);
      return el;
    };

    it("fits from 300 to 2100 pixels without scrolling sideways", async function () {
      for (const width of [300, 768, 2100]) {
        const el = await at(width);
        assert.equal(Math.round(el.getBoundingClientRect().width), width, `width ${width}`);
        assert.isAtMost(el.scrollWidth, el.clientWidth + 1, `no sideways scroll at ${width}`);
        const canvas = part(el, "myCanvas").getBoundingClientRect();
        assert.isAtLeast(canvas.height, 400, `height at ${width}`);
        assert.isAtMost(canvas.height, 720, `height at ${width}`);
        unmountAll();
      }
    });

    it("is a size container and caps its width", async function () {
      const el = await at(2400);
      const style = getComputedStyle(el);
      assert.equal(style.containerType, "inline-size");
      assert.isAtMost(el.getBoundingClientRect().width, 2100);
    });

    it("narrows the mode switch below 480 pixels", async function () {
      const narrow = await at(300);
      const wide = await at(900);
      const widthOf = (el: Net) => el.renderRoot.querySelector(".modeSwitch")!.getBoundingClientRect().width;
      assert.isBelow(widthOf(narrow), widthOf(wide));
    });
  });

  describe("theme", function () {
    it("follows the text color and font of the document and keeps the look without them", async function () {
      const plain = await drawn();
      const plainFont = getComputedStyle(plain.renderRoot.querySelector("ww-node.physical-node")!).fontFamily;
      assert.include(plainFont, "monospace", "today's font without a theme");
      assert.equal(getComputedStyle(scene(plain)).color, "rgb(0, 0, 0)", "today's text color without a theme");
      unmountAll();

      const el = await drawn();
      const wrapper = el.parentElement as HTMLElement;
      wrapper.style.setProperty("--ww-text-color", "rgb(10, 20, 30)");
      wrapper.style.setProperty("--ww-font-family", "Georgia, serif");
      wrapper.style.setProperty("--ww-theme-accent-1", "rgb(200, 0, 100)");
      await settle(el);
      assert.equal(getComputedStyle(scene(el)).color, "rgb(10, 20, 30)");
      assert.equal(getComputedStyle(el).color, "rgb(10, 20, 30)");
      assert.include(getComputedStyle(el.renderRoot.querySelector("ww-node.physical-node")!).fontFamily, "Georgia");
      assert.equal(getComputedStyle(scene(el)).getPropertyValue("--ww-scene-selection").trim(), "rgb(200, 0, 100)", "the selection follows the first accent");
    });

    it("names its parts", async function () {
      const el = await drawn();
      assert.equal(part(el, "myCanvas").getAttribute("part"), "canvas");
      assert.isAbove(el.renderRoot.querySelectorAll("[part~=node]").length, 0);
      assert.isAbove(el.renderRoot.querySelectorAll("[part~=edge]").length, 0);
      assert.isAbove(el.renderRoot.querySelectorAll("[part~=net]").length, 0);
    });
  });

  describe("print", function () {
    it("hides the controls on paper", async function () {
      const el = await drawn();
      const rules: CSSRule[] = [];
      for (const sheet of el.shadowRoot!.adoptedStyleSheets) {
        for (const rule of sheet.cssRules) if (rule instanceof CSSMediaRule && rule.conditionText.includes("print")) rules.push(...rule.cssRules);
      }
      const hidden = rules.filter((rule) => rule instanceof CSSStyleRule && rule.style.display === "none").flatMap((rule) => (rule as CSSStyleRule).selectorText.split(",").map((s) => s.trim()));
      for (const selector of [".toolbox", ".simulationmenu", ".modeSwitch", ".viewportControls", ".fullscreenButton"]) {
        assert.include(hidden, selector, `${selector} is hidden in print`);
      }
    });
  });
});

mocha.run();
