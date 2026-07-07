import { transform } from './transform';

type Hydrate<T> = T extends null
  ? undefined
  : T extends (infer U)[]
    ? Hydrate<U>[]
    : T extends object
      ? { [K in keyof T]: Hydrate<T[K]> }
      : T;

/**
 * Converts all `null` values to `undefined` in the data structure recursively.
 *
 * @deprecated Use `transform(data, { match: 'null' })` instead. `hydrate` is a thin wrapper
 * around `transform` and will be removed in a future version.
 *
 * @param data - Any input data (object, array, primitive)
 * @returns Same type as input, but with all nulls replaced by undefined
 *
 * @example
 * ```ts
 * // Basic object hydration
 * hydrate({ name: null, age: 25 }) // { name: undefined, age: 25 }
 *
 * // Nested object hydration
 * hydrate({
 *   user: { email: null, profile: { avatar: null } },
 *   settings: { theme: 'dark' }
 * })
 * // { user: { email: undefined, profile: { avatar: undefined } }, settings: { theme: 'dark' } }
 *
 * // Array hydration
 * hydrate([null, 'hello', null, 42]) // [undefined, 'hello', undefined, 42]
 *
 * // Mixed data structures
 * hydrate({
 *   posts: [null, { title: 'Hello', content: null }],
 *   metadata: { published: null, tags: ['react', null] }
 * })
 * ```
 */
export function hydrate<T>(data: T): Hydrate<T> {
  return transform(data, { match: 'null' }) as Hydrate<T>;
}
