/** biome-ignore-all lint/suspicious/noTsIgnore: Some files relied on by Aedes get generates before a dev/deploy starts, causing the files to be missing before a first run/deploy starts. This is intended behaviour and is meant to keep assets out of the GitHub repository*/
import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";

// @ts-ignore
import assets from "../../static/launcher-assets.json" with { type: "json" };
// @ts-ignore
import components from "../../static/launcher-components.json" with { type: "json" };

import {
  type Components,
  ELYSIAE_COMPONENT_NAMES,
  type Games,
  GAMES,
  type Locales,
  SUPPORTED_LOCALES,
} from "../types.ts";

enum StatusCodes {
  Ok = 200,
  BadRequest = 400,
  NotFount = 404,
  Teapot = 418,
  InternalError = 500,
}

console.log(
  "Aedes is licensed under the GNU Affero License (Version 3 or later). Please follow the license terms when redistributing or creating forks of Aedes. The Elysiae Project provides NO WARRANTY for any of its software; you are responsible for data loss and other negative consequences produced by Aedes",
);

const app = new Hono().use(prettyJSON());

app
  .get("/", (c) => {
    return c.body(
      "δ Aedes (, by The) Elysiae (Project), API v3.0 δ\nHello, World!",
      StatusCodes.Ok,
    );
  })
  .get("/getGames", (c) => {
    return c.json(GAMES, StatusCodes.Ok);
  })
  .get("/getAssets", (c) => {
    // Change POSIX to IETF BCP 47 locale code
    const lang = c.req.query("lang")?.replaceAll("_", "-").toLocaleLowerCase();
    const game = c.req.query("game")?.toLocaleLowerCase();
    if (!assets || Object.keys(assets).length === 0) {
      return c.body(
        "This endpoint does not have the required assets (launcherAssets.json) to handle your requests. Please contact the maintainers of this Aedes instance for support",
        StatusCodes.InternalError,
      );
    }
    if (!lang) {
      return c.body(
        "Required parameter 'lang' is missing",
        StatusCodes.BadRequest,
      );
    }
    if (!game) {
      return c.body(
        "Required parameter 'game' is missing",
        StatusCodes.BadRequest,
      );
    }
    if (!SUPPORTED_LOCALES.includes(lang as Locales)) {
      return c.body(
        "Required parameter 'lang' has an invalid language code set as its value. Please consult the documentation for supported language codes",
        StatusCodes.BadRequest,
      );
    }
    if (!GAMES.includes(game as Games)) {
      return c.body(
        "Required parameter 'games' has an invalid game set as its value. Please consult the documentation for all supported game codes",
        StatusCodes.BadRequest,
      );
    }

    try {
      const gameAssets = assets[game as Games];
      const res = {
        backgrounds: gameAssets[lang as Locales] ?? {},
        icon: gameAssets.icon ?? "",
        icon_cn: gameAssets.icon_cn ?? "",
        shortcut: gameAssets.shortcut ?? "",
        shortcut_cn: gameAssets.icon_cn ?? "",
      };

      return c.json(res, StatusCodes.Ok);
    } catch (e) {
      return c.body(
        `Aedes encountered an error while processing your request: ${e}\nPlease open an issue on https://github.com/elysiae/project/aedes to have a member of The Elysiae Project review your problem`,
        StatusCodes.InternalError,
      );
    }
  })
  .get("/getComponentInfo", (c) => {
    const component = c.req.query("component");
    const arch = c.req.query("arch");
    const latestOnly: boolean = typeof c.req.query("latest") !== "undefined";
    if (!components || Object.keys(components).length === 0) {
      return c.body(
        `This endpoint does not have the required asset (launcherComponents.json) to handle your requests. Please contact the maintainers of this Aedes instance for support`,
        StatusCodes.InternalError,
      );
    }

    if (!component) {
      return c.body(
        `Required parameter 'component' is missing`,
        StatusCodes.BadRequest,
      );
    }
    if (!arch) {
      return c.body(
        `Required parameter 'arch' is missing`,
        StatusCodes.BadRequest,
      );
    }

    if (!["amd64", "aarch64"].includes(arch)) {
      return c.body(
        `Required parameter 'arc' has invalid data set as its value. Please consult the documentation for components provided by Aedes`,
        StatusCodes.BadRequest,
      );
    }

    if (!ELYSIAE_COMPONENT_NAMES.includes(component as Components)) {
      return c.body(
        `Required parameter 'componentName' has invalid data set as its value. Please consult the documentation for components provided by Aedes`,
        StatusCodes.BadRequest,
      );
    }
    return c.json(
      latestOnly
        ? components[component as Components][0]
        : components[component as Components],
      StatusCodes.Ok,
    );
  })
  .get("/getComponents", (c) => {
    return c.json(ELYSIAE_COMPONENT_NAMES, StatusCodes.Ok);
  })
  .get("/teapot", (c) => {
    return c.body("I'm a teapot!", StatusCodes.Teapot);
  });
export default app;
