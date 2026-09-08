/** biome-ignore-all lint/suspicious/noTsIgnore: Some files relied on by Aedes get generates before a dev/deploy starts, causing the files to be missing before a first run/deploy starts. This is intended behaviour and is meant to keep assets out of the GitHub repository*/
import { Hono } from "hono";
// @ts-ignore
import { prettyJSON } from "hono/pretty-json";
import assets from "../../static/launcher-assets.json" with { type: "json" };
import {
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
    return c.html(
      '<p style="font-size: 5rem;">Aedes (, by The) Elysiae (Project), API v3.0</p>',
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
        "ERROR: This endpoint doesn't have the required assets generated to complete your request. If you are the owner of this instance of Aedes, ensure that the static folder exists before re-deploying (it should if you haven't messed with the scripts in package.json)",
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
    return c.json({ body: "TODO!" }, StatusCodes.Ok);
  })
  .get("/getComponents", (c) => {
    return c.json({}, StatusCodes.Ok);
  })
  .get("/teapot", (c) => {
    return c.body("I'm a teapot!", StatusCodes.Teapot);
  });
export default app;
