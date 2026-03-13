import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import HomePage from "./page";

describe("HomePage", () => {
  test("renders the mktg wordmark", () => {
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain("mktg");
    expect(markup).toContain("font-mono");
  });
});
