import "dotenv/config";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import routers from "@/routes";

const app = new Hono().basePath("/api");

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
