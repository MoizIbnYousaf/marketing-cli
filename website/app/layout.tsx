import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { SOFTWARE_APPLICATION_JSON_LD } from "./site-metadata";
import "./globals.css";

export { metadata } from "./site-metadata";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-slate-950 font-sans text-slate-50 antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: SOFTWARE_APPLICATION_JSON_LD }}
        />
        {children}
      </body>
    </html>
  );
}
