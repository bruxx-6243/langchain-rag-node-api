import "dotenv/config";

import routers from "@/routes";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";

const app = new Hono().basePath("/api/v1");

app.use(logger());

app.get("/", async (ctx) => {
  return ctx.json({ message: "Hello from LangChain RAG API!" }, 200);
});

routers.forEach((router) => {
  app.route(router.path, router.route);
});

serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT) || 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
