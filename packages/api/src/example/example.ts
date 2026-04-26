import { z } from "zod";
import { NamedError } from "../utils/error";
import { ExampleStorage } from "./storage";

// Example feature demonstrating the canonical namespace + Entity + error pattern.
// Replace this whole feature when scaffolding your own. See `.agents/add-feature.md`.
export namespace Example {
  // ---- Errors -------------------------------------------------------------
  export const ExampleNotFoundError = NamedError.create(
    "ExampleNotFoundError",
    z.object({
      id: z.string(),
      message: z.string().optional(),
    }),
  );
  export type ExampleNotFoundError = InstanceType<typeof ExampleNotFoundError>;

  export const ExampleNameTakenError = NamedError.create(
    "ExampleNameTakenError",
    z.object({
      name: z.string(),
      message: z.string().optional(),
    }),
  );
  export type ExampleNameTakenError = InstanceType<typeof ExampleNameTakenError>;

  // ---- Entity (canonical domain shape) -----------------------------------
  export const Entity = z
    .object({
      id: z.string(),
      name: z.string(),
      createdAt: z.string(),
    })
    .meta({ ref: "Example" });
  export type Entity = z.infer<typeof Entity>;

  // ---- Inputs / Outputs --------------------------------------------------
  export const CreateInput = z.object({
    name: z.string().min(1).max(100),
  });
  export type CreateInput = z.infer<typeof CreateInput>;

  export const ListResponse = z.object({
    items: z.array(Entity),
  });
  export type ListResponse = z.infer<typeof ListResponse>;

  // ---- Feature operations ------------------------------------------------
  export const create = async (input: CreateInput): Promise<Entity> => {
    const existing = await ExampleStorage.findByName(input.name);
    if (existing) {
      throw new ExampleNameTakenError({ name: input.name });
    }
    return ExampleStorage.create({ name: input.name });
  };

  export const get = async (id: string): Promise<Entity> => {
    const entity = await ExampleStorage.get(id);
    if (!entity) {
      throw new ExampleNotFoundError({ id });
    }
    return entity;
  };

  export const list = async (): Promise<Entity[]> => {
    return ExampleStorage.list();
  };
}
