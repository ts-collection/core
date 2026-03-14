import type { MaybeFunction } from '../types';
import { unwrap } from './utils-core';

/**
 * A task function that can be synchronous or asynchronous.
 */
export type Task = MaybeFunction<Promise<void> | void>;

/**
 * Options for configuring the schedule function.
 */
export interface ScheduleOpts {
  /** Number of retry attempts on failure. Defaults to 0. */
  retry?: number;
  /** Delay in milliseconds between retries. Defaults to 0. */
  delay?: number;
  /** Enable debug logging. Defaults to false. */
  debug?: boolean;
  /**
   * Pass `ctx.waitUntil` on serverless/edge runtimes (Vercel, Cloudflare, etc.)
   * to keep the execution context alive until the task settles.
   * Without this, the runtime may shut down before the task completes.
   *
   * @example
   * ```ts
   * // Vercel Edge / Next.js route handler
   * schedule(() => sendAnalytics(), { waitUntil: ctx.waitUntil });
   *
   * // Cloudflare Worker
   * schedule(() => logToR2(), { waitUntil: ctx.waitUntil });
   * ```
   */
  waitUntil?: (promise: Promise<unknown>) => void;
}

/**
 * Runs a function asynchronously in the background without blocking the main thread.
 *
 * Executes the task immediately using setTimeout, with optional retry logic on failure.
 * Useful for non-critical operations like analytics, logging, or background processing.
 * Logs execution time and retry attempts to the console.
 *
 * On serverless/edge runtimes, pass `waitUntil` from the execution context to prevent
 * the runtime from shutting down before the task completes.
 *
 * @param task - The function to execute asynchronously
 * @param options - Configuration options for retries, timing, and runtime context
 *
 * @example
 * ```ts
 * // Simple background task
 * schedule(() => {
 *   console.log('Background work done');
 * });
 *
 * // Task with retry on failure
 * schedule(
 *   () => sendAnalytics(),
 *   { retry: 3, delay: 1000 }
 * );
 *
 * // Serverless/edge runtime
 * schedule(
 *   () => sendAnalytics(),
 *   { retry: 3, delay: 1000, waitUntil: ctx.waitUntil }
 * );
 * ```
 */
export function schedule(task: Task, options: ScheduleOpts = {}) {
  const { retry = 0, delay = 0, debug = false, waitUntil } = options;

  const start = Date.now();

  const attempt = async (triesLeft: number) => {
    try {
      await unwrap(task);
      if (debug) {
        const total = Date.now() - start;
        console.log(`⚡[schedule.ts] Completed in ${total}ms`);
      }
    } catch (err) {
      if (debug) {
        console.log('⚡[schedule.ts] err:', err);
      }
      if (triesLeft > 0) {
        if (debug) {
          console.log(`⚡[schedule.ts] Retrying in ${delay}ms...`);
        }
        setTimeout(() => attempt(triesLeft - 1), delay);
      } else {
        if (debug) {
          const total = Date.now() - start;
          console.log(`⚡[schedule.ts] Failed after ${total}ms`);
        }
      }
    }
  };

  const work = new Promise<void>((resolve) => {
    setTimeout(() => attempt(retry).then(resolve), 0);
  });

  if (waitUntil) {
    waitUntil(work);
  }
}
