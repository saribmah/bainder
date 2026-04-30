import { describe, expect, test } from "bun:test";
import { createTestClient } from "../lib/client";

describe("health", () => {
  test("GET /health returns { status: 'healthy' }", async () => {
    const client = createTestClient();
    const res = await client.health.get();
    expect(res.error).toBeUndefined();
    expect(res.data).toEqual({ status: "healthy" });
  });
});
