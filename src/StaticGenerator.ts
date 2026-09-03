import { exec } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { get } from "node:https";
import { promisify } from "node:util";
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
} from "./types.ts";

type AssetKind = "image" | "icon" | "video" | "overlay";

const execAsync = promisify(exec);

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

/**
 * Optimizes an image/video asset using FFMpeg. Deletes file when optimization is complete
 * @param path path to unoptimized asset
 * @returns path to newly-created optimized asset, relative to where it is on the web server. This asset will be named after its sha256sum
 */
const fetchAndOptimize = async (
  url: string,
  destPath: string,
  kind: AssetKind,
  id: string,
): Promise<string> => {
  if (isURL(url)) {
    const ext = getExtensionFromURL(url);
    if (!existsSync(destPath)) {
      mkdirSync(destPath, {
        recursive: true,
      });
    }

    const finalExt = ext === "webm" ? "mp4" : "png";
    const downloadPath = `${destPath}/temp-${kind}-${id}-download.${ext}`; // Name of file at download
    const optimizedPath = `${destPath}/temp-${kind}-${id}-optimized.${finalExt}`; // Name of file after optimized

    await downloadFile(url, downloadPath);

    // Optimize
    const filters =
      kind === "video"
        ? `-c:v libx264 -tune animation -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc iec61966-2-1 -preset fast -movflags +faststart -c:a copy`
        : "-lossless 1 -compression_level 6";

    await execAsync(
      `ffmpeg -y -i "${downloadPath}" ${filters} "${optimizedPath}"`,
    );

    unlinkSync(downloadPath);
    const hash = await computeFileHash(optimizedPath);
    const finalPath = `${destPath}/${hash}.${finalExt}`;

    renameSync(optimizedPath, finalPath);

    // Temporary fix that will probably remain permanent. Anything in the static/ folder will be placed in /  (rather than /static/) once wrangler starts
    return finalPath.slice(8);
  } else throw new Error(`url ${url} is invalid`);
};

/**
 * Gets the file extension from a valid download URL
 * @param url the web URL
 * @returns File extension of the valid download URL. otherwise returns an empty string or invalid data
 */
const getExtensionFromURL = (url: string): string => {
  if (isURL(url)) {
    return url.split(/[#?]/)[0]?.split(".").pop()?.trim() as string;
  } else return "";
};

/**
 * Checks if a string is a valid URL or not
 * @param url string to test if it is a URL
 * @returns weather or not `url` is a string or not
 */
const isURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Downloads a file to a destination folder, then renames it to the sha256sum of the file
 * @param url file download url
 * @param dest destination path, no file name
 */
const downloadFile = async (url: string, dest: string): Promise<void> => {
  if (!isURL(url)) {
    throw new Error("This url is invalid");
  }

  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close(() =>
          reject(new Error(`HTTP ${response.statusCode} for ${url}`)),
        );
        return;
      }

      response.pipe(file);

      file.on("finish", () => {
        file.close((e) => {
          if (e) reject(e);
          else resolve();
        });
      });

      file.on("error", (e) => reject(e));
      response.on("error", (e) => reject(e));
    });
  });
};

/**
 * Calculates the sha256sum of a file
 * @param path path to file
 * @returns sha256sum of the file
 */
const computeFileHash = async (path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);

    stream.on("data", (c) => hash.update(c));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
};

(async () => {
  await regenerateAssetData();
  await regenerateComponentData();
})();
