/// <reference types="mocha" />
import "mocha/mocha.js";
import { assert } from "chai";
import { getMochaConfig } from "@webwriter/build/test";
import "../src/widgets/ww-network";
 import { mount, until, unmountAll, scene, saved, settle } from "./helpers";

mocha.setup(getMochaConfig());

describe("<ww-network> simulation", function () {
  this.timeout(40000);
  afterEach(unmountAll);

  it("sends a packet between two hosts and restores the diagram when the mode is left", async function () {
    const el = await mount('contenteditable=""', "", "complex-network");
    await settle(el);
    const before = JSON.stringify(saved(el));
    const select = el.renderRoot.querySelector(".modeSwitch sl-select");
    select.value = "simulate";
    select.dispatchEvent(new CustomEvent("sl-change", { bubbles: true }));
    await until(() => el.packetSimulator.inited, "session started");
    assert.isTrue(el.diagram.node("host0").has("decorated-node"), "nodes decorated");
    const pick = async (role: string, key: string) => {
      el.pickEndPoint(role);
      await settle(el);
      scene(el).dispatchEvent(new CustomEvent("ww-select", { detail: { keys: [key], items: [] }, bubbles: true, composed: true }));
      await settle(el);
    };
    await pick("source", "host0");
    await pick("target", "host6");
    assert.equal(el.packetSimulator.sourceEndPoint, "host0");
    assert.equal(el.packetSimulator.targetEndPoint, "host6");
    assert.notEqual(el.packetSimulator.sourceIp, "127.0.0.1");
    assert.notEqual(el.packetSimulator.targetIp, "127.0.0.1");
    el.packetSimulator.startSession();
    await until(() => el.renderRoot.querySelectorAll("ww-node.data-node").length > 0, "a message is on its way");
    const message = el.renderRoot.querySelector("ww-node.data-node")!;
    const first = message.getAttribute("x");
    await until(() => el.renderRoot.querySelector("ww-node.data-node")?.getAttribute("x") !== first, "the message moves");
    assert.isTrue([...el.renderRoot.querySelectorAll("ww-node.data-node")].some((n: any) => n.textContent.includes("ARP")), "an ARP request goes first");
    select.value = "edit";
    select.dispatchEvent(new CustomEvent("sl-change", { bubbles: true }));
    await until(() => !el.packetSimulator.inited, "session stopped");
    await settle(el);
    assert.equal(el.renderRoot.querySelectorAll("ww-node.data-node").length, 0, "messages removed");
    assert.isFalse(el.diagram.node("host0").has("decorated-node"), "nodes restored");
    assert.equal(JSON.stringify(saved(el)), before, "data block untouched");
  });
});

mocha.run();
