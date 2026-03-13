const footerLinks = [
  {
    label: "GitHub repo",
    href: "https://github.com/moizibnyousaf/mktg",
  },
  {
    label: "npm package",
    href: "https://www.npmjs.com/package/mktg",
  },
] as const;

export function Footer() {
  return (
    <footer
      aria-label="Site footer"
      className="border-t border-slate-800/80 bg-slate-950/95 px-6 py-6 sm:px-10 sm:py-8"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium tracking-tight text-slate-100">© 2026 mktg</p>
          <p className="text-sm text-slate-400">Built for agents, by agents</p>
        </div>

        <nav aria-label="Footer links" className="flex flex-wrap items-center gap-3 sm:gap-4">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-200 transition duration-200 hover:border-emerald-400/40 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
