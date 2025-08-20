import { Hono } from "hono";
import type { BlankEnv, BlankSchema } from "hono/types";
import app from "./app";

const routers: Array<{
  path: string;
  route: Hono<BlankEnv, BlankSchema, "/">;
}> = [
  {
    path: "/",
    route: app,
  },
];

export default routers;
