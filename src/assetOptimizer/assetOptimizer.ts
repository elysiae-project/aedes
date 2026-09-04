import { writeFileSync } from "node:fs";
import {
  ASSETS_SCRAPE_ENDPOINT,
  type AedesAssets,
  type BackgroundEndpoint,
  CN_ICONS_SCRAPE_ENDPOINT,
  type EndpointIconAssetData,
  type Games,
  ICONS_SCRAPE_ENDPOINT,
  type LocaleBackgroundAsset,
  SUPPORTED_LOCALES,
} from "../types.ts";
import { fetchAndOptimize } from "./util.ts";

export const regenerateAssetData = async () => {
  const res = {} as AedesAssets;
  await Promise.all(
    SUPPORTED_LOCALES.map(async (locale) => {
      const response = (await (
        await fetch(`${ASSETS_SCRAPE_ENDPOINT}${locale}`)
      ).json()) as BackgroundEndpoint;
      const data = response.data.game_info_list;

      // After index 3, the same bh3 content is repeated a few times. Those are not needed
      for (let i = 0; i < 4; i++) {
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

  for (let i = 0; i < 4; i++) {
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

export const regenerateComponentData = async () => {};

(async () => {
  await regenerateAssetData();
  await regenerateComponentData();
})();
