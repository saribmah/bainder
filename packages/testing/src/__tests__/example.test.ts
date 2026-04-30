import { beforeAll, describe, expect, test } from "bun:test";
import { createTestClient, resetState } from "../lib/client";

describe("example", () => {
  beforeAll(async () => {
    await resetState();
  });

  test("create → get → list", async () => {
    const client = createTestClient();
    const name = `example-${crypto.randomUUID().slice(0, 8)}`;

    const created = await client.example.create({ name });
    expect(created.error).toBeUndefined();
    expect(created.data?.name).toBe(name);
    if (!created.data) throw new Error("no created data");

    const got = await client.example.get({ id: created.data.id });
    expect(got.error).toBeUndefined();
    expect(got.data?.id).toBe(created.data.id);
    expect(got.data?.name).toBe(name);

    const list = await client.example.list();
    expect(list.error).toBeUndefined();
    expect(list.data?.items.find((e) => e.id === created.data.id)).toBeDefined();
  });

  test("404 on unknown example id", async () => {
    const client = createTestClient();
    const got = await client.example.get({ id: crypto.randomUUID() });
    expect(got.error).toBeDefined();
    expect(got.response.status).toBe(404);
  });

  test("409 when creating a duplicate name", async () => {
    const client = createTestClient();
    const name = `dup-${crypto.randomUUID().slice(0, 8)}`;
    const first = await client.example.create({ name });
    expect(first.error).toBeUndefined();

    const second = await client.example.create({ name });
    expect(second.error).toBeDefined();
    expect(second.response.status).toBe(409);
  });
});
