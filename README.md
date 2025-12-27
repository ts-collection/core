# @ts-utilities/core

Core utilities for JavaScript/TypeScript projects, including React Native.

## Installation

```bash
npm install @ts-utilities/core
```

## Usage

```ts
import { deepmerge, debounce, sleep } from '@ts-utilities/core';

// Example usage
const merged = deepmerge({ a: 1 }, { b: 2 });
const debouncedFn = debounce(() => console.log('called'), 300);
await sleep(1000);
```

## What's Included

### Functions

- **deepmerge**: Advanced object merging with circular reference detection
- **hydrate**: Convert null values to undefined in data structures
- **object**: Utilities for working with nested objects (getObjectValue, extendProps)
- **poll**: Async polling with timeout and abort signal support
- **schedule**: Background task execution with retry logic
- **shield**: Safe error handling for sync/async operations
- **utils**: General utilities (debounce, throttle, sleep, printf, etc.)

### Types

- **gates**: Type-level logic gates (AND, OR, XOR, etc.)
- **guards**: Type guards and primitive checks
- **utilities**: Advanced TypeScript utilities (DeepPartial, KeysOfType, etc.)

## React Native Compatibility

This package is designed to work in React Native environments. All included utilities are platform-agnostic and don't depend on DOM APIs.

## License

ISC