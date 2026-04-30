import { beforeAll, describe, expect, test } from "bun:test";
import { apiBaseUrl, createTestClient, resetState, signInAs } from "../lib/client";

describe("auth", () => {
  beforeAll(async () => {
    await resetState();
  });

  test("test-mode sign-in mints a usable bearer token", async () => {
    const { userId, sessionToken, client } = await signInAs(
      "auth-roundtrip@bainder.test",
      "Auth Roundtrip",
    );
    expect(sessionToken).toBeTruthy();
    expect(userId).toBeTruthy();

    const me = await client.user.me();
    expect(me.error).toBeUndefined();
    expect(me.data?.id).toBe(userId);
    expect(me.data?.email).toBe("auth-roundtrip@bainder.test");
    expect(me.data?.name).toBe("Auth Roundtrip");
  });

  test("repeated sign-in upserts the same user but mints a fresh token", async () => {
    const first = await signInAs("repeat@bainder.test");
    const second = await signInAs("repeat@bainder.test");
    expect(second.userId).toBe(first.userId);
    expect(second.sessionToken).not.toBe(first.sessionToken);

    // Both tokens still work — Better Auth keeps prior sessions valid.
    const meWithFirst = await first.client.user.me();
    expect(meWithFirst.data?.id).toBe(first.userId);
    const meWithSecond = await second.client.user.me();
    expect(meWithSecond.data?.id).toBe(first.userId);
  });

  test("401 on protected route without a token", async () => {
    const anon = createTestClient();
    const me = await anon.user.me();
    expect(me.error).toBeDefined();
    expect(me.response.status).toBe(401);
  });

  test("401 on protected route with a bogus bearer token", async () => {
    const bogus = createTestClient("not-a-real-token");
    const me = await bogus.user.me();
    expect(me.error).toBeDefined();
    expect(me.response.status).toBe(401);
  });

  test("test-mode sign-in rejects malformed bodies", async () => {
    const res = await fetch(`${apiBaseUrl()}/__test__/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.ok).toBe(false);
  });
});
