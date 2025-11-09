import { Hono } from "hono";
import type { BlankEnv, BlankSchema } from "hono/types";
import langchainRouter from "./langchain-router";

const routers: Array<{
  path: string;
  route: Hono<BlankEnv, BlankSchema, "/">;
}> = [
  {
    path: "/",
    route: langchainRouter,
  },
];

export default routers;
