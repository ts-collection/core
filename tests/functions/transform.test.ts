import { describe, expect, it } from 'vitest';
import { transform } from '../../src/functions/transform';

describe('transform — match null, replace with undefined', () => {
  it('should replace null with undefined in a flat object', () => {
    const result = transform({ name: null, age: 25 }, { match: 'null' });
    expect(result).toEqual({ name: undefined, age: 25 });
  });

  it('should leave non-null values unchanged', () => {
    const result = transform(
      { a: 1, b: 'hello', c: false, d: undefined },
      { match: 'null' },
    );
    expect(result).toEqual({ a: 1, b: 'hello', c: false, d: undefined });
  });

  it('should handle empty object', () => {
    const result = transform({}, { match: 'null' });
    expect(result).toEqual({});
  });

  it('should handle null top-level value', () => {
    const result = transform(null, { match: 'null' });
    expect(result).toBeUndefined();
  });

  it('should pass through primitive values that are not null', () => {
    expect(transform(42, { match: 'null' })).toBe(42);
    expect(transform('hello', { match: 'null' })).toBe('hello');
    expect(transform(false, { match: 'null' })).toBe(false);
    expect(transform(undefined, { match: 'null' })).toBeUndefined();
  });
});

describe('transform — nested objects', () => {
  it('should recurse into nested objects', () => {
    const result = transform(
      { a: { b: null, c: 1 }, d: null },
      { match: 'null' },
    );
    expect(result).toEqual({ a: { b: undefined, c: 1 }, d: undefined });
  });

  it('should handle deeply nested nulls', () => {
    const result = transform(
      { a: { b: { c: null, d: { e: null } } } },
      { match: 'null' },
    );
    expect(result).toEqual({ a: { b: { c: undefined, d: { e: undefined } } } });
  });
});

describe('transform — arrays', () => {
  it('should replace nulls inside arrays', () => {
    const result = transform([1, null, 2, null, 3], { match: 'null' });
    expect(result).toEqual([1, undefined, 2, undefined, 3]);
  });

  it('should recurse into objects inside arrays', () => {
    const result = transform(
      [
        { name: 'a', value: null },
        { name: 'b', value: 42 },
      ],
      { match: 'null' },
    );
    expect(result).toEqual([
      { name: 'a', value: undefined },
      { name: 'b', value: 42 },
    ]);
  });

  it('should handle nested arrays', () => {
    const result = transform(
      [
        [1, null],
        [null, 2],
      ],
      { match: 'null' },
    );
    expect(result).toEqual([
      [1, undefined],
      [undefined, 2],
    ]);
  });

  it('should handle empty arrays', () => {
    const result = transform([], { match: 'null' });
    expect(result).toEqual([]);
  });
});

describe('transform — match modes', () => {
  it('should match "undefined"', () => {
    const result = transform(
      { a: undefined, b: null, c: 1 },
      { match: 'undefined' },
    );
    expect(result).toEqual({ a: undefined, b: null, c: 1 });
  });

  it('should match "nullish"', () => {
    const result = transform(
      { a: undefined, b: null, c: 1 },
      { match: 'nullish' },
    );
    expect(result).toEqual({ a: undefined, b: undefined, c: 1 });
  });

  it('should match "falsy"', () => {
    const result = transform(
      { a: '', b: 0, c: false, d: null, e: undefined, f: 'yes' },
      { match: 'falsy' },
    );
    expect(result).toEqual({
      a: undefined,
      b: undefined,
      c: undefined,
      d: undefined,
      e: undefined,
      f: 'yes',
    });
  });

  it('should match "truthy" — root object is truthy, so entire result is replaced', () => {
    const result = transform(
      { a: '', b: 0, c: false, d: null, e: undefined, f: 'yes', g: 42 },
      { match: 'truthy' },
    );
    // The root object itself is truthy, so it matches and gets replaced
    expect(result).toBeUndefined();
  });

  it('should match "truthy" on a falsy root', () => {
    const result = transform(null, { match: 'truthy' });
    // null is falsy, so it doesn't match and passes through unchanged
    expect(result).toBeNull();
  });

  it('should match "truthy" on nested objects via custom matcher wrapper', () => {
    // Use a nested structure where we apply truthy via a wrapper
    const result = transform(
      { a: '', b: 'hello', c: 0, d: 42 },
      {
        match: (v, key) => key !== '' && !!v,
        action: { type: 'replace', value: '[TRUTHY]' },
      },
    );
    expect(result).toEqual({
      a: '',
      b: '[TRUTHY]',
      c: 0,
      d: '[TRUTHY]',
    });
  });

  it('should match "string"', () => {
    const result = transform(
      { a: 'hello', b: 42, c: null },
      { match: 'string' },
    );
    expect(result).toEqual({ a: undefined, b: 42, c: null });
  });

  it('should match "number"', () => {
    const result = transform(
      { a: 'hello', b: 42, c: null },
      { match: 'number' },
    );
    expect(result).toEqual({ a: 'hello', b: undefined, c: null });
  });

  it('should match "boolean"', () => {
    const result = transform(
      { a: true, b: false, c: 'yes' },
      { match: 'boolean' },
    );
    expect(result).toEqual({ a: undefined, b: undefined, c: 'yes' });
  });

  it('should match "nan"', () => {
    const result = transform({ a: NaN, b: 42, c: 'hello' }, { match: 'nan' });
    // Replace NaN with undefined
    expect(result.a).toBeUndefined();
    expect(result.b).toBe(42);
    expect(result.c).toBe('hello');
  });

  it('should match "empty"', () => {
    const result = transform(
      { a: '', b: null, c: undefined, d: [], e: {}, f: [1], g: 'x' },
      { match: 'empty' },
    );
    expect(result).toEqual({
      a: undefined,
      b: undefined,
      c: undefined,
      d: undefined,
      e: undefined,
      f: [1],
      g: 'x',
    });
  });

  it('should match "finite"', () => {
    const result = transform(
      { a: 42, b: NaN, c: Infinity, d: 'hello' },
      { match: 'finite' },
    );
    expect(result).toEqual({
      a: undefined,
      b: NaN,
      c: Infinity,
      d: 'hello',
    });
  });

  it('should match "integer"', () => {
    const result = transform(
      { a: 42, b: 3.14, c: -1, d: 'hello' },
      { match: 'integer' },
    );
    expect(result).toEqual({ a: undefined, b: 3.14, c: undefined, d: 'hello' });
  });

  it('should match "array"', () => {
    const result = transform(
      { a: [1, 2], b: { x: 1 }, c: 'hello' },
      { match: 'array' },
    );
    expect(result).toEqual({ a: undefined, b: { x: 1 }, c: 'hello' });
  });

  it('should match "object" — root object matches, entire result replaced', () => {
    const result = transform(
      { a: { x: 1 }, b: [1, 2], c: 'hello', d: null },
      { match: 'object' },
    );
    // Root is a non-null object, so it matches and gets replaced
    expect(result).toBeUndefined();
  });

  it('should match "object" on nested values under a non-matching root', () => {
    // null as root doesn't match 'object', so recursion happens
    const result = transform(null, { match: 'object' });
    expect(result).toBeNull();
  });

  it('should match "object" on individual nested properties', () => {
    const result = transform(
      { data: { a: 1 }, list: [1, 2, 3], name: 'hello' },
      {
        match: (v, key) => key !== '' && typeof v === 'object' && v !== null,
        action: { type: 'replace', value: '[OBJECT]' },
      },
    );
    expect(result).toEqual({
      data: '[OBJECT]',
      list: '[OBJECT]',
      name: 'hello',
    });
  });

  it('should match "plain-object" — root is a plain object, entire result replaced', () => {
    const result = transform(
      { a: { x: 1 }, b: [1, 2], c: 'hello', d: null },
      { match: 'plain-object' },
    );
    expect(result).toBeUndefined();
  });

  it('should match "plain-object" on nested values', () => {
    const result = transform(
      [
        { type: 'object', val: 1 },
        [1, 2, 3],
        'string',
        { type: 'object', val: 2 },
      ],
      {
        match: (v, key) =>
          key !== '' &&
          typeof v === 'object' &&
          v !== null &&
          !Array.isArray(v),
        action: { type: 'replace', value: '[PLAIN]' },
      },
    );
    expect(result).toEqual(['[PLAIN]', [1, 2, 3], 'string', '[PLAIN]']);
  });

  it('should match "function"', () => {
    const fn = () => {};
    const result = transform(
      { a: fn, b: 'hello', c: 42 },
      { match: 'function' },
    );
    expect(result).toEqual({ a: undefined, b: 'hello', c: 42 });
  });
});

describe('transform — replace action', () => {
  it('should replace nulls with a custom value', () => {
    const result = transform(
      { name: null, age: 25 },
      { match: 'null', action: { type: 'replace', value: 'N/A' } },
    );
    expect(result).toEqual({ name: 'N/A', age: 25 });
  });

  it('should replace nulls with empty string', () => {
    const result = transform(
      { name: null, bio: null, age: 25 },
      { match: 'null', action: { type: 'replace', value: '' } },
    );
    expect(result).toEqual({ name: '', bio: '', age: 25 });
  });

  it('should replace nulls with a number', () => {
    const result = transform(
      { score: null, count: 100 },
      { match: 'null', action: { type: 'replace', value: 0 } },
    );
    expect(result).toEqual({ score: 0, count: 100 });
  });

  it('should replace nulls in arrays with custom value', () => {
    const result = transform([1, null, 2, null], {
      match: 'null',
      action: { type: 'replace', value: 0 },
    });
    expect(result).toEqual([1, 0, 2, 0]);
  });

  it('should replace with an object value', () => {
    const fallback = { loaded: false };
    const result = transform(
      { data: null, other: 42 },
      { match: 'null', action: { type: 'replace', value: fallback } },
    );
    expect(result).toEqual({ data: fallback, other: 42 });
  });

  it('should replace with undefined explicitly', () => {
    const result = transform(
      { name: null, age: 25 },
      { match: 'null', action: { type: 'replace', value: undefined } },
    );
    expect(result).toEqual({ name: undefined, age: 25 });
  });
});

describe('transform — delete action', () => {
  it('should delete null values from objects', () => {
    const result = transform(
      { name: null, age: 25, bio: null },
      { match: 'null', action: { type: 'delete' } },
    );
    expect(result).toEqual({ age: 25 });
  });

  it('should delete matched entries from arrays', () => {
    const result = transform([1, null, 2, null, 3], {
      match: 'null',
      action: { type: 'delete' },
    });
    expect(result).toEqual([1, 2, 3]);
  });

  it('should delete objects inside arrays when matched', () => {
    const result = transform([{ name: 'a' }, null, { name: 'b' }], {
      match: 'null',
      action: { type: 'delete' },
    });
    expect(result).toEqual([{ name: 'a' }, { name: 'b' }]);
  });

  it('should delete nullish values from nested objects', () => {
    const result = transform(
      {
        user: { name: 'Alice', middle: null, age: 30 },
        metadata: null,
      },
      { match: 'null', action: { type: 'delete' } },
    );
    expect(result).toEqual({ user: { name: 'Alice', age: 30 } });
  });

  it('should delete falsy values including empty strings and zeros', () => {
    const result = transform(
      { name: '', age: 0, active: false, tag: 'x', score: null },
      { match: 'falsy', action: { type: 'delete' } },
    );
    expect(result).toEqual({ tag: 'x' });
  });

  it('should delete all items from an array when all match', () => {
    const result = transform([null, null, null], {
      match: 'null',
      action: { type: 'delete' },
    });
    expect(result).toEqual([]);
  });

  it('should keep array items that do not match', () => {
    const result = transform([1, null, 2, null, 3], {
      match: 'null',
      action: { type: 'delete' },
    });
    expect(result).toEqual([1, 2, 3]);
  });
});

describe('transform — custom matcher function', () => {
  it('should use a custom matcher function', () => {
    const result = transform(
      { name: '', age: 25, bio: 'hello' },
      {
        match: (v) => typeof v === 'string' && v.trim() === '',
        action: { type: 'delete' },
      },
    );
    expect(result).toEqual({ age: 25, bio: 'hello' });
  });

  it('should provide key to matcher function', () => {
    const result = transform(
      { name: 'alice', _secret: 'hidden', data: 'visible' },
      {
        match: (_v, key) => String(key).startsWith('_'),
        action: { type: 'delete' },
      },
    );
    expect(result).toEqual({ name: 'alice', data: 'visible' });
  });

  it('should provide numeric key for array items', () => {
    const result = transform(
      { items: ['a', 'b', 'c'] },
      {
        match: (_v, key) => key === 1,
        action: { type: 'replace', value: 'X' },
      },
    );
    expect(result).toEqual({ items: ['a', 'X', 'c'] });
  });

  it('should filter array by index with delete action', () => {
    const result = transform(['keep', 'delete-this', 'keep'], {
      match: (_v, key) => key === 1,
      action: { type: 'delete' },
    });
    expect(result).toEqual(['keep', 'keep']);
  });

  it('should work with deeply nested paths', () => {
    const result = transform(
      { a: { b: { c: 'remove', d: 'keep' } } },
      {
        match: (v, key) => v === 'remove' || key === 'remove',
        action: { type: 'delete' },
      },
    );
    expect(result).toEqual({ a: { b: { d: 'keep' } } });
  });
});

describe('transform — edge cases', () => {
  it('should pass through Date objects', () => {
    const date = new Date('2024-01-01');
    const result = transform({ date, value: null }, { match: 'null' });
    expect(result.date).toEqual(date);
    expect(result.value).toBeUndefined();
  });

  it('should pass through RegExp objects', () => {
    const regex = /test/gi;
    const result = transform({ regex, value: null }, { match: 'null' });
    expect(result.regex).toEqual(regex);
    expect(result.value).toBeUndefined();
  });

  it('should handle objects with no prototype', () => {
    const obj = Object.create(null);
    obj.a = null;
    obj.b = 1;
    const result = transform(obj, { match: 'null' });
    expect(result.a).toBeUndefined();
    expect(result.b).toBe(1);
  });

  it('should not mutate the original object', () => {
    const original = { name: null, age: 25 };
    const result = transform(original, { match: 'null' });
    expect(result).toEqual({ name: undefined, age: 25 });
    expect(original).toEqual({ name: null, age: 25 });
  });

  it('should handle a mix of types', () => {
    const result = transform(
      {
        string: 'hello',
        number: 42,
        boolean: true,
        nil: null,
        undef: undefined,
        arr: [1, null, 2],
        obj: { inner: null },
      },
      { match: 'null' },
    );
    expect(result).toEqual({
      string: 'hello',
      number: 42,
      boolean: true,
      nil: undefined,
      undef: undefined,
      arr: [1, undefined, 2],
      obj: { inner: undefined },
    });
  });

  it('should handle deeply nested arrays of objects', () => {
    const result = transform(
      {
        items: [
          { id: 1, tags: [{ name: null }] },
          { id: null, tags: [{ name: 'b' }] },
        ],
      },
      { match: 'null' },
    );
    expect(result).toEqual({
      items: [
        { id: 1, tags: [{ name: undefined }] },
        { id: undefined, tags: [{ name: 'b' }] },
      ],
    });
  });

  it('should handle delete in deeply nested arrays', () => {
    const result = transform(
      {
        items: [
          { id: 1, tags: [null, 'a'] },
          { id: null, tags: ['b', null] },
        ],
      },
      { match: 'null', action: { type: 'delete' } },
    );
    expect(result).toEqual({
      items: [{ id: 1, tags: ['a'] }, { tags: ['b'] }],
    });
  });

  it('should pass through symbols', () => {
    const sym = Symbol('test');
    const result = transform({ sym, nullVal: null }, { match: 'null' });
    expect(typeof result.sym).toBe('symbol');
    expect(result.nullVal).toBeUndefined();
  });
});

describe('transform — match key-based patterns on objects', () => {
  it('should replace values where key matches a pattern', () => {
    const result = transform(
      { password: 'secret', username: 'alice', token: 'abc123' },
      {
        match: (_v, key) => key === 'password' || key === 'token',
        action: { type: 'replace', value: '[REDACTED]' },
      },
    );
    expect(result).toEqual({
      password: '[REDACTED]',
      username: 'alice',
      token: '[REDACTED]',
    });
  });

  it('should delete entries where key starts with underscore', () => {
    const result = transform(
      { _private: 'hidden', name: 'visible', __meta: 'data' },
      {
        match: (_v, key) => String(key).startsWith('_'),
        action: { type: 'delete' },
      },
    );
    expect(result).toEqual({ name: 'visible' });
  });
});

describe('transform — nullish match modes', () => {
  it('should match all nullish values in nested structure with delete', () => {
    const result = transform(
      {
        a: undefined,
        b: null,
        c: { d: null, e: undefined, f: 1 },
        g: [null, undefined, 2],
      },
      { match: 'nullish', action: { type: 'delete' } },
    );
    expect(result).toEqual({ c: { f: 1 }, g: [2] });
  });
});
