import { z } from "zod";

export namespace Health {
  export const Response = z.object({
    status: z.literal("healthy"),
  });

  export type Response = z.infer<typeof Response>;
}
