import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}

interface AuditEntry {
  timestamp: string;
  tool: string;
  action: string;
  success: boolean;
  durationMs: number;
  details?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Mask SSN to show only last 4 digits */
export function maskSSN(value: string): string {
  // Match patterns like 123-45-6789, 123456789, etc.
  return value.replace(
    /\b(\d{3})-?(\d{2})-?(\d{4})\b/g,
    '***-**-$3'
  );
}

/** Recursively mask SSN values in an object */
function maskSensitiveData(data: unknown): unknown {
  if (typeof data === 'string') {
    return maskSSN(data);
  }
  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }
  if (data !== null && typeof data === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('ssn') || lowerKey.includes('social') || lowerKey === 'password') {
        masked[key] = typeof value === 'string'
          ? (lowerKey === 'password' ? '********' : maskSSN(value))
          : '[REDACTED]';
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }
  return data;
}

export class Logger {
  private level: LogLevel;
  private logFilePath: string;
  private auditFilePath: string;

  constructor(level: LogLevel = 'info', logDir?: string) {
    this.level = level;
    const dir = logDir ?? join(process.cwd(), 'logs');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    this.logFilePath = join(dir, `mcp-${dateStr}.log`);
    this.auditFilePath = join(dir, `audit-${dateStr}.jsonl`);
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private writeLog(entry: LogEntry): void {
    const maskedEntry = {
      ...entry,
      data: entry.data ? maskSensitiveData(entry.data) as Record<string, unknown> : undefined,
    };
    const line = JSON.stringify(maskedEntry);

    // Write to stderr (stdout is reserved for MCP transport)
    if (this.shouldLog(entry.level)) {
      const prefix = `[${entry.level.toUpperCase()}]`;
      const msg = maskedEntry.data
        ? `${prefix} ${entry.message} ${JSON.stringify(maskedEntry.data)}`
        : `${prefix} ${entry.message}`;
      console.error(msg);
    }

    // Always write to file
    try {
      appendFileSync(this.logFilePath, line + '\n');
    } catch {
      // Silently fail file writes
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.writeLog({ timestamp: new Date().toISOString(), level: 'debug', message, data });
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.writeLog({ timestamp: new Date().toISOString(), level: 'info', message, data });
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.writeLog({ timestamp: new Date().toISOString(), level: 'warn', message, data });
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.writeLog({ timestamp: new Date().toISOString(), level: 'error', message, data });
  }

  /** Record an audit trail entry */
  audit(entry: Omit<AuditEntry, 'timestamp'>): void {
    const full: AuditEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
      details: entry.details
        ? maskSensitiveData(entry.details) as Record<string, unknown>
        : undefined,
    };
    const line = JSON.stringify(full);

    console.error(`[AUDIT] ${entry.tool}.${entry.action} success=${entry.success} ${entry.durationMs}ms`);

    try {
      appendFileSync(this.auditFilePath, line + '\n');
    } catch {
      // Silently fail file writes
    }
  }

  /** Start a timer for measuring operation duration */
  startTimer(): () => number {
    const start = performance.now();
    return () => Math.round(performance.now() - start);
  }
}
