/**
 * Inline scripts written into the transcript. They are small, so they ship as readable source.
 */

/** Clicking anything with `data-goto` (reply previews, pins) scrolls to and flashes that message. */
export const GOTO_SCRIPT = `document.addEventListener('click', (event) => {
  const id = event.target?.closest?.('[data-goto]')?.getAttribute('data-goto');
  const message = id && document.getElementById('m-' + id);
  if (!message) return;
  message.scrollIntoView({ behavior: 'smooth', block: 'center' });
  message.animate([{ backgroundColor: 'rgba(148,156,247,.1)' }, { backgroundColor: 'transparent' }], 1500);
});`;
