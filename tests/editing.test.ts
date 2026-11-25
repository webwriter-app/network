/// <reference types="mocha" />
import "mocha/mocha.js";
import { assert } from "chai";
import { getMochaConfig } from "@webwriter/build/test";
import "../src/widgets/ww-network";
 import { mount, until, unmountAll, nodes, scene, saved, settle, move, connect, steps, dataBlock } from "./helpers";

mocha.setup(getMochaConfig());

describe("<ww-network> editing", function () {
  this.timeout(30000);
  afterEach(unmountAll);

  it("draws the saved diagram: nodes, edges, nets and their places", async function () {
    const el = await mount();
    const data = saved(el);
    await until(() => nodes(el).length === data.components.length, "nodes drawn");
    for (const c of data.components) {
      const node = el.renderRoot.querySelector(`ww-node[data-ww-key="${c.id}"]`);
      assert.isOk(node, "node " + c.id);
      assert.isBelow(Math.abs(Number(node!.getAttribute("x")) - (c.x - 10)), 0.01, "x of " + c.id);
      assert.isBelow(Math.abs(Number(node!.getAttribute("y")) - (c.y - 10)), 0.01, "y of " + c.id);
    }
    assert.equal(el.renderRoot.querySelectorAll("ww-path").length, data.connections.length, "edges drawn");
    assert.equal(el.renderRoot.querySelectorAll("ww-group.net, ww-shape.net").length, data.networks.length, "nets drawn");
    await until(() => scene(el).stats.drawn > 0, "scene drew");
  });

  it("saves the place of a moved node as one undo step", async function () {
    const el = await mount('contenteditable=""');
    const log = steps(el);
    await settle(el);
    const event = move(el, [["host0", 100, 50]]);
    assert.isFalse(event.defaultPrevented, "move accepted in edit mode");
    await settle(el);
    const after = saved(el).components.find((c: any) => c.id === "host0");
    assert.equal(after.x, 110);
    assert.equal(after.y, 60);
    assert.equal(el.components.find((c: any) => c.id === "host0").x, 110, "property follows");
    assert.isAtLeast(log.start, 1);
    assert.equal(log.start, log.end, "transaction events");
    assert.equal(el.renderRoot.querySelector('ww-node[data-ww-key="host0"]')!.getAttribute("x"), "100", "drawn at the new place");
  });

  it("moves a node with a real drag", async function () {
    const el = await mount('contenteditable=""');
    await until(() => scene(el).stats.measured > 0 || nodes(el)[0].getBoundingClientRect().width > 0, "rendered");
    await settle(el);
    const node = el.renderRoot.querySelector('ww-node[data-ww-key="host0"]')!;
    const box = node.getBoundingClientRect();
    const start = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    const fire = (target: EventTarget, type: string, x: number, y: number, buttons: number) => target.dispatchEvent(new PointerEvent(type, { pointerId: 5, pointerType: "mouse", clientX: x, clientY: y, button: 0, buttons, bubbles: true, composed: true, cancelable: true, isPrimary: true }));
    const before = el.diagram.node("host0").x;
    fire(node, "pointerdown", start.x, start.y, 1);
    for (let i = 1; i <= 5; i++) { fire(window, "pointermove", start.x + i * 6, start.y + i * 2, 1); await new Promise(r => setTimeout(r, 20)); }
    fire(window, "pointerup", start.x + 30, start.y + 10, 0);
    await until(() => el.diagram.node("host0").x !== before, "moved by drag");
    await settle(el);
    assert.isAbove(el.diagram.node("host0").x, before, "moved to the right");
    assert.equal(saved(el).components.find((c: any) => c.id === "host0").x, el.diagram.node("host0").x, "saved");
  });

  it("takes the content of a net along when the net moves", async function () {
    const el = await mount('contenteditable=""');
    await settle(el);
    const net = saved(el).networks[0];
    const members = net.components.map((id: string) => saved(el).components.find((c: any) => c.id === id));
    move(el, [[net.id, 40, 25]]);
    await settle(el);
    const moved = saved(el);
    for (const m of members) {
      const now = moved.components.find((c: any) => c.id === m.id);
      assert.isBelow(Math.abs(now.x - m.x - 40), 0.01, "member " + m.id + " x");
      assert.isBelow(Math.abs(now.y - m.y - 25), 0.01, "member " + m.id + " y");
    }
    assert.equal(moved.networks[0].components.length, members.length, "membership kept");
  });

  it("moves nothing in simulate mode", async function () {
    const el = await mount('contenteditable=""');
    await settle(el);
    el.mode = "simulate";
    await settle(el);
    const event = move(el, [["host0", 5, 5]]);
    assert.isTrue(event.defaultPrevented, "move refused");
    assert.notEqual(el.diagram.node("host0").x, 15, "unchanged");
  });

  it("connects two nodes with an unconfigured edge, by the rules of the editor", async function () {
    const el = await mount('contenteditable=""');
    await settle(el);
    const log = steps(el);
    el.addNode("computer");
    await settle(el);
    const fresh = saved(el).components.at(-1).id;
    assert.isTrue(connect(el, fresh, "switch0").defaultPrevented, "refused outside the draw mode");
    el.toggleDrawMode();
    await settle(el);
    assert.isOk(el.renderRoot.querySelector(`ww-node[data-ww-key="${fresh}"]`).hasAttribute("data-ww-link"), "the host takes wires in draw mode");
    const count = saved(el).connections.length;
    assert.isFalse(connect(el, fresh, "switch0").defaultPrevented, "connection accepted");
    await settle(el);
    const connections = saved(el).connections;
    assert.equal(connections.length, count + 1, "edge saved");
    const edge = connections.at(-1);
    assert.equal(edge.from, fresh);
    assert.equal(edge.to, "switch0");
    assert.isNotOk(edge.inPort || edge.outPort, "unconfigured edge");
    assert.isOk(el.renderRoot.querySelector(`ww-path[data-ww-key="${edge.id}"].unconfigured-edge`), "dotted edge drawn");
    assert.isAtLeast(log.start, 1);
    assert.equal(log.start, log.end, "transaction events");
    assert.isTrue(connect(el, fresh, fresh).defaultPrevented, "no loop");
    assert.isTrue(connect(el, fresh, "switch0").defaultPrevented, "no second edge between the same nodes");
    assert.isTrue(connect(el, "host0", "switch1").defaultPrevented, "no edge without free ports");
  });

  it("removes the edges of a deleted node and frees their ports", async function () {
    const el = await mount('contenteditable=""');
    await settle(el);
    const before = saved(el);
    const edges = before.connections.filter((c: any) => c.from === "host0" || c.to === "host0");
    assert.isAbove(edges.length, 0, "host0 has edges");
    el.selectedObject = el.diagram.node("host0");
    const log = steps(el);
    el.deleteSelected();
    await settle(el);
    const after = saved(el);
    assert.isUndefined(after.components.find((c: any) => c.id === "host0"), "node gone");
    assert.equal(after.connections.length, before.connections.length - edges.length, "edges gone");
    for (const e of edges) {
      const other = after.components.find((c: any) => c.id === (e.from === "host0" ? e.to : e.from));
      assert.notInclude(other.portLinks, e.id, "port of " + other.id + " is free");
    }
    assert.isFalse(after.networks.some((n: any) => n.components.includes("host0")), "left its net");
    assert.isNull(el.renderRoot.querySelector('ww-node[data-ww-key="host0"]'), "no longer drawn");
    assert.isAtLeast(log.start, 1);
    assert.equal(log.start, log.end, "transaction events");
  });

  it("shows a data block that changed from outside", async function () {
    const el = await mount('contenteditable=""');
    await settle(el);
    const data = saved(el);
    data.components = data.components.filter((c: any) => c.id !== "host1");
    data.connections = data.connections.filter((c: any) => c.from !== "host1" && c.to !== "host1");
    data.networks[0].components = data.networks[0].components.filter((id: string) => id !== "host1");
    dataBlock(el).textContent = JSON.stringify(data);
    await until(() => !el.renderRoot.querySelector('ww-node[data-ww-key="host1"]'), "host1 gone from the drawing");
    assert.isNotOk(el.diagram.node("host1"), "gone from the model");
  });

  it("keeps the diagram through export and import", async function () {
    const el = await mount('contenteditable=""');
    await settle(el);
    const before = saved(el);
    const click = HTMLAnchorElement.prototype.click;
    let file: string | null = null;
    HTMLAnchorElement.prototype.click = function () { file = this.href; };
    try { el.exportNetwork(); } finally { HTMLAnchorElement.prototype.click = click; }
    assert.isOk(file && (file as string).startsWith("blob:"), "a file is offered");
    const text = await (await fetch(file!)).text();
    el.removeAttribute("contenteditable");
    const other = await mount('contenteditable=""');
    dataBlock(other).remove();
    other.components = []; other.connections = []; other.networks = [];
    other.importNetwork([new File([text], "network.json", { type: "application/json" })]);
    await until(() => other.components.length === before.components.length, "components imported");
    await settle(other);
    const after = saved(other);
    assert.equal(after.connections.length, before.connections.length, "edges imported");
    assert.equal(after.networks.length, before.networks.length);
    assert.equal(after.networks[0].components.length, before.networks[0].components.length, "nets imported");
    const a = before.components.find((c: any) => c.id === "switch1"), b = after.components.find((c: any) => c.id === "switch1");
    assert.equal(a.x, b.x);
    assert.equal(a.y, b.y);
    assert.equal(a.ports.length, b.ports.length);
    assert.equal(a.ports[0].mac, b.ports[0].mac, "node imported as it was");
  });

  it("lets a node dropped into a net join it and leave it again when the network assignment is on", async function () {
    const el = await mount('contenteditable=""');
    await settle(el);
    el.addNode("computer");
    await settle(el);
    const fresh = saved(el).components.at(-1).id;
    const net = saved(el).networks[0];
    await until(() => el.drawnFrames().has(net.id), "the net is drawn");
    const frame = el.drawnFrames().get(net.id)!;
    const inside: [number, number] = [frame.x + 5, frame.y + 5];
    move(el, [[fresh, ...inside]]);
    await settle(el);
    assert.notInclude(saved(el).networks[0].components, fresh, "without the assignment mode the node stays outside");
    el.toggleDragAndDropSubnetting();
    move(el, [[fresh, ...inside]]);
    await settle(el);
    assert.include(saved(el).networks[0].components, fresh, "joined the net");
    move(el, [[fresh, 2000, 2000]]);
    await settle(el);
    assert.notInclude(saved(el).networks[0].components, fresh, "left the net");
  });

  it("makes a router dropped on the border of a net its gateway when the gateway assignment is on", async function () {
    const el = await mount('contenteditable=""');
    await settle(el);
    el.addNode("router");
    await settle(el);
    const router = saved(el).components.at(-1).id;
    const net = saved(el).networks[0];
    await until(() => el.drawnFrames().has(net.id), "the net is drawn");
    const frame = el.drawnFrames().get(net.id)!;
    const border: [number, number] = [frame.x - 10, frame.y + frame.height / 2 - 10];
    el.toggleAssigningGateway();
    move(el, [[router, ...border]]);
    await settle(el);
    assert.include(saved(el).networks[0].gateways, router, "gateway of the net");
    assert.isTrue(el.renderRoot.querySelector(`ww-node[data-ww-key="${router}"]`)!.classList.contains("gateway-node"), "drawn as a gateway");
  });
});

mocha.run();
