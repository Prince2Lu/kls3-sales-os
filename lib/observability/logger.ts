type LogContext = Record<string, unknown>

function write(level: 'info' | 'warn' | 'error', event: string, context: LogContext = {}): void {
  const entry = JSON.stringify({ level, event, timestamp: new Date().toISOString(), ...context })
  if (level === 'error') console.error(entry)
  else if (level === 'warn') console.warn(entry)
  else console.info(entry)
}

export const logger = {
  info: (event: string, context?: LogContext) => write('info', event, context),
  warn: (event: string, context?: LogContext) => write('warn', event, context),
  error: (event: string, context?: LogContext) => write('error', event, context),
}
