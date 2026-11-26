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

  it("sends a packet using the reader's simulation controls and restores the diagram when the mode is left", async function () {
    const el = await mount("", "", "complex-network");
    await settle(el);
    const before = JSON.stringify(saved(el));
    const select = el.renderRoot.querySelector(".modeSwitch sl-select");
    select.value = "simulate";
    select.dispatchEvent(new CustomEvent("sl-change", { bubbles: true }));
    await until(() => el.packetSimulator.inited, "session started");
    assert.isTrue(el.diagram.node("host0").has("decorated-node"), "nodes decorated");
    const source = el.renderRoot.querySelector(".set-source-btn");
    const target = el.renderRoot.querySelector(".set-target-btn");
    const pick = async (role: "source" | "target", key: string) => {
      assert.isFalse(source.disabled, "source button is available");
      assert.isFalse(target.disabled, "target button is available");
      const [button, otherButton] = role === "source" ? [source, target] : [target, source];
      button.click();
      await settle(el);
      assert.isTrue(button.loading, `${role} button shows that a host can be picked`);
      assert.isTrue(otherButton.disabled, "the other button is disabled while picking");
      scene(el).dispatchEvent(new CustomEvent("ww-select", { detail: { keys: [key], items: [] }, bubbles: true, composed: true }));
      await settle(el);
    };
    await pick("source", "host0");
    await pick("target", "host6");
    assert.isFalse(source.disabled, "source button is available again");
    assert.isFalse(target.disabled, "target button is available again");
    assert.equal(el.packetSimulator.sourceEndPoint, "host0");
    assert.equal(el.packetSimulator.targetEndPoint, "host6");
    assert.notEqual(el.packetSimulator.sourceIp, "127.0.0.1");
    assert.notEqual(el.packetSimulator.targetIp, "127.0.0.1");
    el.renderRoot.querySelector(".simulationmenu > sl-button-group:last-child sl-button").click();
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
