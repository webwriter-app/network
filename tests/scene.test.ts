/// <reference types="mocha" />
import "mocha/mocha.js";
import { assert } from "chai";
import { getMochaConfig } from "@webwriter/build/test";
import "../src/widgets/ww-network";
import { mount, until, unmountAll, scene, saved, settle, move, steps, type Net } from "./helpers";

mocha.setup(getMochaConfig());

const pointer = (target: EventTarget, type: string, x: number, y: number, buttons: number) =>
  target.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: "mouse", clientX: x, clientY: y, button: 0, buttons, bubbles: true, composed: true, cancelable: true, isPrimary: true }));

const centre = (element: Element) => {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

const host = (el: Net, id: string) => el.renderRoot.querySelector(`ww-node[data-ww-key="${id}"]`) as HTMLElement;
const edgeOf = (el: Net, id: string) => el.renderRoot.querySelector(`ww-path[data-ww-key="${id}"]`) as HTMLElement;

/** Mounts the snippet with two nets and waits until the scene has drawn them. */
async function drawn(attrs = 'contenteditable=""', snippet = "complex-network"): Promise<Net> {
  const el = await mount(attrs, "", snippet);
  await settle(el);
  await until(() => el.drawnFrames().size > 0 && scene(el).drawingOf(host(el, "host0")?.closest("ww-group") ?? host(el, "host0")), "the nets are drawn");
  return el;
}

describe("<ww-network> scene", function () {
  this.timeout(30000);
  afterEach(unmountAll);

  describe("nets", function () {
    it("draws a net as a framed group with rounded corners around its hosts", async function () {
      const el = await drawn();
      const net = saved(el).networks[0];
      const group = el.renderRoot.querySelector(`ww-group[data-ww-key="${net.id}"]`)!;
      assert.isOk(group, "a group for the net");
      assert.isOk(group.hasAttribute("frame"), "with a frame");
      for (const id of net.components) assert.equal(host(el, id).parentElement, group, id + " is inside the group");
      const frame = scene(el).drawingOf(group).frame;
      assert.isAbove(frame.radius, 0, "rounded corners");
      for (const id of net.components) {
        const c = saved(el).components.find((component: any) => component.id === id);
        assert.isTrue(c.x > frame.x && c.x < frame.x + frame.width && c.y > frame.y && c.y < frame.y + frame.height, id + " is inside the frame");
      }
    });

    it("draws a net without content as a rounded box at its own place", async function () {
      const el = await mount('contenteditable=""');
      await settle(el);
      el.addNode("net");
      await settle(el);
      const fresh = saved(el).networks.at(-1).id;
      const shape = el.renderRoot.querySelector(`ww-shape[data-ww-key="${fresh}"]`) as HTMLElement;
      assert.isOk(shape, "an empty net is a shape");
      assert.isAbove(Number(shape.getAttribute("radius")), 0, "rounded");
      move(el, [[fresh, 300, 200]]);
      await settle(el);
      assert.equal(el.renderRoot.querySelector(`ww-shape[data-ww-key="${fresh}"]`)!.getAttribute("x"), "300", "the box moves with its net");
    });

    it("nests the group of a net inside the group of the net around it", async function () {
      const el = await drawn('contenteditable=""', "triple-network");
      const [outer, inner] = [el.diagram.node("net0"), el.diagram.node("net2")];
      inner.parent = outer.id;
      el.requestUpdate();
      await settle(el);
      const group = el.renderRoot.querySelector(`ww-group[data-ww-key="${inner.id}"]`)!;
      assert.equal(group.parentElement!.getAttribute("data-ww-key"), outer.id, "inside the group of the outer net");
      assert.isOk(el.drawnFrames().get(outer.id)!.width > el.drawnFrames().get(inner.id)!.width, "the outer frame is around the inner one");
    });
  });

  describe("edges", function () {
    it("puts the port labels in the edge, turned along it, and the hint on an edge without ports", async function () {
      const el = await drawn();
      const labelled = el.renderRoot.querySelectorAll("ww-path.labelled-edge");
      assert.isAbove(labelled.length, 0, "labelled edges");
      for (const path of labelled) {
        const labels = path.querySelectorAll(":scope > ww-text[follow]");
        assert.equal(labels.length, 2, "one label per end");
        assert.equal(scene(el).drawingOf(path).labels.length, 2, "both drawn");
      }
      assert.equal(el.renderRoot.querySelectorAll("ww-node.edge-label").length, 0, "no turned HTML labels");
    });

    it("lets the edges of a dragged host follow it while it is held", async function () {
      const el = await drawn();
      const id = "host0";
      const edge = saved(el).connections.find((c: any) => c.from === id || c.to === id);
      const start = centre(host(el, id));
      const before = scene(el).drawingOf(edgeOf(el, edge.id)).points.map((p: any) => ({ ...p }));
      pointer(host(el, id), "pointerdown", start.x, start.y, 1);
      for (let i = 1; i <= 5; i++) { pointer(window, "pointermove", start.x + i * 8, start.y + i * 4, 1); await new Promise(r => setTimeout(r, 30)); }
      await until(() => {
        const now = scene(el).drawingOf(edgeOf(el, edge.id)).points;
        return Math.hypot(now[0].x - before[0].x, now[0].y - before[0].y) > 2 || Math.hypot(now.at(-1).x - before.at(-1).x, now.at(-1).y - before.at(-1).y) > 2;
      }, "the edge follows the held host");
      pointer(window, "pointerup", start.x + 40, start.y + 20, 0);
      await settle(el);
    });
  });

  describe("drawing wires between hosts", function () {
    it("starts a wire at a host and ends it at another one, by the rules of the editor", async function () {
      const el = await drawn('contenteditable=""', "simple-network");
      el.addNode("computer");
      await settle(el);
      const fresh = saved(el).components.at(-1).id;
      el.toggleDrawMode();
      await settle(el);
      assert.equal(host(el, fresh).getAttribute("data-ww-link"), "edge", "the host starts wires");
      assert.equal(host(el, fresh).getAttribute("data-ww-accept"), "edge", "and takes them");
      assert.equal(host(el, fresh).querySelectorAll("[data-ww-port]").length, 0, "no port element covers the picture");
      const log = steps(el);
      const count = saved(el).connections.length;
      const from = centre(host(el, fresh));
      const to = centre(host(el, "switch0"));
      pointer(host(el, fresh), "pointerdown", from.x, from.y, 1);
      for (let i = 1; i <= 6; i++) { pointer(window, "pointermove", from.x + ((to.x - from.x) * i) / 6, from.y + ((to.y - from.y) * i) / 6, 1); await new Promise(r => setTimeout(r, 30)); }
      pointer(window, "pointerup", to.x, to.y, 0);
      await until(() => saved(el).connections.length === count + 1, "the wire is saved");
      const edge = saved(el).connections.at(-1);
      assert.deepEqual([edge.from, edge.to], [fresh, "switch0"]);
      assert.isAtLeast(log.start, 1);
      assert.equal(log.start, log.end, "one undo step per change");
    });

    it("does not draw a wire in read mode or outside the draw mode", async function () {
      const el = await drawn("");
      assert.isNull(host(el, "host0").getAttribute("data-ww-link"));
      const read = await drawn('contenteditable=""');
      assert.isNull(host(read, "host0").getAttribute("data-ww-link"), "not in draw mode");
    });
  });

  describe("gateways", function () {
    it("counts where the pointer let go of the router, not where its centre is", async function () {
      const el = await drawn();
      el.addNode("router");
      await settle(el);
      const router = saved(el).components.at(-1).id;
      const net = saved(el).networks[0];
      const frame = el.drawnFrames().get(net.id)!;
      el.toggleAssigningGateway();
      const detail = { items: [{ key: router, item: null, x: 3000, y: 3000 }], dx: 0, dy: 0, pointer: { x: frame.x, y: frame.y + frame.height / 2, clientX: 0, clientY: 0 } };
      scene(el).dispatchEvent(new CustomEvent("ww-move", { detail, bubbles: true, composed: true, cancelable: true }));
      await settle(el);
      assert.include(saved(el).networks[0].gateways, router, "gateway of the net the pointer is on");
    });
  });

  describe("context menu", function () {
    const menu = (el: Net) => el.contextMenuAnchor;

    it("opens on a host where the pointer is", async function () {
      const el = await drawn();
      const at = centre(host(el, "host0"));
      host(el, "host0").dispatchEvent(new MouseEvent("contextmenu", { clientX: at.x, clientY: at.y, bubbles: true, composed: true, cancelable: true }));
      await until(() => menu(el), "the menu opens");
      assert.equal(el.selectedObject.id, "host0");
      assert.closeTo(menu(el)!.getBoundingClientRect().x, at.x, 2);
    });

    it("opens on an edge", async function () {
      const el = await drawn();
      const edge = saved(el).connections[0];
      const points = scene(el).drawingOf(edgeOf(el, edge.id)).points;
      const middle = scene(el).toClient((points[0].x + points.at(-1).x) / 2, (points[0].y + points.at(-1).y) / 2);
      const canvas = scene(el).shadowRoot.querySelector("canvas");
      canvas.dispatchEvent(new MouseEvent("contextmenu", { clientX: middle.x, clientY: middle.y, bubbles: true, composed: true, cancelable: true }));
      await until(() => menu(el) && el.selectedObject?.id === edge.id, "the menu opens on the edge");
    });

    it("stays shut on the background", async function () {
      const el = await drawn();
      const box = scene(el).getBoundingClientRect();
      const canvas = scene(el).shadowRoot.querySelector("canvas");
      const event = new MouseEvent("contextmenu", { clientX: box.left + 5, clientY: box.bottom - 5, bubbles: true, composed: true, cancelable: true });
      canvas.dispatchEvent(event);
      await settle(el);
      assert.isNull(menu(el));
    });
  });

  describe("view", function () {
    const width = (el: Net) => host(el, "host0").getBoundingClientRect().width;

    it("zooms with the plain wheel", async function () {
      const el = await drawn();
      const before = width(el);
      const at = centre(host(el, "host0"));
      scene(el).dispatchEvent(new WheelEvent("wheel", { deltaY: -200, clientX: at.x, clientY: at.y, bubbles: true, composed: true, cancelable: true }));
      await until(() => width(el) > before * 1.05, "the picture grows");
      scene(el).dispatchEvent(new WheelEvent("wheel", { deltaY: 600, clientX: at.x, clientY: at.y, bubbles: true, composed: true, cancelable: true }));
      await until(() => width(el) < before, "the picture shrinks");
    });

    it("opens fitted, with room for the labels at the border", async function () {
      const el = await drawn();
      const view = scene(el).getBoundingClientRect();
      for (const node of el.renderRoot.querySelectorAll("ww-node.physical-node")) {
        const box = node.getBoundingClientRect();
        assert.isTrue(box.left >= view.left && box.right <= view.right && box.top >= view.top && box.bottom <= view.bottom, "every host is in view");
      }
    });
  });
});

mocha.run();
