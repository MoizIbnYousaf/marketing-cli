import { afterEach } from "bun:test";
import { cleanup } from "@testing-library/react";
import { JSDOM } from "jsdom";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
  var __MKTG_TEST_DOM__: JSDOM | undefined;
}

const dom = globalThis.__MKTG_TEST_DOM__ ?? new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});

if (!globalThis.__MKTG_TEST_DOM__) {
  globalThis.__MKTG_TEST_DOM__ = dom;
}

const { window } = dom;

Object.assign(globalThis, {
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  HTMLAnchorElement: window.HTMLAnchorElement,
  HTMLButtonElement: window.HTMLButtonElement,
  Node: window.Node,
  Event: window.Event,
  MouseEvent: window.MouseEvent,
  KeyboardEvent: window.KeyboardEvent,
  getComputedStyle: window.getComputedStyle,
  requestAnimationFrame: (callback: FrameRequestCallback) =>
    setTimeout(() => callback(Date.now()), 16),
  cancelAnimationFrame: (id: number) => clearTimeout(id),
});

if (!globalThis.IS_REACT_ACT_ENVIRONMENT) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
}

window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  document.documentElement.innerHTML = "<head></head><body></body>";
});
