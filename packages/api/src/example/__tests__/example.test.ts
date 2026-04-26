import { describe, expect, it } from "bun:test";
import { Example } from "../example";

describe("Example feature", () => {
  it("creates and retrieves an entity", async () => {
    const created = await Example.create({ name: `t-${Date.now()}` });
    expect(created.id).toBeTruthy();

    const fetched = await Example.get(created.id);
    expect(fetched.id).toBe(created.id);
  });

  it("rejects duplicate names", async () => {
    const name = `dup-${Date.now()}`;
    await Example.create({ name });
    await expect(Example.create({ name })).rejects.toMatchObject({
      name: "ExampleNameTakenError",
    });
  });

  it("throws ExampleNotFoundError for missing id", async () => {
    await expect(Example.get("missing")).rejects.toMatchObject({
      name: "ExampleNotFoundError",
    });
  });
});
