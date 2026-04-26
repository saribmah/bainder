import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppEnv } from "../../app/context";
import { Example } from "../../example/example";
import { createErrorMapper } from "../error-mapper";

const exampleRouter = new Hono<AppEnv>();

exampleRouter.get(
  "/",
  describeRoute({
    summary: "List examples",
    operationId: "example.list",
    responses: {
      200: {
        description: "All examples",
        content: {
          "application/json": {
            schema: resolver(Example.ListResponse),
          },
        },
      },
    },
  }),
  async (c) => {
    const items = await Example.list();
    return c.json({ items });
  },
);

exampleRouter.post(
  "/",
  describeRoute({
    summary: "Create example",
    operationId: "example.create",
    responses: {
      201: {
        description: "Created",
        content: {
          "application/json": {
            schema: resolver(Example.Entity),
          },
        },
      },
      409: { description: "Name already taken" },
    },
  }),
  validator("json", Example.CreateInput),
  async (c) => {
    const body = c.req.valid("json");
    const mapError = createErrorMapper([{ error: Example.ExampleNameTakenError, status: 409 }]);

    try {
      const entity = await Example.create(body);
      return c.json(entity, 201);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

exampleRouter.get(
  "/:id",
  describeRoute({
    summary: "Get example by id",
    operationId: "example.get",
    responses: {
      200: {
        description: "Example",
        content: {
          "application/json": {
            schema: resolver(Example.Entity),
          },
        },
      },
      404: { description: "Not found" },
    },
  }),
  async (c) => {
    const id = c.req.param("id");
    const mapError = createErrorMapper([{ error: Example.ExampleNotFoundError, status: 404 }]);

    try {
      const entity = await Example.get(id);
      return c.json(entity);
    } catch (error) {
      const mapped = mapError(error);
      if (!mapped) throw error;
      return c.json(mapped.payload, mapped.status);
    }
  },
);

export default exampleRouter;
