export function hitDropId(clientX: number, clientY: number): string | null {
  if (typeof document.elementsFromPoint === 'function') {
    const els = document.elementsFromPoint(clientX, clientY);
    for (const el of els) {
      const zone = el.closest?.('[data-drop-id]') as HTMLElement | null;
      if (zone?.dataset.dropId) return zone.dataset.dropId;
    }
  }
  const el = document.elementFromPoint(clientX, clientY);
  const zone = el?.closest('[data-drop-id]') as HTMLElement | null;
  return zone?.dataset.dropId || null;
}
