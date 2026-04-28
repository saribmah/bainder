import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppEnv } from "../../app/context";
import { Instance } from "../../instance";
import { requireAuth } from "../../middleware/auth";
import { User } from "../../user/user";
import { createErrorMapper } from "../error-mapper";

const userRouter = new Hono<AppEnv>();

userRouter.get(
  "/me",
  describeRoute({
    summary: "Get the authenticated user",
    operationId: "user.me",
    responses: {
      200: {
        description: "Current user",
        content: { "application/json": { schema: resolver(User.Entity) } },
      },
      401: { description: "Not authenticated" },
      404: { description: "User row missing" },
    },
  }),
  requireAuth,
  async (c) => {
    const mapError = createErrorMapper([{ error: User.UserNotFoundError, status: 404 }]);
    try {
      const me = await User.getMe(Instance.userId);
      return c.json(me);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

userRouter.patch(
  "/me",
  describeRoute({
    summary: "Update the authenticated user's profile",
    operationId: "user.update",
    responses: {
      200: {
        description: "Updated user",
        content: { "application/json": { schema: resolver(User.Entity) } },
      },
      401: { description: "Not authenticated" },
      404: { description: "User row missing" },
    },
  }),
  requireAuth,
  validator("json", User.UpdateInput),
  async (c) => {
    const body = c.req.valid("json");
    const mapError = createErrorMapper([{ error: User.UserNotFoundError, status: 404 }]);
    try {
      const me = await User.updateMe(Instance.userId, body);
      return c.json(me);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

export default userRouter;
