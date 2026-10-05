/** biome-ignore-all lint/suspicious/noTsIgnore: Some files relied on by Aedes get generates before a dev/deploy starts, causing the files to be missing before a first run/deploy starts. This is intended behaviour and is meant to keep assets out of the GitHub repository*/
import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";

// @ts-ignore
import assets from "../../static/launcher-assets.json" with { type: "json" };
// @ts-ignore
import components from "../../static/launcher-components.json" with { type: "json" };
import { StatusCodes, type Arch, SUPPORTED_ARCHES } from "../types/Aedes.ts";
import { ELYSIAE_COMPONENT_NAMES, type Components } from "../types/GitHub.ts";
import {
  GAMES,
  SUPPORTED_LOCALES,
  type Games,
  type Locales,
} from "../types/Hyp.ts";

console.log(
  "Aedes is licensed under the GNU Affero License (Version 3 or later). Please follow the license terms when redistributing or creating forks of Aedes. The Elysiae Project provides NO WARRANTY for any of its software; you are responsible for data loss and other negative consequences produced by Aedes",
);

const isSupportedLang = (lang: Locales) => SUPPORTED_LOCALES.includes(lang);
const isSupportedGame = (game: Games) => GAMES.includes(game);
const isSupportedArch = (arch: Arch) => SUPPORTED_ARCHES.includes(arch);
const isValidComponent = (component: Components) =>
  ELYSIAE_COMPONENT_NAMES.includes(component);

const flattenRelease = <T extends { download: Partial<Record<Arch, object>> }>(
  release: T,
  arch: Arch,
) => {
  const { download, ...rest } = release;

  // keep any non-arch fields that live inside `download`
  const sharedDownload = Object.fromEntries(
    Object.entries(download).filter(
      ([key]) => !(SUPPORTED_ARCHES as readonly string[]).includes(key),
    ),
  );

  return {
    ...rest, // tag, prerelease, and anything else on the release
    download: {
      ...sharedDownload,
      ...download[arch], // url + checksum of the selected arch, moved up
    },
  };
};

const app = new Hono().use(prettyJSON());

app
  .get("/", (c) => {
    return c.body(
      "δ Aedes, by the Elysiae Project\nHello, World!",
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
    if (!isSupportedLang(lang as Locales)) {
      return c.body(
        "Required parameter 'lang' has an invalid language code set as its value. Please consult the documentation for supported language codes",
        StatusCodes.BadRequest,
      );
    }
    if (!isSupportedGame(game as Games)) {
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
        `This endpoint does not have the required asset (launcherComponents.json) to handle your request. Please contact the maintainers of this Aedes instance for support`,
        StatusCodes.InternalError,
      );
    }

    if (!component) {
      return c.body(
        `Required parameter 'component' is missing`,
        StatusCodes.BadRequest,
      );
    }

    if (arch && !isSupportedArch(arch as Arch)) {
      return c.body(
        `Required parameter 'arch' has invalid data set as its value. Please consult the documentation for components provided by Aedes`,
        StatusCodes.BadRequest,
      );
    }

    if (!isValidComponent(component as Components)) {
      return c.body(
        `Required parameter 'componentName' has invalid data set as its value. Please consult the documentation for components provided by Aedes`,
        StatusCodes.BadRequest,
      );
    }

    const releases = arch
      ? components[component as Components].map((r) =>
          flattenRelease(r, arch as Arch),
        )
      : components[component as Components]; // Allow for multi-arch responses if desired

    return c.json(latestOnly ? releases[0] : releases, StatusCodes.Ok);
  })
  .get("/getComponents", (c) => {
    return c.json(ELYSIAE_COMPONENT_NAMES, StatusCodes.Ok);
  })
  .get("/teapot", (c) => {
    return c.body("I'm a teapot!", StatusCodes.Teapot);
  });
export default app;
