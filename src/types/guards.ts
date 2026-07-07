/**
 * Represents primitive JavaScript types including null and undefined.
 */
export type Primitive =
  | string
  | number
  | bigint
  | boolean
  | symbol
  | null
  | undefined;

/**
 * Represents all falsy values in JavaScript.
 */
export type Falsy = false | '' | 0 | null | undefined;

/**
 * Type guard that checks if a value is falsy.
 *
 * @param val - The value to check
 * @returns True if the value is falsy, false otherwise
 *
 * @example
 * if (isFalsy(value)) {
 *   console.log('Value is falsy');
 * }
 */
export const isFalsy = (val: unknown): val is Falsy => !val;
/**
 * Type guard that checks if a value is null or undefined.
 *
 * @param val - The value to check
 * @returns True if the value is null or undefined, false otherwise
 *
 * @example
 * if (isNullish(value)) {
 *   console.log('Value is null or undefined');
 * }
 */
export const isNullish = (val: unknown): val is null | undefined => val == null;
/**
 * Type guard that checks if a value is a boolean.
 *
 * @param val - The value to check
 * @returns True if the value is a boolean, false otherwise
 *
 * @example
 * if (isBoolean(value)) {
 *   console.log('Value is a boolean');
 * }
 */
export const isBoolean = (val: unknown): val is boolean =>
  typeof val === 'boolean';
/**
 * Type guard that checks if a value is a string.
 *
 * @param val - The value to check
 * @returns True if the value is a string, false otherwise
 *
 * @example
 * if (isString(value)) {
 *   console.log('Value is a string');
 * }
 */
export const isString = (val: unknown): val is string =>
  typeof val === 'string';
/**
 * Checks whether a value represents a finite number.
 *
 * This excludes `NaN`, `Infinity`, and `-Infinity`.
 * Accepts numbers or strings that can be parsed to finite numbers.
 *
 * @param val - The value to check
 * @returns `true` if the value represents a finite number
 *
 * @example
 * isFiniteNumber(42);        // true
 * isFiniteNumber('42');      // true
 * isFiniteNumber(NaN);       // false
 * isFiniteNumber(Infinity); // false
 * isFiniteNumber('abc');    // false
 */
export const isFiniteNumber = (val: unknown): boolean => {
  if (typeof val === 'number') {
    return Number.isFinite(val);
  }
  if (typeof val === 'string') {
    const num = Number(val);
    return Number.isFinite(num);
  }
  return false;
};
/**
 * Type guard that checks if a value is an array.
 *
 * @param val - The value to check
 * @returns True if the value is an array, false otherwise
 *
 * @example
 * if (isArray(value)) {
 *   console.log('Value is an array');
 * }
 */
export const isArray = (val: unknown): val is unknown[] => Array.isArray(val);
/**
 * Type guard that checks if a value is a function.
 *
 * @param val - The value to check
 * @returns True if the value is a function, false otherwise
 *
 * @example
 * if (isFunction(value)) {
 *   console.log('Value is a function');
 * }
 */
export const isFunction = (val: unknown): val is Function =>
  typeof val === 'function';
/**
 * Type guard that checks if a value is a primitive type.
 *
 * @param val - The value to check
 * @returns True if the value is a primitive, false otherwise
 *
 * @example
 * if (isPrimitive(value)) {
 *   console.log('Value is a primitive type');
 * }
 */
export const isPrimitive = (val: unknown): val is Primitive => {
  if (val === null || val === undefined) {
    return true;
  }
  switch (typeof val) {
    case 'string':
    case 'number':
    case 'bigint':
    case 'boolean':
    case 'symbol': {
      return true;
    }
    default:
      return false;
  }
};
/**
 * Type guard that checks if a value is a plain object (not an array, function, etc.).
 *
 * @param value - The value to check
 * @returns True if the value is a plain object, false otherwise
 *
 * @example
 * if (isPlainObject(value)) {
 *   console.log('Value is a plain object');
 * }
 */
export function isPlainObject(value: unknown): value is Record<string, any> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (Object.prototype.toString.call(value) !== '[object Object]') {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/** Built-in shorthand matchers for common JS/TS value checks */
type MatchMode =
  | 'null'
  | 'undefined'
  | 'nullish'
  | 'falsy'
  | 'truthy'
  | 'string'
  | 'number'
  | 'boolean'
  | 'symbol'
  | 'bigint'
  | 'function'
  | 'object'
  | 'array'
  | 'plain-object'
  | 'nan'
  | 'empty'
  | 'finite'
  | 'integer';

/** Custom matcher function for arbitrary matching logic */
type MatchFn = (value: unknown, key?: string | number) => boolean;

/** Accepts either a shorthand mode or a custom predicate */
export type TypeMatcher = MatchMode | MatchFn;

export function isMatch(value: unknown, matcher: TypeMatcher): boolean;
export function isMatch(
  value: unknown,
  key: string | number,
  matcher: TypeMatcher,
): boolean;
export function isMatch(
  value: unknown,
  keyOrMatcher: string | number | TypeMatcher,
  maybeMatcher?: TypeMatcher,
): boolean {
  const key: string | number | undefined =
    maybeMatcher !== undefined ? (keyOrMatcher as string | number) : undefined;
  const matcher: TypeMatcher =
    maybeMatcher !== undefined ? maybeMatcher : (keyOrMatcher as TypeMatcher);

  if (typeof matcher === 'function') return matcher(value, key);

  switch (matcher) {
    case 'null':
      return value === null;
    case 'undefined':
      return value === undefined;
    case 'nullish':
      return value == null;
    case 'falsy':
      return !value;
    case 'truthy':
      return !!value;
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'symbol':
      return typeof value === 'symbol';
    case 'bigint':
      return typeof value === 'bigint';
    case 'function':
      return typeof value === 'function';
    case 'object':
      return typeof value === 'object' && value !== null;
    case 'array':
      return Array.isArray(value);
    case 'plain-object':
      return isPlainObject(value);
    case 'nan':
      return Number.isNaN(value);
    case 'empty':
      if (value === '' || value === null || value === undefined) return true;
      if (Array.isArray(value)) return value.length === 0;
      if (isPlainObject(value)) return Object.keys(value).length === 0;
      return false;
    case 'finite':
      return isFiniteNumber(value);
    case 'integer':
      return Number.isInteger(value);
  }
}
