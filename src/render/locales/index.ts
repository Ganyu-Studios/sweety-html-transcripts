import type { Child } from '../jsx';
import { en } from './en';
import { es } from './es';
import type { Locale } from './types';

export type { Locale } from './types';

export const locales = { en, es } satisfies Record<string, Locale>;

export type LocaleName = keyof typeof locales;

/** A built-in locale by name, or your own, optionally overriding parts of English. */
export function resolveLocale(locale: LocaleName | DeepPartial<Locale> | undefined): Locale {
  if (locale === undefined) return en;
  if (typeof locale === 'string') return locales[locale] ?? en;
  return merge(en, locale);
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string[] ? string[] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function merge<T>(base: T, override: DeepPartial<T>): T {
  const out = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    if (value === undefined) continue;
    const current = out[key];
    out[key] =
      value && typeof value === 'object' && !Array.isArray(value) && current && typeof current === 'object'
        ? merge(current, value as DeepPartial<typeof current>)
        : value;
  }
  return out as T;
}

/** Pick a plural form. */
export const plural = (forms: { one: string; other: string }, count: number): string =>
  (count === 1 ? forms.one : forms.other).replaceAll('{count}', String(count));

/** Fill `{name}` placeholders in a locale template with rendered children. */
export function fill(template: string, values: Record<string, Child>): Child[] {
  return template.split(/(\{\w+\})/).map((part) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    return key !== undefined && key in values ? values[key] : part;
  });
}
