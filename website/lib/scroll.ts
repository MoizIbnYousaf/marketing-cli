export const NAV_SCROLL_OFFSET = 96;

export function scrollToSectionById(sectionId: string) {
  const section = document.getElementById(sectionId);

  if (!section) {
    return;
  }

  const top = Math.max(
    0,
    section.getBoundingClientRect().top + window.scrollY - NAV_SCROLL_OFFSET,
  );

  window.scrollTo({ top, behavior: "smooth" });
}
