import { sleep } from './utils-core';

type PollOptions = Partial<{
  interval: number;
  timeout: number;
  signal: AbortSignal;
  jitter: boolean;
}>;

const ABORT = Symbol('poll.signal.abort');
const RETRY = Symbol('poll.signal.retry');

type PollControl = typeof ABORT | typeof RETRY;

/**
 * Streams an async `cond` function, yielding `null` while waiting and the
 * final truthy value `T` when resolved.
 *
 * Designed for use in tRPC subscriptions or any async generator context where
 * you want to stream progress to the client instead of blocking.
 *
 * Keeps SSE/WebSocket connections alive on edge runtimes (e.g. Vercel) by
 * continuously emitting values rather than holding a silent open connection.
 *
 * @template T The type of the successful result.
 *
 * @param cond
 * A function returning a Promise that resolves to:
 *   - a truthy value `T` → stop polling and yield it
 *   - `poll.signal.abort` → stop polling cleanly with no error
 *   - `poll.signal.retry` → skip this tick silently, no null emitted
 *   - falsy/null/undefined → yield `null` and continue polling
 *
 * @param options
 * Configuration options:
 * - `interval` (number) — Time between polls in ms (default: 5000 ms)
 * - `timeout` (number) — Max total duration before failing (default: 5 min)
 * - `jitter` (boolean) — Add small random offset (±10%) to intervals to avoid sync bursts (default: true)
 * - `signal` (AbortSignal) — Optional abort signal to cancel polling
 *
 * @throws `AbortError` if aborted via signal
 * @throws `Error` if timed out
 *
 * @example
 * ```ts
 * // tRPC subscription — stream null while job is pending, emit result when done
 * syncImageJob: privateProcedure
 *   .input(z.object({ id: z.coerce.number() }))
 *   .subscription(async function* ({ ctx, input, signal }) {
 *     yield* poll.watch(
 *       async () => {
 *         const job = await getJob(input.id);
 *         if (job?.is_cancelled) return poll.signal.abort; // stop cleanly
 *         if (job?.is_paused)    return poll.signal.retry; // skip this tick
 *         return job?.is_finished ? job : null;
 *       },
 *       { interval: 15000, signal },
 *     );
 *   }),
 * ```
 *
 * @example
 * ```ts
 * // Manually iterate
 * for await (const result of poll.watch(() => getJobStatus(), { interval: 3000 })) {
 *   if (result === null) console.log('still waiting...');
 *   else console.log('done!', result);
 * }
 * ```
 */
async function* watch<T>(
  cond: () => Promise<T | null | false | undefined | PollControl>,
  {
    interval = 5000,
    timeout = 5 * 60 * 1000,
    jitter = true,
    signal,
  }: PollOptions = {},
): AsyncGenerator<T | null> {
  const start = Date.now();

  for (;;) {
    if (signal?.aborted)
      throw new DOMException('Polling aborted', 'AbortError');

    const result = await cond();

    if (result === ABORT) return;
    if (result === RETRY) {
      const delay = jitter
        ? interval + (Math.random() - 0.5) * interval * 0.2
        : interval;
      await sleep(delay, signal);
      continue;
    }

    if (result) {
      yield result as T;
      return;
    }

    const elapsed = Date.now() - start;
    if (elapsed >= timeout) {
      throw new Error(`Polling timed out after ${timeout}ms`);
    }

    yield null;

    const delay = jitter
      ? interval + (Math.random() - 0.5) * interval * 0.2
      : interval;

    await sleep(delay, signal);
  }
}

/**
 * Repeatedly polls an async `cond` function UNTIL it returns a TRUTHY value,
 * or until the operation times out or is aborted.
 *
 * Designed for waiting on async jobs, external state, or delayed availability
 * where you only care about the final result and not intermediate states.
 *
 * Use `poll.watch` instead if you need to stream progress (e.g. tRPC subscriptions).
 *
 * @template T The type of the successful result.
 *
 * @param cond
 * A function returning a Promise that resolves to:
 *   - a truthy value `T` → stop polling and return it
 *   - `poll.signal.abort` → stop polling cleanly, resolves with undefined
 *   - `poll.signal.retry` → skip this tick silently
 *   - falsy/null/undefined → continue polling
 *
 * @param options
 * Configuration options:
 * - `interval` (number) — Time between polls in ms (default: 5000 ms)
 * - `timeout` (number) — Max total duration before failing (default: 5 min)
 * - `jitter` (boolean) — Add small random offset (±10%) to intervals to avoid sync bursts (default: true)
 * - `signal` (AbortSignal) — Optional abort signal to cancel polling
 *
 * @returns Resolves with the truthy value `T` when successful.
 * @throws `AbortError` if aborted via signal
 * @throws `Error` if timed out
 *
 * @example
 * ```ts
 * // Wait for a job to complete
 * const job = await poll.wait(async () => {
 *   const status = await getJobStatus();
 *   return status === 'done' ? status : null;
 * }, { interval: 3000, timeout: 60000 });
 * ```
 *
 * @example
 * ```ts
 * // Abort early based on domain logic
 * const job = await poll.wait(async () => {
 *   const job = await getJob(id);
 *   if (job?.is_cancelled) return poll.signal.abort;
 *   return job?.is_finished ? job : null;
 * }, { timeout: 60000 });
 * ```
 *
 * @example
 * ```ts
 * // Cancel polling with an AbortSignal
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 10000);
 *
 * try {
 *   const result = await poll.wait(
 *     () => checkExternalService(),
 *     { interval: 2000, signal: controller.signal },
 *   );
 * } catch (err) {
 *   if (err.name === 'AbortError') {
 *     console.log('Polling was cancelled');
 *   }
 * }
 * ```
 */
async function wait<T>(
  cond: () => Promise<T | null | false | undefined | PollControl>,
  options: PollOptions = {},
): Promise<T | undefined> {
  for await (const result of watch(cond, options)) {
    if (result) return result as T;
  }
  return undefined;
}

export const poll = {
  wait,
  watch,
  signal: {
    /** Stop polling cleanly with no error */
    abort: ABORT,
    /** Skip this tick silently without emitting null */
    retry: RETRY,
  },
} as const;
