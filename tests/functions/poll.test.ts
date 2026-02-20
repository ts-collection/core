import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { poll } from '../../src/functions/poll';

describe('poll', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('poll.wait', () => {
    it('should resolve immediately when condition is truthy', async () => {
      const cond = vi.fn().mockResolvedValue('success');
      const promise = poll.wait(cond);
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe('success');
      expect(cond).toHaveBeenCalledTimes(1);
    });

    it('should poll until condition becomes truthy', async () => {
      let attempts = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        return attempts >= 3 ? Promise.resolve('done') : Promise.resolve(null);
      });

      const promise = poll.wait(cond, { interval: 50, jitter: false });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('done');
      expect(cond).toHaveBeenCalledTimes(3);
    });

    it('should timeout after specified time', async () => {
      const cond = vi.fn().mockResolvedValue(null);
      const promise = poll.wait(cond, {
        interval: 100,
        timeout: 250,
        jitter: false,
      });
      promise.catch(() => {});

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('Polling timed out after 250ms');
    });

    it('should respect custom interval', async () => {
      let attempts = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        return attempts >= 2 ? Promise.resolve('done') : Promise.resolve(null);
      });

      const promise = poll.wait(cond, { interval: 50, jitter: false });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('done');
      expect(cond).toHaveBeenCalledTimes(2);
    });

    it('should handle jitter by adding random delay', async () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

      let attempts = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        return attempts >= 2 ? Promise.resolve('done') : Promise.resolve(null);
      });

      const promise = poll.wait(cond, { interval: 100, jitter: true });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('done');
      expect(cond).toHaveBeenCalledTimes(2);
      expect(randomSpy).toHaveBeenCalled();

      randomSpy.mockRestore();
    });

    it('should disable jitter when set to false', async () => {
      const randomSpy = vi.spyOn(Math, 'random');

      let attempts = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        return attempts >= 2 ? Promise.resolve('done') : Promise.resolve(null);
      });

      const promise = poll.wait(cond, { interval: 50, jitter: false });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('done');
      expect(cond).toHaveBeenCalledTimes(2);
      expect(randomSpy).not.toHaveBeenCalled();

      randomSpy.mockRestore();
    });

    it('should handle condition function throwing errors', async () => {
      const cond = vi.fn().mockRejectedValue(new Error('Condition failed'));
      const promise = poll.wait(cond, {
        interval: 100,
        timeout: 200,
        jitter: false,
      });

      promise.catch(() => {});
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('Condition failed');
    });

    it('should use default options', async () => {
      let attempts = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        return attempts >= 2 ? Promise.resolve('done') : Promise.resolve(null);
      });

      const promise = poll.wait(cond);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('done');
      expect(cond).toHaveBeenCalledTimes(2);
    });

    it('should handle falsy but truthy values', async () => {
      const cond = vi
        .fn()
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce(false)
        .mockResolvedValue('truthy');

      const promise = poll.wait(cond, { interval: 50, jitter: false });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('truthy');
      expect(cond).toHaveBeenCalledTimes(4);
    });

    it('should not poll if condition is immediately truthy', async () => {
      const cond = vi.fn().mockResolvedValue('immediate');
      const promise = poll.wait(cond);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('immediate');
      expect(cond).toHaveBeenCalledTimes(1);
    });

    it('should handle abort signal already aborted', async () => {
      const abortController = new AbortController();
      abortController.abort();

      const cond = vi.fn().mockResolvedValue(null);
      const promise = poll.wait(cond, { signal: abortController.signal });
      promise.catch(() => {});

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('Polling aborted');
      expect(cond).not.toHaveBeenCalled();
    });

    it('should handle abort signal during polling', async () => {
      const abortController = new AbortController();
      const cond = vi.fn().mockResolvedValue(null);

      const promise = poll.wait(cond, {
        interval: 100,
        signal: abortController.signal,
        jitter: false,
      });
      promise.catch(() => {});

      await vi.advanceTimersByTimeAsync(50);
      abortController.abort();
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('Polling aborted');
    });

    it('should stop cleanly when returning poll.abort', async () => {
      let attempts = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        return attempts >= 2
          ? Promise.resolve(poll.signal.abort)
          : Promise.resolve(null);
      });

      const promise = poll.wait(cond, { interval: 50, jitter: false });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeUndefined();
      expect(cond).toHaveBeenCalledTimes(2);
    });

    it('should skip tick silently when returning poll.retry', async () => {
      let attempts = 0;
      let retryCount = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts === 1) {
          retryCount++;
          return Promise.resolve(poll.signal.retry);
        }
        return Promise.resolve('done');
      });

      const promise = poll.wait(cond, { interval: 50, jitter: false });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('done');
      expect(retryCount).toBe(1);
    });
  });

  describe('poll.watch', () => {
    it('should yield null while waiting and final value when resolved', async () => {
      let attempts = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        return attempts >= 3 ? Promise.resolve('done') : Promise.resolve(null);
      });

      const results: (string | null)[] = [];
      const generator = poll.watch<string>(cond, {
        interval: 50,
        jitter: false,
      });

      const iterate = async () => {
        for await (const value of generator) {
          results.push(value);
        }
      };

      const promise = iterate();
      await vi.runAllTimersAsync();
      await promise;

      expect(results).toEqual([null, null, 'done']);
      expect(cond).toHaveBeenCalledTimes(3);
    });

    it('should yield immediately when condition is truthy', async () => {
      const cond = vi.fn().mockResolvedValue('immediate');

      const results: (string | null)[] = [];
      const generator = poll.watch<string>(cond, {
        interval: 50,
        jitter: false,
      });

      const iterate = async () => {
        for await (const value of generator) {
          results.push(value);
        }
      };

      const promise = iterate();
      await vi.runAllTimersAsync();
      await promise;

      expect(results).toEqual(['immediate']);
      expect(cond).toHaveBeenCalledTimes(1);
    });

    it('should timeout after specified time', async () => {
      const cond = vi.fn().mockResolvedValue(null);
      const generator = poll.watch(cond, {
        interval: 100,
        timeout: 250,
        jitter: false,
      });

      const iterate = async () => {
        for await (const _ of generator) {
          // consume generator
        }
      };

      const promise = iterate();
      promise.catch(() => {});
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('Polling timed out after 250ms');
    });

    it('should handle abort signal already aborted', async () => {
      const abortController = new AbortController();
      abortController.abort();

      const cond = vi.fn().mockResolvedValue(null);
      const generator = poll.watch(cond, { signal: abortController.signal });

      const iterate = async () => {
        for await (const _ of generator) {
          // consume generator
        }
      };

      const promise = iterate();
      promise.catch(() => {});
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('Polling aborted');
      expect(cond).not.toHaveBeenCalled();
    });

    it('should handle abort signal during iteration', async () => {
      const abortController = new AbortController();
      const cond = vi.fn().mockResolvedValue(null);

      const results: (string | null)[] = [];
      let iterations = 0;

      const generator = poll.watch<string>(cond, {
        interval: 100,
        signal: abortController.signal,
        jitter: false,
      });

      const iterate = async () => {
        for await (const value of generator) {
          results.push(value);
          iterations++;
          if (iterations === 2) {
            abortController.abort();
          }
        }
      };

      const promise = iterate();
      promise.catch(() => {});
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('Polling aborted');
    });

    it('should stop cleanly when returning poll.signal.abort', async () => {
      let attempts = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        return attempts >= 2
          ? Promise.resolve(poll.signal.abort)
          : Promise.resolve(null);
      });

      const results: (string | null)[] = [];
      const generator = poll.watch<string>(cond, {
        interval: 50,
        jitter: false,
      });

      const iterate = async () => {
        for await (const value of generator) {
          results.push(value);
        }
      };

      const promise = iterate();
      await vi.runAllTimersAsync();
      await promise;

      expect(results).toEqual([null]);
      expect(cond).toHaveBeenCalledTimes(2);
    });

    it('should skip tick silently when returning poll.signal.retry', async () => {
      let attempts = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts === 1) return Promise.resolve(poll.signal.retry);
        if (attempts === 2) return Promise.resolve(null);
        return Promise.resolve('done');
      });

      const results: (string | null)[] = [];
      const generator = poll.watch<string>(cond, {
        interval: 50,
        jitter: false,
      });

      const iterate = async () => {
        for await (const value of generator) {
          results.push(value);
        }
      };

      const promise = iterate();
      await vi.runAllTimersAsync();
      await promise;

      expect(results).toEqual([null, 'done']);
      expect(cond).toHaveBeenCalledTimes(3);
    });

    it('should handle jitter in watch', async () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

      let attempts = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        return attempts >= 2 ? Promise.resolve('done') : Promise.resolve(null);
      });

      const results: (string | null)[] = [];
      const generator = poll.watch<string>(cond, {
        interval: 100,
        jitter: true,
      });

      const iterate = async () => {
        for await (const value of generator) {
          results.push(value);
        }
      };

      const promise = iterate();
      await vi.runAllTimersAsync();
      await promise;

      expect(results).toEqual([null, 'done']);
      expect(randomSpy).toHaveBeenCalled();

      randomSpy.mockRestore();
    });

    it('should handle condition throwing errors', async () => {
      const cond = vi.fn().mockRejectedValue(new Error('Condition failed'));
      const generator = poll.watch(cond, { interval: 100, jitter: false });

      const iterate = async () => {
        for await (const _ of generator) {
          // consume generator
        }
      };

      const promise = iterate();
      promise.catch(() => {});
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('Condition failed');
    });

    it('should use default interval of 5000ms', async () => {
      let attempts = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        return attempts >= 2 ? Promise.resolve('done') : Promise.resolve(null);
      });

      const promise = poll.wait(cond, { jitter: false });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('done');
      expect(cond).toHaveBeenCalledTimes(2);
    });

    it('should use default timeout of 5 minutes', async () => {
      let attempts = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        return Promise.resolve(null);
      });

      const promise = poll.wait(cond, { interval: 1000, jitter: false });
      promise.catch(() => {});

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('Polling timed out after 300000ms');
    });

    it('should use jitter true by default', async () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

      let attempts = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        return attempts >= 2 ? Promise.resolve('done') : Promise.resolve(null);
      });

      const promise = poll.wait(cond, { interval: 50 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('done');
      expect(randomSpy).toHaveBeenCalled();

      randomSpy.mockRestore();
    });

    it('should work without signal option', async () => {
      let attempts = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        return attempts >= 2 ? Promise.resolve('done') : Promise.resolve(null);
      });

      const promise = poll.wait(cond, { interval: 50, jitter: false });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('done');
      expect(cond).toHaveBeenCalledTimes(2);
    });

    it('should handle undefined return value as falsy', async () => {
      let attempts = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        return attempts >= 2
          ? Promise.resolve('done')
          : Promise.resolve(undefined);
      });

      const promise = poll.wait(cond, { interval: 50, jitter: false });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('done');
      expect(cond).toHaveBeenCalledTimes(2);
    });

    it('should treat null and undefined the same way in poll.watch', async () => {
      let attempts = 0;
      const cond = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts === 1) return Promise.resolve(undefined);
        if (attempts === 2) return Promise.resolve(null);
        return Promise.resolve('done');
      });

      const results: (string | null)[] = [];
      const generator = poll.watch<string>(cond, {
        interval: 50,
        jitter: false,
      });

      const iterate = async () => {
        for await (const value of generator) {
          results.push(value);
        }
      };

      const promise = iterate();
      await vi.runAllTimersAsync();
      await promise;

      expect(results).toEqual([null, null, 'done']);
      expect(cond).toHaveBeenCalledTimes(3);
    });
  });

  describe('poll.signal.abort symbol', () => {
    it('should be a unique symbol', () => {
      expect(typeof poll.signal.abort).toBe('symbol');
      expect(poll.signal.abort.description).toBe('poll.signal.abort');
    });

    it('should be different from poll.signal.retry', () => {
      expect(poll.signal.abort).not.toBe(poll.signal.retry);
    });
  });

  describe('poll.signal.retry symbol', () => {
    it('should be a unique symbol', () => {
      expect(typeof poll.signal.retry).toBe('symbol');
      expect(poll.signal.retry.description).toBe('poll.signal.retry');
    });
  });
});
