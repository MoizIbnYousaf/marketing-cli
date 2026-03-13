import type { Metadata } from "next";

export const SITE_TITLE = "mktg — Agent-Native Marketing Playbook CLI";

export const SITE_DESCRIPTION =
  "One install gives AI agents a complete CMO brain with brand memory, parallel research, and 39 composable marketing skills.";

export const SITE_OG_IMAGE =
  "https://placehold.co/1200x630/020617/f8fafc/png?text=mktg";

export const SOFTWARE_APPLICATION_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  applicationCategory: "BusinessApplication",
  description: SITE_DESCRIPTION,
  image: SITE_OG_IMAGE,
  name: "mktg",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  operatingSystem: "macOS, Linux, Windows",
  url: "https://github.com/moizibnyousaf/mktg",
} as const;

export const SOFTWARE_APPLICATION_JSON_LD = JSON.stringify(
  SOFTWARE_APPLICATION_STRUCTURED_DATA,
);

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};
