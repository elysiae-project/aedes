import { writeFileSync } from "node:fs";
import {
  ASSETS_SCRAPE_ENDPOINT,
  type AedesAssets,
  type AedesComponents,
  type BackgroundEndpoint,
  CN_ICONS_SCRAPE_ENDPOINT,
  type EndpointIconAssetData,
  GAMES,
  type Games,
  type GithubApiReleases,
  type GithubReleaseAsset,
  ICONS_SCRAPE_ENDPOINT,
  type LocaleBackgroundAsset,
  SUPPORTED_LOCALES,
} from "../types.ts";
import { fetchAndOptimize } from "./util.ts";

const regenerateAssetData = async () => {
  const res = {} as AedesAssets;
  await Promise.all(
    SUPPORTED_LOCALES.map(async (locale) => {
      const response = (await (
        await fetch(`${ASSETS_SCRAPE_ENDPOINT}${locale}`)
      ).json()) as BackgroundEndpoint;
      const data = response.data.game_info_list;

      // After index 5, the same bh3 content is repeated a few times. Those are not needed
      for (let i = 0; i < GAMES.length; i++) {
        const gameData = data[i];
        if (!gameData) {
          console.warn("Game data does not exist");
          continue;
        }

        const game = gameData.game.biz.split("_")[0] as Games;
        const destPath = `./static/${game}/${locale}`;

        const backgroundData: LocaleBackgroundAsset[] = await Promise.all(
          gameData.backgrounds.map(
            async (background): Promise<LocaleBackgroundAsset> => {
              const currentBgData: LocaleBackgroundAsset = {
                image: await fetchAndOptimize(
                  background.background.url,
                  `${destPath}/image`,
                  "image",
                  crypto.randomUUID(),
                ),
                video:
                  background.video.url !== ""
                    ? await fetchAndOptimize(
                        background.video.url,
                        `${destPath}/video`,
                        "video",
                        crypto.randomUUID(),
                      )
                    : null,
                overlay:
                  background.theme.url !== ""
                    ? await fetchAndOptimize(
                        background.theme.url,
                        `${destPath}/overlay`,
                        "overlay",
                        crypto.randomUUID(),
                      )
                    : null,
              };
              return currentBgData;
            },
          ),
        );
        res[game] ??= {} as AedesAssets[Games];
        res[game][locale] = backgroundData;
      }
    }),
  );

  const iconResponseGlobal = (await (
    await fetch(ICONS_SCRAPE_ENDPOINT)
  ).json()) as EndpointIconAssetData;
  const iconResponseChina = (await (
    await fetch(CN_ICONS_SCRAPE_ENDPOINT)
  ).json()) as EndpointIconAssetData;
  // Set Icon Data

  for (let i = 0; i < GAMES.length; i++) {
    const gameDataGlb = iconResponseGlobal.data.games[i];
    const gameDataCn = iconResponseChina.data.games[i];

    if (!gameDataGlb || !gameDataCn) {
      continue;
    }
    const game = gameDataGlb.biz.split("_")[0] as Games;
    const iconDest = `./static/${game}/icon`;

    res[game].icon = await fetchAndOptimize(
      gameDataGlb.display.icon.url,
      iconDest,
      "icon",
      crypto.randomUUID(),
    );
    res[game].icon_cn = await fetchAndOptimize(
      gameDataCn.display.icon.url,
      iconDest,
      "icon",
      crypto.randomUUID(),
    );
    res[game].shortcut = await fetchAndOptimize(
      gameDataGlb.display.shortcut.url,
      iconDest,
      "icon",
      crypto.randomUUID(),
    );
    res[game].shortcut_cn = await fetchAndOptimize(
      gameDataCn.display.shortcut.url,
      iconDest,
      "icon",
      crypto.randomUUID(),
    );
  }

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
    if (current.name.includes(arch)) {
      return i;
    }
  }
  return null;
};

(async () => {
  console.log("Creating optimized asset/component data files");
  await regenerateAssetData();

  console.log("Assets/Asset Data Generated. Generating component data");
  await regenerateComponentData();
})();
