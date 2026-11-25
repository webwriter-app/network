/// <reference types="mocha" />
import "mocha/mocha.js";
import { assert } from "chai";
import { getMochaConfig } from "@webwriter/build/test";
import "../src/widgets/ww-network";
 import { mount, until, unmountAll, nodes, wait } from "./helpers";

mocha.setup(getMochaConfig());

describe("<ww-network> edit and read mode", function () {
  afterEach(unmountAll);

  it("follows contenteditable with the deletable class", async function () {
    const el = await mount();
    const all = (expected: boolean) => nodes(el).length > 0 && nodes(el).every(e => e.classList.contains("deletable") === expected);
    assert.isFalse(el.isContentEditable, "read mode");
    el.setAttribute("contenteditable", "");
    await until(() => all(true), "deletable in edit mode");
    el.removeAttribute("contenteditable");
    await until(() => all(false), "deletable removed in read mode");
    el.setAttribute("contenteditable", "");
    await until(() => all(true), "deletable back");
  });

  it("stays editable under designMode, as the editor makes it", async function () {
    document.designMode = "on";
    const el = await mount('contenteditable=""');
    await until(() => nodes(el).length > 0 && nodes(el).every(e => e.classList.contains("deletable")), "deletable");
    el.removeAttribute("contenteditable");
    // designMode keeps the widget editable, so the mode does not change.
    await wait(200);
    assert.isTrue(el.isContentEditable, "still editable under designMode");
    assert.isTrue(nodes(el).every(e => e.classList.contains("deletable")), "unchanged");
  });
});

mocha.run();
