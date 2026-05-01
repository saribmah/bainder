import z from "zod";

// Walk the `cause` chain so wrapped DB errors don't lose the underlying
// driver message. Drizzle's DrizzleQueryError dumps the SQL+params into
// `.message` and keeps the SQLite/D1 reason on `.cause`; without this, the
// real failure (e.g. "too many SQL variables") is hidden behind a megabyte
// of bound-parameter text.
export function formatErrorChain(error: unknown, depth = 0): string {
  if (!(error instanceof Error)) return String(error);
  const message = error.message || error.name;
  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause instanceof Error && depth < 10) {
    return `${message} | caused by: ${formatErrorChain(cause, depth + 1)}`;
  }
  return message;
}

export abstract class NamedError extends Error {
  abstract schema(): z.core.$ZodType;
  abstract toObject(): { name: string; data: unknown };

  static create<Name extends string, Data extends z.core.$ZodType>(name: Name, data: Data) {
    const schema = z
      .object({
        name: z.literal(name),
        data,
      })
      .meta({
        ref: name,
      });
    const result = class extends NamedError {
      public static readonly Schema = schema;

      public override readonly name = name as Name;

      constructor(
        public readonly data: z.input<Data>,
        options?: ErrorOptions,
      ) {
        super(name, options);
        this.name = name;
      }

      static isInstance(input: unknown): input is InstanceType<typeof result> {
        return (
          typeof input === "object" &&
          input !== null &&
          "name" in input &&
          (input as { name: unknown }).name === name
        );
      }

      schema() {
        return schema;
      }

      toObject() {
        return {
          name: name,
          data: this.data,
        };
      }
    };
    Object.defineProperty(result, "name", { value: name });
    return result;
  }

  public static readonly Unknown = NamedError.create(
    "UnknownError",
    z.object({
      message: z.string(),
    }),
  );
}
