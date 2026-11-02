import { writeFileSync } from "node:fs";
import type {
  AedesComponents,
  GithubApiReleases,
  GithubReleaseAsset,
} from "../types/GitHub.ts";
import {
  ASSETS_SCRAPE_ENDPOINT,
  CN_ICONS_SCRAPE_ENDPOINT,
  GAMES,
  ICONS_SCRAPE_ENDPOINT,
  SUPPORTED_LOCALES,
  type AedesAssets,
  type BackgroundEndpoint,
  type EndpointIconAssetData,
  type Games,
  type LocaleBackgroundAsset,
} from "../types/Hyp.ts";
import { fetchAndOptimize } from "./util.ts";

import pLimit from "p-limit";
import { lookpath } from "lookpath";

const localeLimit = pLimit(2);
const gameLimit = pLimit(2);
const iconLimit = pLimit(2);
const fetchLimit = pLimit(4);

const regenerateAssetData = async () => {
  const res = {} as AedesAssets;
  const idSeparator = /_.*/g;

  await Promise.all(
    SUPPORTED_LOCALES.map(
      async (locale) =>
        await localeLimit(async () => {
          const response = (await (
            await fetch(`${ASSETS_SCRAPE_ENDPOINT}${locale}`)
          ).json()) as BackgroundEndpoint;
          const data = response.data.game_info_list.slice(0, 6);

          await Promise.all(
            GAMES.map(
              async (_game, index) =>
                await gameLimit(async () => {
                  const gameData = data[index];
                  const gameCode = gameData?.game.biz.replaceAll(
                    idSeparator,
                    "",
                  ) as Games;
                  if (!gameData) {
                    console.error(`Game data for '${gameCode}' does not exist`);
                    return;
                  }

                  const destPath = `./static/${gameCode}/${locale}`;
                  const bgData: LocaleBackgroundAsset[] = await Promise.all(
                    gameData.backgrounds.map(
                      async (bg) =>
                        await fetchLimit(async () => {
                          return {
                            image: await fetchAndOptimize(
                              bg.background.url,
                              `${destPath}/image`,
                              "image",
                            ),
                            video:
                              bg.video.url !== ""
                                ? await fetchAndOptimize(
                                    bg.video.url,
                                    `${destPath}/video`,
                                    "video",
                                  )
                                : null,
                            overlay:
                              bg.theme.url !== ""
                                ? await fetchAndOptimize(
                                    bg.theme.url,
                                    `${destPath}/overlay`,
                                    "overlay",
                                  )
                                : null,
                          };
                        }),
                    ),
                  );

                  res[gameCode] ??= {} as AedesAssets[Games];
                  res[gameCode][locale] = bgData;
                }),
            ),
          );
        }),
    ),
  );

  // Icons are hosted on their own endpoints
  const iconResGlobal = (
    (await (await fetch(ICONS_SCRAPE_ENDPOINT)).json()) as EndpointIconAssetData
  ).data.games.slice(0, 6);
  const iconResCn = (
    (await (
      await fetch(CN_ICONS_SCRAPE_ENDPOINT)
    ).json()) as EndpointIconAssetData
  ).data.games.slice(0, 6);

  // Set Icon Data
  // iconResGlobal and iconResCn should be of identical length
  await Promise.all(
    GAMES.map(async (_game, index) =>
      iconLimit(async () => {
        const glbGameData = iconResGlobal[index];
        const cnGameData = iconResCn[index];

        const gameCode = glbGameData?.biz.replaceAll(idSeparator, "") as Games;

        if (!glbGameData) {
          console.error(
            `Global icon/shortcut data for ${gameCode} does not exist. Skipping all icon/shortcut data for this game code`,
          );
          return;
        }
        if (!cnGameData) {
          console.error(
            `Chinese icon/shortcut data for ${gameCode} does not exist. Skipping all icon/shortcut data for this game code`,
          );
          return;
        }

        const iconDest = `./static/${gameCode}/icon`;
        await Promise.all(
          (["icon", "shortcut"] as const).map(async (asset) => {
            res[gameCode][asset] = await fetchAndOptimize(
              glbGameData.display[asset].url,
              iconDest,
              "icon",
            );
            res[gameCode][`${asset}_cn`] = await fetchAndOptimize(
              cnGameData?.display[asset].url,
              iconDest,
              "icon",
            );
          }),
        );
      }),
    ),
  );

  writeFileSync("./static/launcher-assets.json", JSON.stringify(res, null, 2));
};

const regenerateComponentData = async () => {
  // Only phlogiston exists so there's no point in using fancy for loops to dynamically fetch everything
  const res = {} as AedesComponents;
  const apiResponse = (await (
    await fetch(
      `https://api.github.com/repos/elysiae-project/phlogiston/releases`,
    )
  ).json()) as GithubApiReleases[];
  res.phlogiston ??= [];

  for (let i = apiResponse.length - 1; i >= 0; i--) {
    const current = apiResponse[i] as GithubApiReleases;
    const amdAsset = current.assets[
      getPhlogistonArchIndex(current, "x86_64") as number
    ] as GithubReleaseAsset;
    const armAsset = current.assets[
      getPhlogistonArchIndex(current, "aarch64") as number
    ] as GithubReleaseAsset;

    res.phlogiston.push({
      tag: current.tag_name,
      download: {
        amd64: {
          url: amdAsset.browser_download_url,
          checksum: amdAsset.digest.slice(7),
        },
        aarch64: {
          url: armAsset.browser_download_url,
          checksum: armAsset.digest.slice(7),
        },
      },
      prerelease: current.prerelease,
    });
  }

  writeFileSync(
    "./static/launcher-components.json",
    JSON.stringify(res, null, 2),
  );
};

const getPhlogistonArchIndex = (
  data: GithubApiReleases,
  arch: "x86_64" | "aarch64",
): number | null => {
  for (let i = 0; i < data.assets.length; i++) {
    const current = data.assets[i] as GithubReleaseAsset;
    if (current.name.includes(arch) && !current.name.includes(".sha512sum")) {
      return i;
    }
  }
  return null;
};

(async () => {
  if (!(await lookpath("ffmpeg"))) {
    console.error(
      "FFMpeg was not found on your system path. Please install FFMpeg and ensure that it is on your system path to run the Aedes asset optimiser",
    );
    return;
  }

  if (!(await lookpath("magick"))) {
    console.error(
      "ImageMagick was not found on your system path. Please install ImageMagick and ensure that it is on your system path to run the Aedes asset optimiser.",
    );
  }

  console.log("Creating optimized asset/component data files");
  await regenerateAssetData();

  console.log("Assets/Asset Data Generated. Generating component data");
  await regenerateComponentData();
})();
