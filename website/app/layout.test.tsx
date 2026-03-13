import { describe, expect, test } from "bun:test";

import {
  metadata,
  SITE_DESCRIPTION,
  SITE_OG_IMAGE,
  SITE_TITLE,
  SOFTWARE_APPLICATION_JSON_LD,
} from "./site-metadata";

describe("RootLayout", () => {
  test("exports complete SEO metadata for social cards and favicon", () => {
    expect(metadata.title).toEqual(SITE_TITLE);
    expect(metadata.description?.length ?? 0).toBeGreaterThanOrEqual(50);

    expect(metadata.description).toEqual(SITE_DESCRIPTION);
    expect(metadata.openGraph).toEqual({
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [SITE_OG_IMAGE],
    });
    expect(metadata.twitter).toEqual({
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    });
    expect(metadata.icons).toEqual({
      icon: [{ type: "image/svg+xml", url: "/favicon.svg" }],
    });
  });

  test("defines software application JSON-LD for structured data", () => {
    const structuredData = JSON.parse(SOFTWARE_APPLICATION_JSON_LD);

    expect(structuredData["@context"]).toBe("https://schema.org");
    expect(structuredData["@type"]).toBe("SoftwareApplication");
    expect(structuredData.name).toBe("mktg");
    expect(structuredData.description).toBe(SITE_DESCRIPTION);
    expect(structuredData.url).toBe("https://github.com/moizibnyousaf/mktg");
  });
});
