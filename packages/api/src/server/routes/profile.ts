import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppEnv } from "../../app/context";
import { Instance } from "../../instance";
import { requireAuth } from "../../middleware/auth";
import { Profile } from "../../profile/profile";
import { createErrorMapper } from "../error-mapper";

const profileRouter = new Hono<AppEnv>();

profileRouter.get(
  "/me",
  describeRoute({
    summary: "Get the authenticated user's profile preferences",
    operationId: "profile.me",
    responses: {
      200: {
        description: "Current profile",
        content: { "application/json": { schema: resolver(Profile.Entity) } },
      },
      401: { description: "Not authenticated" },
    },
  }),
  requireAuth,
  async (c) => {
    const me = await Profile.getMe(Instance.userId);
    return c.json(me);
  },
);

profileRouter.patch(
  "/me",
  describeRoute({
    summary: "Update the authenticated user's profile preferences",
    operationId: "profile.update",
    responses: {
      200: {
        description: "Updated profile",
        content: { "application/json": { schema: resolver(Profile.Entity) } },
      },
      401: { description: "Not authenticated" },
      404: { description: "Profile row missing" },
    },
  }),
  requireAuth,
  validator("json", Profile.UpdateInput),
  async (c) => {
    const body = c.req.valid("json");
    const mapError = createErrorMapper([{ error: Profile.NotFoundError, status: 404 }]);
    try {
      const me = await Profile.updateMe(Instance.userId, body);
      return c.json(me);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

export default profileRouter;
