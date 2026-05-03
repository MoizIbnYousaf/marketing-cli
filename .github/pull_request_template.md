## What

<!-- Brief description of the change -->

## Checklist

- [ ] `bun test` passes
- [ ] `bun x tsc --noEmit` clean
- [ ] `mktg doctor --json` passes
- [ ] No hardcoded skill/agent counts (read from manifest)
- [ ] Skill changes: `mktg skill validate <path> --json` passes
- [ ] `--dry-run` output attached (if applicable)
