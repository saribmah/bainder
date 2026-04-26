import type { MiddlewareHandler } from "hono";

const errorHandler: MiddlewareHandler = async (c, next) => {
  try {
    await next();
  } catch (error) {
    console.error(error);
    return c.json(
      {
        message: "Internal server error",
      },
      500,
    );
  }
};

export { errorHandler };
