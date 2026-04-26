import z from "zod";

export namespace Log {
  export const Level = z
    .enum(["DEBUG", "INFO", "WARN", "ERROR"])
    .meta({ ref: "LogLevel", description: "Log level" });
  export type Level = z.infer<typeof Level>;

  const levelPriority: Record<Level, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  let level: Level = "INFO";

  function shouldLog(input: Level): boolean {
    return levelPriority[input] >= levelPriority[level];
  }

  export type Logger = {
    debug(message?: unknown, extra?: Record<string, unknown>): void;
    info(message?: unknown, extra?: Record<string, unknown>): void;
    error(message?: unknown, extra?: Record<string, unknown>): void;
    warn(message?: unknown, extra?: Record<string, unknown>): void;
    tag(key: string, value: string): Logger;
    clone(): Logger;
  };

  const loggers = new Map<string, Logger>();

  export function setLevel(next: Level) {
    level = next;
  }

  function formatError(error: Error, depth = 0): string {
    const result = error.message;
    return error.cause instanceof Error && depth < 10
      ? result + " Caused by: " + formatError(error.cause, depth + 1)
      : result;
  }

  let last = Date.now();

  export function create(tags?: Record<string, unknown>) {
    tags = tags || {};

    const service = tags["service"];
    if (service && typeof service === "string") {
      const cached = loggers.get(service);
      if (cached) {
        return cached;
      }
    }

    function build(message: unknown, extra?: Record<string, unknown>) {
      const prefix = Object.entries({
        ...tags,
        ...extra,
      })
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          const p = `${key}=`;
          if (value instanceof Error) return p + formatError(value);
          if (typeof value === "object") return p + JSON.stringify(value);
          return p + value;
        })
        .join(" ");
      const next = new Date();
      const diff = next.getTime() - last;
      last = next.getTime();
      return (
        [next.toISOString().split(".")[0], "+" + diff + "ms", prefix, message]
          .filter(Boolean)
          .join(" ") + "\n"
      );
    }

    const write = (msg: string) => {
      // Cloudflare Workers route stderr to the workers log stream.
      console.log(msg.trimEnd());
    };

    const result: Logger = {
      debug(message?: unknown, extra?: Record<string, unknown>) {
        if (shouldLog("DEBUG")) write("DEBUG " + build(message, extra));
      },
      info(message?: unknown, extra?: Record<string, unknown>) {
        if (shouldLog("INFO")) write("INFO  " + build(message, extra));
      },
      error(message?: unknown, extra?: Record<string, unknown>) {
        if (shouldLog("ERROR")) write("ERROR " + build(message, extra));
      },
      warn(message?: unknown, extra?: Record<string, unknown>) {
        if (shouldLog("WARN")) write("WARN  " + build(message, extra));
      },
      tag(key: string, value: string) {
        if (tags) tags[key] = value;
        return result;
      },
      clone() {
        return Log.create({ ...tags });
      },
    };

    if (service && typeof service === "string") {
      loggers.set(service, result);
    }

    return result;
  }
}
