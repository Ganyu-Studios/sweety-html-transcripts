/**
 * Server mode only. Server-rendered shadow roots carry an empty `<style data-s="N">` instead of
 * their component's CSS, which was repeated in every instance and made up ~80% of the file. This
 * puts the shared sheets back (one parsed sheet per component, adopted by every instance), and
 * attaches declarative shadow roots by hand in browsers that do not parse them.
 */
export const SERVER_STYLES_SCRIPT = `(() => {
  const sheets = JSON.parse(document.getElementById('sweety-styles').textContent);
  const shared = sheets.map((css) => {
    try { const sheet = new CSSStyleSheet(); sheet.replaceSync(css); return sheet; } catch { return null; }
  });
  const attach = (root) => {
    for (const template of root.querySelectorAll('template[shadowrootmode]')) {
      const host = template.parentNode;
      if (host.shadowRoot) continue;
      host.attachShadow({ mode: template.getAttribute('shadowrootmode') }).appendChild(template.content);
      template.remove();
      attach(host.shadowRoot);
    }
  };
  const style = (root) => {
    for (const element of root.querySelectorAll('*')) {
      const shadow = element.shadowRoot;
      if (!shadow) continue;
      const placeholder = shadow.querySelector('style[data-s]');
      if (placeholder) {
        const index = Number(placeholder.dataset.s);
        if (shared[index]) shadow.adoptedStyleSheets = [shared[index]];
        else placeholder.textContent = sheets[index];
      }
      style(shadow);
    }
  };
  attach(document);
  style(document);
})();`;
