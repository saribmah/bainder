import { beforeAll, describe, expect, test } from "bun:test";
import { resetState, signInAs } from "../lib/client";

describe("user", () => {
  beforeAll(async () => {
    await resetState();
  });

  test("GET /user/me returns the signed-in user", async () => {
    const { userId, client } = await signInAs("me@baindar.test", "Me Person");
    const me = await client.user.me();
    expect(me.error).toBeUndefined();
    expect(me.data?.id).toBe(userId);
    expect(me.data?.email).toBe("me@baindar.test");
    expect(me.data?.name).toBe("Me Person");
  });

  test("PATCH /user/me updates name and image", async () => {
    const { client } = await signInAs("update@baindar.test", "Original Name");

    const updated = await client.user.update({
      name: "Renamed",
      image: "https://example.com/avatar.png",
    });
    expect(updated.error).toBeUndefined();
    expect(updated.data?.name).toBe("Renamed");
    expect(updated.data?.image).toBe("https://example.com/avatar.png");

    // The change is persisted — a follow-up GET reads back the same values.
    const me = await client.user.me();
    expect(me.data?.name).toBe("Renamed");
    expect(me.data?.image).toBe("https://example.com/avatar.png");
  });

  test("PATCH /user/me accepts null image to clear it", async () => {
    const { client } = await signInAs("clear-image@baindar.test");
    await client.user.update({ image: "https://example.com/before.png" });

    const cleared = await client.user.update({ image: null });
    expect(cleared.error).toBeUndefined();
    expect(cleared.data?.image).toBeNull();
  });
});
