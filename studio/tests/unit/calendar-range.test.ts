import { describe, expect, test } from "bun:test";
import { publishCalendarRange, startOfLocalWeek } from "../../lib/calendar-range.ts";

describe("publishCalendarRange", () => {
  // Fixed Wednesday 2026-07-15 15:30 local — avoids DST ambiguity in CI.
  const wednesday = new Date(2026, 6, 15, 15, 30, 0, 0);

  test("today covers the full local calendar day", () => {
    const { startDate, endDate } = publishCalendarRange("today", wednesday);
    const start = new Date(startDate);
    const end = new Date(endDate);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(6);
    expect(start.getDate()).toBe(15);
    expect(start.getHours()).toBe(0);
    expect(end.getDate()).toBe(15);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  test("week is Monday→Sunday containing the given day", () => {
    const { startDate, endDate } = publishCalendarRange("week", wednesday);
    const start = new Date(startDate);
    const end = new Date(endDate);
    expect(startOfLocalWeek(wednesday).getTime()).toBe(start.getTime());
    expect(start.getDay()).toBe(1); // Monday
    expect(end.getDay()).toBe(0); // Sunday
    expect(end.getDate()).toBe(19);
  });

  test("month spans the calendar month", () => {
    const { startDate, endDate } = publishCalendarRange("month", wednesday);
    const start = new Date(startDate);
    const end = new Date(endDate);
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(6);
    expect(end.getDate()).toBe(31);
  });
});
