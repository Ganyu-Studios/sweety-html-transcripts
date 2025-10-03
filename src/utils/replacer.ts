type Identify<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type AuxIsStrictlyUndefined<T> = T extends undefined | null | never | void ? true : false;

type SnakeCase<S extends string> = S extends `${infer First}${infer Rest}`
  ? First extends Lowercase<First>
    ? `${First}${SnakeCase<Rest>}`
    : Rest extends `${infer Second}${string}`
      ? Second extends Lowercase<Second>
        ? `_${Lowercase<First>}${SnakeCase<Rest>}`
        : `${Lowercase<First>}${SnakeCase<Rest>}`
      : `_${Lowercase<First>}`
  : S;

type ObjectToSnakeUndefined<T> = T extends unknown[]
  ? ObjectToSnake<T[0]>[]
  : Identify<{
      [K in keyof T as K extends number ? K : SnakeCase<Exclude<K, symbol | number>>]: T[K] extends unknown[]
        ? ObjectToSnake<T[K][0]>[]
        : T[K] extends object
          ? ObjectToSnake<T[K]>
          : T[K];
    }>;

type ObjectToSnake<T> = Identify<{
  [K in keyof T as K extends number ? K : SnakeCase<Exclude<K, symbol | number>>]: T[K] extends unknown[]
    ? Identify<ObjectToSnake<T[K][0]>[]>
    : T[K] extends object
      ? Identify<ObjectToSnake<T[K]>>
      : AuxIsStrictlyUndefined<T[K]> extends true
        ? null
        : ObjectToSnakeUndefined<T[K]>;
}>;

/**
 * Checks if a given value is an object.
 * @param o The value to check.
 * @returns `true` if the value is an object, otherwise `false`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isObject(o: any): o is Record<string, unknown> {
  return o && typeof o === 'object' && !Array.isArray(o);
}

export const ReplaceRegex = {
  camel: (s: string) => {
    return s.toLowerCase().replace(/(_\S)/gi, (a) => a[1].toUpperCase());
  },
  snake: (s: string) => {
    // Handle sequences of uppercase letters (acronyms) and individual uppercase letters
    return s
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2') // Handle transition from acronym to word (e.g., URLPath -> URL_Path)
      .replace(/([a-z\d])([A-Z])/g, '$1_$2') // Handle transition from lowercase/digit to uppercase
      .toLowerCase();
  },
};

/**
 * Convert a camelCase object to snake_case.
 * @param target The object to convert.
 * @returns The converted object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSnakeCase<Obj extends Record<string, any>>(target: Obj): ObjectToSnake<Obj> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(target)) {
    switch (typeof value) {
      case 'string':
      case 'bigint':
      case 'boolean':
      case 'function':
      case 'number':
      case 'symbol':
      case 'undefined':
        result[ReplaceRegex.snake(key)] = value;
        break;
      case 'object': {
        if (Array.isArray(value)) {
          result[ReplaceRegex.snake(key)] = value.map((prop) =>
            typeof prop === 'object' && prop ? toSnakeCase(prop) : prop
          );
          break;
        }
        if (isObject(value)) {
          result[ReplaceRegex.snake(key)] = toSnakeCase(value);
          break;
        }
        if (!Number.isNaN(value)) {
          result[ReplaceRegex.snake(key)] = null;
          break;
        }
        result[ReplaceRegex.snake(key)] = toSnakeCase(value);
        break;
      }
    }
  }
  return result as ObjectToSnake<Obj>;
}
