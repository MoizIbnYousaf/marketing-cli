"use client"

// app/dev-test/primitives/page.tsx -- Test harness page for Lane 6 E2E.
//
// Renders every CVA variant of Card, Skeleton, Button, Input, Textarea,
// Label, plus EmptyState and ErrorState across their full variant axes.
// Every node has a stable data-testid so Playwright can locate it and
// assert (a) the generated className string, (b) the computed
// background/foreground/border colors via getComputedStyle.
//
// This page is intentionally NOT linked from the dashboard. The Playwright
// test navigates here directly. In production builds Next.js will still
// emit it as a route -- harmless because nothing links to it. If we want
// it stripped at build time, gate the export with NEXT_PUBLIC_E2E or move
// it under a route group that's excluded by next.config rewrites. For now
// we accept the cost of one extra static route in return for a fully
// real-render token verification target.
//
// NOTE on the folder name: Next.js App Router treats any folder beginning
// with `_` (single OR double underscore) as a private folder and does NOT
// generate a route for it. So `app/__test/...` would 404. Use a non-`_`
// prefix.

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { Inbox, AlertTriangle } from "lucide-react"

const CARD_RADII = ["panel", "card", "chip"] as const
const CARD_SURFACES = ["default", "subtle", "elevated"] as const
const SKELETON_SHAPES = ["rect", "text", "circle", "card"] as const
const BUTTON_SIZES = [
  "default",
  "xs",
  "sm",
  "lg",
  "touch",
  "icon",
  "icon-xs",
  "icon-sm",
  "icon-lg",
] as const
const BUTTON_VARIANTS = [
  "default",
  "destructive",
  "outline",
  "secondary",
  "ghost",
  "link",
  "accent",
] as const
const FIELD_SIZES = ["sm", "default", "lg"] as const
const INPUT_INTENTS = ["default", "error", "success"] as const
const LABEL_INTENTS = ["default", "muted", "error"] as const

export default function PrimitivesHarness() {
  return (
    <div className="min-h-dvh bg-background p-8 text-foreground">
      <h1
        className="mb-6 text-2xl font-semibold"
        data-testid="harness-heading"
      >
        Primitives variant matrix (Lane 6 E2E)
      </h1>

      {/* ─── Card: 3 radii × 3 surfaces = 9 combos ─── */}
      <section className="mb-10" data-testid="section-card">
        <h2 className="mb-3 text-lg font-medium">Card</h2>
        <div className="grid grid-cols-3 gap-4">
          {CARD_RADII.map((radius) =>
            CARD_SURFACES.map((surface) => (
              <Card
                key={`${radius}-${surface}`}
                radius={radius}
                surface={surface}
                data-testid={`card-${radius}-${surface}`}
                className="px-6"
              >
                <span className="text-sm">
                  radius={radius} surface={surface}
                </span>
              </Card>
            )),
          )}
        </div>
      </section>

      {/* ─── Skeleton: 4 shapes ─── */}
      <section className="mb-10" data-testid="section-skeleton">
        <h2 className="mb-3 text-lg font-medium">Skeleton</h2>
        <div className="flex flex-wrap items-center gap-4">
          {SKELETON_SHAPES.map((shape) => (
            <Skeleton
              key={shape}
              shape={shape}
              data-testid={`skeleton-${shape}`}
              className={
                shape === "circle"
                  ? "size-10"
                  : shape === "rect"
                    ? "h-6 w-24"
                    : shape === "text"
                      ? "w-32"
                      : "max-w-xs"
              }
            />
          ))}
        </div>
      </section>

      {/* ─── Button: 9 sizes × 7 variants = 63 combos ─── */}
      <section className="mb-10" data-testid="section-button">
        <h2 className="mb-3 text-lg font-medium">Button</h2>
        <div className="flex flex-col gap-2">
          {BUTTON_SIZES.map((size) => (
            <div key={size} className="flex flex-wrap items-center gap-2">
              <span className="w-20 font-mono text-xs text-muted-foreground">
                {size}
              </span>
              {BUTTON_VARIANTS.map((variant) => (
                <Button
                  key={`${size}-${variant}`}
                  size={size}
                  variant={variant}
                  data-testid={`button-${size}-${variant}`}
                >
                  {size.startsWith("icon") ? (
                    <AlertTriangle aria-hidden />
                  ) : (
                    `${variant}`
                  )}
                </Button>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Input: 3 sizes × 3 intents = 9 ─── */}
      <section className="mb-10" data-testid="section-input">
        <h2 className="mb-3 text-lg font-medium">Input</h2>
        <div className="grid grid-cols-3 gap-3">
          {FIELD_SIZES.map((size) =>
            INPUT_INTENTS.map((intent) => (
              <Input
                key={`${size}-${intent}`}
                size={size}
                intent={intent}
                data-testid={`input-${size}-${intent}`}
                placeholder={`size=${size} intent=${intent}`}
              />
            )),
          )}
        </div>
      </section>

      {/* ─── Textarea: 3 sizes × 3 intents = 9 ─── */}
      <section className="mb-10" data-testid="section-textarea">
        <h2 className="mb-3 text-lg font-medium">Textarea</h2>
        <div className="grid grid-cols-3 gap-3">
          {FIELD_SIZES.map((size) =>
            INPUT_INTENTS.map((intent) => (
              <Textarea
                key={`${size}-${intent}`}
                size={size}
                intent={intent}
                data-testid={`textarea-${size}-${intent}`}
                placeholder={`size=${size} intent=${intent}`}
              />
            )),
          )}
        </div>
      </section>

      {/* ─── Label: 3 sizes × 3 intents = 9 ─── */}
      <section className="mb-10" data-testid="section-label">
        <h2 className="mb-3 text-lg font-medium">Label</h2>
        <div className="flex flex-col gap-2">
          {FIELD_SIZES.map((size) =>
            LABEL_INTENTS.map((intent) => (
              <Label
                key={`${size}-${intent}`}
                size={size}
                intent={intent}
                data-testid={`label-${size}-${intent}`}
              >
                size={size} intent={intent}
              </Label>
            )),
          )}
        </div>
      </section>

      {/* ─── EmptyState: 2 variants ─── */}
      <section className="mb-10" data-testid="section-empty-state">
        <h2 className="mb-3 text-lg font-medium">EmptyState</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48" data-testid="empty-state-card-wrap">
            <EmptyState
              icon={Inbox}
              variant="card"
              title="card variant title"
              description="card variant description"
            />
          </div>
          <div className="h-48" data-testid="empty-state-centered-wrap">
            <EmptyState
              icon={Inbox}
              variant="centered"
              title="centered variant title"
              description="centered variant description"
            />
          </div>
        </div>
      </section>

      {/* ─── ErrorState: 3 levels ─── */}
      <section className="mb-10" data-testid="section-error-state">
        <h2 className="mb-3 text-lg font-medium">ErrorState</h2>
        <div className="grid grid-cols-1 gap-4">
          <div data-testid="error-state-section-wrap">
            <ErrorState
              level="section"
              error={new Error("section level synthetic error")}
              title="section title"
              onRetry={() => {}}
            />
          </div>
          <div className="h-48" data-testid="error-state-tab-wrap">
            <ErrorState
              level="tab"
              error={new Error("tab level synthetic error")}
              title="tab title"
              onRetry={() => {}}
            />
          </div>
          <div data-testid="error-state-page-wrap">
            <ErrorState
              level="page"
              error={new Error("page level synthetic error")}
              title="page title"
              onRetry={() => {}}
            />
          </div>
        </div>
      </section>

      {/* ─── Token surface ramp probes (raw bg-* utilities) ─── */}
      <section className="mb-10" data-testid="section-tokens">
        <h2 className="mb-3 text-lg font-medium">Token probes</h2>
        <div className="flex gap-2">
          <div
            className="size-12 rounded-md bg-card"
            data-testid="token-bg-card"
          />
          <div
            className="size-12 rounded-md bg-popover"
            data-testid="token-bg-popover"
          />
          <div
            className="size-12 rounded-md bg-surface-1"
            data-testid="token-bg-surface-1"
          />
          <div
            className="size-12 rounded-md bg-surface-2"
            data-testid="token-bg-surface-2"
          />
          <div
            className="size-12 rounded-md bg-surface-3"
            data-testid="token-bg-surface-3"
          />
          <div
            className="size-12 rounded-md border-2 border-input"
            data-testid="token-border-input"
          />
          <div
            className="size-12 rounded-md bg-background"
            data-testid="token-bg-background"
          />
        </div>
      </section>
    </div>
  )
}
