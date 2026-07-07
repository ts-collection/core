import { isMatch, isPlainObject, type TypeMatcher } from '../types';

/** What to do once a value matches */
type Action<R> = { type: 'replace'; value: R } | { type: 'delete' };

type DenullifyOptions<R = undefined> = {
  /**
   * Determines which values are considered targets.
   * - 'null' | 'undefined' | 'nullish' | 'falsy' — built-in shorthand
   * - custom function — (value, key) => boolean for arbitrary logic
   */
  match: TypeMatcher;

  /**
   * What happens to a matched value:
   * - { type: 'replace', value } — substitute matched value with `value`
   * - { type: 'delete' } — remove the key (objects) or entry (arrays) entirely
   * Defaults to { type: 'replace', value: undefined } if omitted.
   */
  action?: Action<R>;
};

type Transform<T, R> = T extends null
  ? R
  : T extends (infer U)[]
    ? Transform<U, R>[]
    : T extends object
      ? { [K in keyof T]: Transform<T[K], R> }
      : T;

/**
 * Recursively matches values and either replaces or deletes them.
 *
 * @example
 * transform({ name: null, age: 25 }, { match: 'null' })
 * // { name: undefined, age: 25 }
 *
 * @example
 * transform({ name: null, age: 25 }, { match: 'null', action: { type: 'replace', value: '' } })
 * // { name: '', age: 25 }
 *
 * @example
 * transform({ name: null, bio: undefined, age: 25 }, { match: 'nullish', action: { type: 'delete' } })
 * // { age: 25 }
 *
 * @example
 * transform({ name: '', age: 0, active: false, tag: 'x' }, { match: 'falsy', action: { type: 'delete' } })
 * // { tag: 'x' }
 *
 * @example
 * transform(
 *   { name: '', age: 25 },
 *   { match: (v) => typeof v === 'string' && v.trim() === '', action: { type: 'delete' } }
 * )
 * // { age: 25 }
 */
export function transform<T, R = undefined>(
  data: T,
  options: DenullifyOptions<R>,
): Transform<T, R> {
  const match = options.match;
  const action = options.action ?? { type: 'replace', value: undefined as R };
  return convert(data, match, action) as Transform<T, R>;
}

const DELETE_MARKER = Symbol('transform.delete');

function convert(
  value: unknown,
  key: string | number,
  matcher: TypeMatcher,
  action: Action<unknown>,
): unknown;
function convert(
  value: unknown,
  matcher: TypeMatcher,
  action: Action<unknown>,
): unknown;
function convert(
  value: unknown,
  keyOrMatcher: string | number | TypeMatcher,
  matcherOrAction: TypeMatcher | Action<unknown>,
  maybeAction?: Action<unknown>,
): unknown {
  // Normalize overload: top-level call omits `key`
  const hasKey = maybeAction !== undefined;
  const key: string | number = hasKey ? (keyOrMatcher as string | number) : '';
  const matcher: TypeMatcher = hasKey
    ? (matcherOrAction as TypeMatcher)
    : (keyOrMatcher as TypeMatcher);
  const action: Action<unknown> = hasKey
    ? maybeAction!
    : (matcherOrAction as Action<unknown>);

  if (isMatch(value, key, matcher)) {
    return action.type === 'delete' ? DELETE_MARKER : action.value;
  }

  if (typeof value !== 'object' || value === null) return value;

  if (Array.isArray(value)) {
    const mapped = value.map((item, i) => convert(item, i, matcher, action));
    return mapped.filter((item) => item !== DELETE_MARKER);
  }

  if (isPlainObject(value)) {
    const result: Record<string, any> = {};
    for (const k in value) {
      const converted = convert((value as any)[k], k, matcher, action);
      if (converted === DELETE_MARKER) continue;
      result[k] = converted;
    }
    return result;
  }

  return value;
}
