# Schema Markup Templates (JSON-LD)

Generate these for every article. Include in frontmatter.

---

## Article Schema (Required for ALL content)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{SEO-optimized title}",
  "description": "{meta description}",
  "author": {
    "@type": "Person",
    "name": "{author name from brand context or user input}"
  },
  "datePublished": "{YYYY-MM-DD}",
  "dateModified": "{YYYY-MM-DD}",
  "publisher": {
    "@type": "Organization",
    "name": "{brand name from brand context or user input}"
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "{URL placeholder -- user fills in}"
  },
  "keywords": ["{primary keyword}", "{secondary 1}", "{secondary 2}"]
}
```

---

## FAQ Schema (Required when FAQ section exists)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "{FAQ question 1 from PAA}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{Answer text}"
      }
    },
    {
      "@type": "Question",
      "name": "{FAQ question 2 from PAA}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{Answer text}"
      }
    }
  ]
}
```

---

## HowTo Schema (Required for how-to content type)

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "{title}",
  "description": "{meta description}",
  "step": [
    {
      "@type": "HowToStep",
      "name": "{Step 1 title}",
      "text": "{Step 1 description}"
    },
    {
      "@type": "HowToStep",
      "name": "{Step 2 title}",
      "text": "{Step 2 description}"
    }
  ]
}
```

---

## Schema Output Location

Include in the article's YAML frontmatter as multiline strings:

```yaml
---
schema_article: |
  {Article JSON-LD}
schema_faq: |
  {FAQ JSON-LD}
schema_howto: |
  {HowTo JSON-LD -- only for how-to content}
---
```

This lets users copy directly into their CMS.
