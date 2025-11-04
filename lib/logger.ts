/**
 * Simple logging utility for the AI Math Tutor
 */

type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return `${prefix} ${message}`;
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.isDevelopment && level === "debug") {
      return; // Skip debug logs in production
    }

    const formatted = this.formatMessage(level, message, ...args);
    
    switch (level) {
      case "debug":
        console.debug(formatted, ...args);
        break;
      case "info":
        console.info(formatted, ...args);
        break;
      case "warn":
        console.warn(formatted, ...args);
        break;
      case "error":
        console.error(formatted, ...args);
        break;
    }
  }

  debug(message: string, ...args: any[]): void {
    this.log("debug", message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log("info", message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log("warn", message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log("error", message, ...args);
  }
}

export const logger = new Logger();

