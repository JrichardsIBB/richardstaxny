import type { Logger } from './logger.js';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms before first retry (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay cap in ms (default: 30000) */
  maxDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Error message patterns that should trigger a retry */
  retryablePatterns?: RegExp[];
  /** Operation name for logging */
  operationName?: string;
}

const DEFAULT_RETRYABLE_PATTERNS: RegExp[] = [
  /timeout/i,
  /navigation/i,
  /net::ERR_/i,
  /session.*closed/i,
  /target.*closed/i,
  /execution context/i,
  /frame.*detached/i,
  /ECONNREFUSED/i,
  /ECONNRESET/i,
];

function isRetryableError(error: unknown, patterns: RegExp[]): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return patterns.some(pattern => pattern.test(message));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  logger: Logger,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    retryablePatterns = DEFAULT_RETRYABLE_PATTERNS,
    operationName = 'operation',
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(
          initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
          maxDelayMs,
        );
        // Add jitter: +/- 20%
        const jitter = delay * 0.2 * (Math.random() * 2 - 1);
        const actualDelay = Math.round(delay + jitter);
        logger.info(`Retry ${attempt}/${maxRetries} for ${operationName} after ${actualDelay}ms`);
        await sleep(actualDelay);
      }

      return await fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);

      if (attempt < maxRetries && isRetryableError(error, retryablePatterns)) {
        logger.warn(`Retryable error in ${operationName}: ${message}`, {
          attempt: attempt + 1,
          maxRetries,
        });
        continue;
      }

      logger.error(`Non-retryable error or max retries reached for ${operationName}: ${message}`, {
        attempt: attempt + 1,
        maxRetries,
      });
      break;
    }
  }

  throw lastError;
}
