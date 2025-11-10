import "dotenv/config";

import routers from "@/routes";
import { IndexPage } from "@/templates";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";

const app = new Hono().basePath("/api/v1");

app.use(logger());
app.use("*", async (c, next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof HTTPException) return err.getResponse();
    console.error("[UNHANDLED]", err);
    throw new HTTPException(500, { message: "Internal server error" });
  }
});

app.get("/", (c) => {
  return c.html(<IndexPage />);
});

for (const router of routers) {
  app.route(router.path, router.route);
}

serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT) || 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
