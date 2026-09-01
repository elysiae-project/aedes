/** biome-ignore-all lint/suspicious/noTsIgnore: Some files relied on by Aedes get generates before a dev/deploy starts, causing the files to be missing before a first run/deploy starts. This is intended behaviour and is meant to keep assets out of the GitHub repository*/
// @ts-ignore
import assets from "../static/launcher-assets.json" with { type: "json" };

import { Hono } from "hono";
import { serveStatic } from "hono/cloudflare-workers";

console.log(
  "Aedes is licensed under the GNU Afferro License (v3). Please follow the license terms when redistributing or creating forks of Aedes. The Elysiae Project provides NO WARRANTY for any of its software, any failure is your own responsibility",
);

const app = new Hono();

app
  .get("/", (c) => {
    return c.text("Aedes Elysiae, API v3.0");
  })
  .get("/getAssets", (c) => {
    return c.body("teapots are so awesome", 418);
  })
export default app;
