---
name: frontend-worker
description: Builds React/Next.js components, pages, and styling for the mktg marketing website
---

# Frontend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for any feature involving:
- React component creation or modification
- Page layout and composition
- Tailwind CSS styling and dark theme implementation
- Interactive UI (animations, tab switching, copy-to-clipboard)
- Responsive design implementation
- SEO meta tags and structured data
- Component testing with Vitest + React Testing Library

## Work Procedure

### 1. Read Feature Context
- Read `mission.md` for overall project goals
- Read `AGENTS.md` for conventions and boundaries
- Read `.factory/library/architecture.md` for component structure and design system
- Read `.factory/services.yaml` for commands (test, typecheck, lint, build)
- Check the feature's `preconditions` — verify they are met before starting

### 2. Write Tests First (TDD)
- Create test file alongside the component (e.g., `ComponentName.test.tsx`)
- Write failing tests covering: rendering, user interactions, responsive behavior, accessibility
- Use `bun:test` imports and React Testing Library patterns
- Run tests to confirm they fail: `cd website && bun run test`

### 3. Implement the Component
- Build the component to make tests pass
- Follow the design system: dark theme (slate/zinc), monospace for code, Inter/Geist for UI
- Use Tailwind CSS classes — no inline styles or separate CSS files
- Use semantic HTML elements (`<section>`, `<nav>`, `<footer>`, `<h2>`, `<blockquote>`)
- Add proper `id` attributes for anchor linking (e.g., `id="features"`)
- Ensure all interactive elements are keyboard accessible

### 4. Integrate into Page
- Import component in `app/page.tsx` and place in correct section order
- Verify the component works in the context of the full page

### 5. Run All Validators
- `cd website && bun run test` — all tests pass
- `cd website && bun x tsc --noEmit` — no type errors
- `cd website && bun run lint` — no lint errors

### 6. Manual Verification with agent-browser
- Start the dev server if not running: `cd /Users/moizibnyousaf/projects/mktg/website && PORT=3200 bun run dev &`
- Wait for healthcheck: `curl -sf http://localhost:3200`
- Use `agent-browser` to navigate to `http://localhost:3200`
- Visually verify: dark theme, correct layout, no broken elements
- Test interactive elements: clicks, hovers, tab switching, scrolling
- Test at mobile viewport (375px) if feature has responsive requirements
- Stop the dev server after verification: `lsof -ti :3200 | xargs kill -9 2>/dev/null || true`

### 7. Commit
- Stage and commit all changes with a descriptive message
- Include both component and test files

## Example Handoff

```json
{
  "salientSummary": "Built the TerminalDemo component with typewriter animation, 3-tab switching (init/status/doctor), syntax-highlighted output, and cursor blink. All 12 tests pass, typecheck clean, verified in agent-browser at desktop and 375px mobile.",
  "whatWasImplemented": "TerminalDemo React component with: macOS window chrome (traffic light dots, title bar), tab bar with 3 demos, typewriter text animation with 40-120ms character timing, cursor blink via CSS animation, syntax-highlighted colored output (green/yellow/red indicators), IntersectionObserver-triggered animation start, prefers-reduced-motion support. Integrated into page.tsx between Hero and Features sections.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd website && bun run test", "exitCode": 0, "observation": "12 tests pass including typewriter timing, tab switching, reduced-motion, responsive layout" },
      { "command": "cd website && bun x tsc --noEmit", "exitCode": 0, "observation": "No type errors" },
      { "command": "cd website && bun run lint", "exitCode": 0, "observation": "No lint warnings or errors" }
    ],
    "interactiveChecks": [
      { "action": "Opened http://localhost:3200, scrolled to terminal demo section", "observed": "Terminal renders with dark chrome, traffic light dots, title bar. First tab 'mktg init' is active with green highlight." },
      { "action": "Watched typewriter animation for 5 seconds", "observed": "Command types character by character with realistic timing, cursor blinks after last char. After typing completes, output appears line-by-line with green checkmarks and bold step labels." },
      { "action": "Clicked 'mktg status' tab mid-animation", "observed": "Terminal cleared instantly, tab 2 highlighted, new command started typing from scratch. No ghost characters from tab 1." },
      { "action": "Set viewport to 375px width", "observed": "Terminal takes full width, tabs show abbreviated labels (init/status/doctor), font readable at 13px, no horizontal overflow." }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "components/TerminalDemo.test.tsx",
        "cases": [
          { "name": "renders terminal chrome with 3 dots", "verifies": "Window chrome visual structure" },
          { "name": "displays 3 tabs with correct labels", "verifies": "Tab bar content and count" },
          { "name": "first tab is active by default", "verifies": "Default active state" },
          { "name": "switches tabs on click", "verifies": "Tab interaction and state update" },
          { "name": "skips animation with reduced motion", "verifies": "Accessibility preference" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Feature depends on a component that doesn't exist yet and isn't in this feature's scope
- Design system decisions are ambiguous (e.g., exact colors, spacing values not specified)
- Build/test infrastructure is broken (Next.js config issues, missing dependencies)
- Feature scope is significantly larger than described
