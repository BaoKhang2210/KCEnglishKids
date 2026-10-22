export function hitDropId(clientX: number, clientY: number): string | null {
  const el = document.elementFromPoint(clientX, clientY);
  const zone = el?.closest('[data-drop-id]') as HTMLElement | null;
  return zone?.dataset.dropId || null;
}
