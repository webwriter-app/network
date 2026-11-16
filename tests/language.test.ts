/// <reference types="mocha" />
import "mocha/mocha.js";
import { assert } from "chai";
import { getMochaConfig } from "@webwriter/build/test";
import "../src/widgets/ww-network";
 import { mount, until, unmountAll, nodes, dataBlock, snippets, wait } from "./helpers";

mocha.setup(getMochaConfig());

describe("<ww-network> language", function () {
  afterEach(unmountAll);

  it("uses the source language by default", async function () {
    const el = await mount();
    assert.equal(el.msg("Import network"), "Import network");
    assert.equal(el.actions.importNetwork.label, "Import network");
  });

  it("loads the catalog for the lang attribute, re-renders and tells the drawer", async function () {
    const el = await mount();
    let drawer = 0;
    el.addEventListener("optionschange", () => drawer++);
    el.setAttribute("lang", "de");
    await until(() => el.msg("Import network") === "Netzwerk importieren", "German text");
    assert.equal(el.actions.importNetwork.label, "Netzwerk importieren");
    assert.isAtLeast(drawer, 1, "optionschange sent");
    assert.equal(el.localize.getLocale(), "de");
    el.setAttribute("lang", "en");
    await until(() => el.msg("Import network") === "Import network", "back to source");
  });

  it("inherits the language from an ancestor", async function () {
    const el = await mount("", "de");
    await until(() => el.msg("Import network") === "Netzwerk importieren", "German text from ancestor");
    assert.isFalse(el.hasAttribute("lang"), "inherited language stays off the widget");
  });

  it("falls back from a regional tag to its language and from an unknown tag to the source", async function () {
    const el = await mount('lang="de-AT"');
    await until(() => el.msg("Import network") === "Netzwerk importieren", "de-AT -> de");
    el.setAttribute("lang", "xx");
    await until(() => el.msg("Import network") === "Import network", "unknown -> source");
  });

  it("leaves the data block as authored after render", async function () {
    const text = snippets["simple-network"].match(/<script type="application\/json" slot="data">([\s\S]*?)<\/script>/)![1];
    const el = await mount();
    await wait(300);
    const block = dataBlock(el);
    assert.isOk(block);
    assert.equal(block.textContent, text, "block changed on load");
    assert.isAtLeast(el.attributes.length, 1);
    assert.isFalse(el.hasAttribute("lang"), "no stray attributes");
  });
});

mocha.run();
