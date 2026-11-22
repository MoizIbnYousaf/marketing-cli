# Third-party notices

marketing-cli is MIT licensed (see [LICENSE](LICENSE)). Parts of it are derived
from other open-source work. The notices those licenses require are reproduced
here and ship in the npm package.

## Marketing Skills by Corey Haines

- Source: https://github.com/coreyhaines31/marketingskills
- License: MIT

Several skills began as adaptations of skills in this library and still contain
portions of its text, in the skill body or in files under `references/`:

| marketing-cli skill | Upstream skill it draws on |
|---|---|
| `churn-prevention` | `churn-prevention` |
| `pricing-strategy` | `pricing` |
| `competitor-alternatives` | `competitors` |
| `referral-program` | `referrals` |
| `launch-strategy` | `launch` |
| `seo-audit` | `seo-audit`, `schema`, `site-architecture` |
| `free-tool-strategy` | `free-tools` |
| `page-cro` | `cro` (earlier `page-cro`) |
| `marketing-psychology` | `marketing-psychology` |
| `direct-response-copy` | `cold-email`, `copy-editing` |
| `seo-content` | `programmatic-seo` |

The first nine are the entries marked `"source": "v1"` in `skills-manifest.json`.
The content has since been rewritten to this project's skill contract (brand
memory under `brand/`, no skill-to-skill calls) and has diverged from upstream.

```text
MIT License

Copyright (c) 2025 Corey Haines

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## trx by Crafter Station

- Source: https://github.com/crafter-station/trx
- License: MIT (Copyright (c) 2026 Crafter Station)

`mktg transcribe` ports parts of trx. See
[src/commands/ATTRIBUTION.md](src/commands/ATTRIBUTION.md) for the file-level
mapping.

## Mirrored skills

Skills mirrored from other repositories record their source in an
`upstream.json` next to the skill and credit it in an attribution footer in
their `SKILL.md`.
