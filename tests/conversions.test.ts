/// <reference types="mocha" />
import "mocha/mocha.js";
import { assert } from "chai";
import { getMochaConfig } from "@webwriter/build/test";
import "../src/widgets/ww-network";
import { mount, until, unmountAll, saved, settle } from "./helpers";

mocha.setup(getMochaConfig());

const ids = (el: any) => saved(el).components.map((c: any) => c.id).sort();

describe("<ww-network> conversions", function () {
  this.timeout(30000);
  afterEach(unmountAll);

  it("declares the formats it converts", async function () {
    const el = await mount('contenteditable=""', "", "complex-network");
    const widget = el.constructor as any;
    assert.deepEqual(Object.keys(widget.convertFrom), [".json"]);
    assert.deepEqual(Object.keys(widget.convertTo).sort(), [".json", "image/svg+xml"]);
  });

  it("exports the topology as JSON and reads it back into another widget", async function () {
    const source = await mount('contenteditable=""', "", "complex-network");
    await settle(source);
    const file: File = source.exportJson();
    assert.match(file.name, /\.json$/);
    const target = await mount('contenteditable=""', "", "simple-network");
    await settle(target);
    assert.notDeepEqual(ids(target), ids(source));
    const apply = await target.importJson(file);
    assert.notDeepEqual(ids(target), ids(source), "nothing changes before the apply function runs");
    apply();
    await until(() => JSON.stringify(ids(target)) === JSON.stringify(ids(source)), "the topology is imported");
    assert.equal(saved(target).connections.length, saved(source).connections.length);
  });

  it("refuses a file that is not a network file and leaves the widget as it is", async function () {
    const el = await mount('contenteditable=""', "", "complex-network");
    const before = ids(el);
    for (const text of ["not json", "{}", '{"physical-nodes": [{}], "logical-nodes": [], "edges": []}']) {
      let error: Error | undefined;
      try { await el.importJson(new File([text], "x.json", { type: "application/json" })); } catch (e) { error = e as Error; }
      assert.isOk(error, "rejects " + text);
      assert.isNotEmpty(error!.message);
    }
    assert.deepEqual(ids(el), before);
  });

  it("exports the diagram as an SVG picture", async function () {
    const el = await mount('contenteditable=""', "", "complex-network");
    await settle(el);
    const file: File = el.exportSvg();
    assert.equal(file.type, "image/svg+xml");
    assert.match(file.name, /\.svg$/);
    const svg = new DOMParser().parseFromString(await file.text(), "image/svg+xml");
    assert.isNull(svg.querySelector("parsererror"));
    assert.equal(svg.querySelectorAll("image").length, el.diagram.physicalNodes().length);
    assert.equal(svg.querySelectorAll("line").length, el.diagram.edges.size);
    for (const image of svg.querySelectorAll("image")) assert.match(image.getAttribute("href") ?? "", /^data:/);
  });
});

mocha.run();
