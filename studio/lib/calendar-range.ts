/**
 * Calendar-day range helpers for Publish queue / calendar views.
 * Bounds are local-calendar midnights expressed as ISO strings for the API.
 */

export type PublishRangeId = "today" | "week" | "month"

export function startOfLocalDay(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Monday-start ISO week (matches Publish calendar). */
export function startOfLocalWeek(d: Date = new Date()): Date {
  const start = startOfLocalDay(d)
  const day = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - day)
  return start
}

export function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

/**
 * Inclusive local calendar window for a Publish range preset.
 * - today: [local midnight, local 23:59:59.999]
 * - week:  [Monday 00:00, Sunday 23:59:59.999]
 * - month: [1st 00:00, last day 23:59:59.999]
 */
export function publishCalendarRange(
  range: PublishRangeId,
  now: Date = new Date(),
): { startDate: string; endDate: string } {
  let start: Date
  let end: Date

  if (range === "today") {
    start = startOfLocalDay(now)
    end = endOfLocalDay(now)
  } else if (range === "week") {
    start = startOfLocalWeek(now)
    end = endOfLocalDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6))
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
    end = endOfLocalDay(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  }

  return { startDate: start.toISOString(), endDate: end.toISOString() }
}
