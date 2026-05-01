import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppEnv } from "../../app/context";
import { TestMode } from "../../test-mode/test-mode";
import { createErrorMapper } from "../error-mapper";

// `/__test__/*` is mounted unconditionally; each handler gates on
// `Config.isTestMode()` (via the feature module) and surfaces 404 when test
// mode is off, so production never exposes these.
const testModeRouter = new Hono<AppEnv>();

const mapNotEnabled = createErrorMapper([{ error: TestMode.NotEnabledError, status: 404 }]);

testModeRouter.get(
  "/status",
  describeRoute({
    summary: "[test-mode] Probe whether test mode is enabled",
    description:
      "Local-only. Gated by TEST_MODE=true. Returns {enabled: true} when on, 404 otherwise. Used by the @bainder/testing wrapper to skip suites when the dev server isn't running in test mode.",
    responses: {
      200: {
        description: "Test mode is enabled",
        content: { "application/json": { schema: resolver(TestMode.StatusResponse) } },
      },
      404: { description: "Test mode disabled" },
    },
  }),
  async (c) => {
    try {
      return c.json(TestMode.status());
    } catch (error) {
      const mapped = mapNotEnabled(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

testModeRouter.post(
  "/sign-in",
  describeRoute({
    summary: "[test-mode] Mint a Better Auth session for any email",
    description:
      "Local-only. Gated by TEST_MODE=true. Creates the user if missing and returns a session token usable as `Authorization: Bearer <token>`. Returns 404 in production.",
    responses: {
      200: {
        description: "Session minted",
        content: { "application/json": { schema: resolver(TestMode.SignInResponse) } },
      },
      404: { description: "Test mode disabled" },
    },
  }),
  validator("json", TestMode.SignInInput),
  async (c) => {
    const input = c.req.valid("json");
    try {
      const result = await TestMode.signIn(input);
      return c.json(result);
    } catch (error) {
      const mapped = mapNotEnabled(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

testModeRouter.post(
  "/reset",
  describeRoute({
    summary: "[test-mode] Wipe all user data and R2 objects",
    description:
      "Local-only. Gated by TEST_MODE=true. Deletes every user (FK cascades to documents, sessions, etc.) and sweeps the `users/` R2 prefix. Returns 404 in production.",
    responses: {
      204: { description: "State wiped" },
      404: { description: "Test mode disabled" },
    },
  }),
  async (c) => {
    try {
      await TestMode.reset();
      return c.body(null, 204);
    } catch (error) {
      const mapped = mapNotEnabled(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

export default testModeRouter;
