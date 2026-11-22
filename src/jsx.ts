/**
 * A tiny JSX runtime that renders straight to HTML strings.
 *
 * The transcript is static markup for web components, so React only ever served as an expensive
 * string builder here. This keeps the TSX authoring style with none of the runtime: no virtual DOM,
 * no async components, no streams. Components are plain synchronous functions.
 *
 * Text children and attribute values are escaped. The only way to emit markup unescaped is
 * {@link raw}, which is reserved for content the renderer builds itself (inline scripts and styles).
 */

/** Markup that is already safe to place in the document. */
export class SafeHtml {
  public constructor(public readonly value: string) {}

  public toString(): string {
    return this.value;
  }
}

export type Child = SafeHtml | string | number | boolean | null | undefined | Child[];

export type Props = Record<string, unknown> & { children?: Child };

export type Component<P = Props> = (props: P) => Child;

const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source']);

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Escape text for use in element content or a double-quoted attribute value.
 * @param value - The text to escape
 */
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => ESCAPES[char]!);

/**
 * Emit markup without escaping it. Never pass it user content.
 * @param value - Markup the renderer itself produced
 */
export const raw = (value: string): SafeHtml => new SafeHtml(value);

const kebab = (key: string): string => key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

function styleToString(style: Record<string, unknown>): string {
  let out = '';
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null || value === false) continue;
    out += `${kebab(key)}:${String(value)};`;
  }
  return out;
}

function renderAttributes(props: Props): string {
  let out = '';

  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'key') continue;
    if (value === undefined || value === null || value === false) continue;

    const name = key === 'className' ? 'class' : key;

    if (value === true) {
      out += ` ${name}`;
    } else if (name === 'style' && typeof value === 'object') {
      out += ` style="${escapeHtml(styleToString(value as Record<string, unknown>))}"`;
    } else {
      out += ` ${name}="${escapeHtml(String(value))}"`;
    }
  }

  return out;
}

/**
 * Render any child to an HTML string.
 * @param child - The child to render
 */
export function renderChild(child: Child): string {
  if (child === null || child === undefined || child === false || child === true) return '';
  if (child instanceof SafeHtml) return child.value;
  if (Array.isArray(child)) {
    let out = '';
    for (const item of child) out += renderChild(item);
    return out;
  }
  return escapeHtml(String(child));
}

/**
 * The JSX factory (`jsxFactory` in tsconfig).
 */
export function h(tag: string | Component, props: Props | null, ...children: Child[]): SafeHtml {
  const allProps: Props = props ?? {};
  const kids: Child = children.length === 0 ? allProps.children : children.length === 1 ? children[0] : children;

  if (typeof tag === 'function') {
    return new SafeHtml(renderChild(tag({ ...allProps, children: kids })));
  }

  const open = `<${tag}${renderAttributes(allProps)}>`;
  if (VOID_ELEMENTS.has(tag)) return new SafeHtml(open);

  return new SafeHtml(`${open}${renderChild(kids)}</${tag}>`);
}

/**
 * The JSX fragment factory (`jsxFragmentFactory` in tsconfig).
 */
export function Fragment(props: { children?: Child }): SafeHtml {
  return new SafeHtml(renderChild(props.children));
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace h {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    type Element = SafeHtml;
    // Components may return any child (a string, null, an array), not only an element.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type ElementType = string | ((props: any) => Child);
    interface ElementChildrenAttribute {
      children: unknown;
    }
    interface IntrinsicElements {
      [tag: string]: Props;
    }
  }
}
