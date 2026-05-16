import { Polar } from "@polar-sh/sdk";
import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import type { AppEnv } from "../../app/context";
import { Billing } from "../../billing/billing";
import { Config } from "../../config/config";
import { Instance } from "../../instance";
import { requireAuth } from "../../middleware/auth";

const billingRouter = new Hono<AppEnv>();

billingRouter.get(
  "/me",
  describeRoute({
    summary: "Get the caller's billing status",
    description:
      'Returns the caller\'s plan, subscription status, current-period usage, and quota limits. The Free plan is implicit — users without an explicit subscription row get `plan: "free", status: "active"`. `periodResetAt` is the ISO timestamp at which the current usage counters roll over (start of the next UTC calendar month in Phase 1).',
    operationId: "billing.me",
    responses: {
      200: {
        description: "Billing status",
        content: { "application/json": { schema: resolver(Billing.StatusResponse) } },
      },
      401: { description: "Not authenticated" },
    },
  }),
  requireAuth,
  async (c) => {
    const status = await Billing.getStatus(Instance.userId);
    return c.json(status);
  },
);

// GET wrapper around Polar's checkout.create. The Polar Better Auth plugin
// only exposes `POST /auth/checkout` with `{slug}` in the body, which our
// upgrade buttons (anchors on web/desktop, Linking.openURL on mobile)
// cannot invoke uniformly. This route lets all three clients open a single
// URL and end up on Polar's hosted checkout.
billingRouter.get(
  "/checkout/:plan",
  describeRoute({
    summary: "Start a Polar checkout session for a plan",
    description:
      "Creates a Polar checkout session for the named plan and 302-redirects the browser to the hosted checkout. The signed-in user is passed to Polar as `externalCustomerId` so the eventual webhook can resolve back to our user row.",
    operationId: "billing.checkout",
    responses: {
      302: { description: "Redirect to Polar checkout" },
      400: { description: "Unknown plan or plan not configured" },
      401: { description: "Not authenticated" },
      500: { description: "Polar not configured" },
    },
  }),
  requireAuth,
  async (c) => {
    const planParam = c.req.param("plan");
    if (planParam !== "personal" && planParam !== "pro" && planParam !== "byok") {
      return c.json({ error: "unknown_plan" }, 400);
    }
    const productId = Config.getPolarProductForPlan(planParam);
    if (!productId) {
      return c.json({ error: "plan_not_configured" }, 400);
    }
    const polarConfig = Config.getPolar();
    if (!polarConfig) {
      return c.json({ error: "polar_not_configured" }, 500);
    }
    const polar = new Polar({
      accessToken: polarConfig.accessToken,
      server: polarConfig.server,
    });
    const checkout = await polar.checkouts.create({
      products: [productId],
      externalCustomerId: Instance.userId,
      successUrl: polarConfig.successUrl,
    });
    return c.redirect(checkout.url, 302);
  },
);

// GET wrapper around Polar's customer-portal session creation. Same
// rationale as `/checkout/:plan` — exposes a uniform URL the clients can
// open directly. Returns 404 if the user has no Polar customer yet (free
// plan), so the frontend can hide the button accordingly.
billingRouter.get(
  "/portal",
  describeRoute({
    summary: "Open the Polar customer portal",
    description:
      "Creates a Polar customer-session and 302-redirects the browser to the portal URL. The session is scoped to the signed-in user via `externalCustomerId`.",
    operationId: "billing.portal",
    responses: {
      302: { description: "Redirect to Polar customer portal" },
      401: { description: "Not authenticated" },
      404: { description: "User has no Polar customer yet (free plan)" },
      500: { description: "Polar not configured" },
    },
  }),
  requireAuth,
  async (c) => {
    const polarConfig = Config.getPolar();
    if (!polarConfig) {
      return c.json({ error: "polar_not_configured" }, 500);
    }
    const polar = new Polar({
      accessToken: polarConfig.accessToken,
      server: polarConfig.server,
    });
    try {
      const session = await polar.customerSessions.create({
        externalCustomerId: Instance.userId,
      });
      return c.redirect(session.customerPortalUrl, 302);
    } catch {
      // Polar returns 404 when no customer record exists for the
      // external id — the user is on free and has never checked out.
      return c.json({ error: "no_polar_customer" }, 404);
    }
  },
);

export default billingRouter;
