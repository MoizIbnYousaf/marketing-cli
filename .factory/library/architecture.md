# Architecture

**What belongs here:** Architectural decisions, patterns, component structure.

---

## Tech Stack
- Next.js 15 (App Router, static export via `output: 'export'`)
- Tailwind CSS v4
- TypeScript strict mode
- CSS animations + IntersectionObserver (no heavy animation libraries)
- next/font for Inter/Geist Sans + JetBrains Mono

## Design System
- Dark terminal-inspired aesthetic (Vercel/Linear style)
- Color palette: slate/zinc base, emerald/green accents for success states
- Typography: Inter or Geist Sans for UI, JetBrains Mono for code/terminal
- Cards: dark bg with subtle border, glow on hover
- Spacing: consistent section padding (py-24 or similar)

## Component Structure
```
website/
├── app/
│   ├── layout.tsx          # Root layout with fonts, metadata
│   ├── page.tsx            # Single page composing all sections
│   └── globals.css         # Tailwind imports, custom properties
├── components/
│   ├── Nav.tsx             # Sticky navigation
│   ├── Hero.tsx            # Hero with headline, tagline, CTAs
│   ├── TerminalDemo.tsx    # Animated terminal replay
│   ├── Features.tsx        # 6-card feature grid
│   ├── SkillsCatalog.tsx   # Filterable skills by category
│   ├── Testimonials.tsx    # Placeholder testimonial cards
│   ├── InstallCTA.tsx      # Install command + how-it-works + CTA
│   └── Footer.tsx          # Minimal footer
├── lib/
│   └── terminal-data.ts    # Pre-recorded terminal demo sequences
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## Key Patterns
- All content is static (hardcoded, no API calls)
- Single-page with section anchors (#features, #skills, etc.)
- Smooth scroll behavior via CSS scroll-behavior or JS
- IntersectionObserver for scroll-triggered animations and terminal demo start
- Terminal demo: pre-recorded sequences with typewriter effect, not live CLI
