import { exec } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { get } from "node:https";
import { promisify } from "node:util";
import type { AssetKind } from "../types/Hyp.ts";
import { pipeline } from "node:stream/promises";

const execAsync = promisify(exec);

/**
 * Optimizes an image/video asset using FFMpeg. Deletes file when optimization is complete
 * @param path path to unoptimized asset
 * @returns path to newly-created optimized asset, relative to where it is on the web server. This asset will be named after its sha256sum
 */
export const fetchAndOptimize = async (
  url: string,
  destPath: string,
  kind: AssetKind,
  id: string = crypto.randomUUID(),
  maxRetries: number = 5,
): Promise<string> => {
  if (!isURL(url)) {
    throw new Error(`URL ${url} is invalid`);
  }
  const ext = getExtensionFromURL(url);
  if (!existsSync(destPath)) {
    mkdirSync(destPath, {
      recursive: true,
    });
  }

  const finalExt = ext === "webm" ? "mp4" : "jxl";
  const downloadPath = `${destPath}/temp-${kind}-${id}-download.${ext}`; // Name of file at download
  const optimizedPath = `${destPath}/temp-${kind}-${id}-optimized.${finalExt}`; // Name of file after optimized

  for (let i = 0; i < maxRetries; i++) {
    try {
      await downloadFile(url, downloadPath);
      // biome-ignore lint/suspicious/noExplicitAny: required for a type suppression
    } catch (e: any) {
      if (i === maxRetries - 1) {
        console.error(
          `Download Failure: All requests to ${url} failed: ${e.code || e.message}`,
        );
        return "";
      } else {
        const waitTime = 2 ** i * 1000;

        console.warn(
          `Request to ${url} failed: ${e.code || e.message}. Retrying in ${waitTime / 1000} seconds (${i + 1}/${maxRetries})`,
        );
        await new Promise((t) => setTimeout(t, waitTime));
      }
    }
  }

  // Optimize
  switch (kind) {
    case "video": {
      const ffmpegFilters = `-sws_flags lanczos -c:v libx264 -tune animation -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc iec61966-2-1 -preset fast -movflags +faststart -c:a copy`;

      await execAsync(
        `ffmpeg -y -i "${downloadPath}" ${ffmpegFilters} "${optimizedPath}"`,
      );
      break;
    }
    default: {
      // Every other scraped asset is some form of image
      const magickFilters = `-strip -quality 85`;

      await execAsync(
        `magick "${downloadPath}" ${magickFilters} "${optimizedPath}"`,
      );
      break;
    }
  }

  unlinkSync(downloadPath);
  const hash = await computeFileHash(optimizedPath);
  const finalPath = `${destPath}/${hash}.${finalExt}`;

  renameSync(optimizedPath, finalPath);
  return finalPath.replace(/^.*?static\//i, "/");
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
 * @param redirects how many times the url has been redirected
 * @param maxRedirects how many redirects the function should attempt doing before throwing an errors
 */
const downloadFile = async (
  url: string,
  dest: string,
  redirects: number = 0,
  maxRedirects: number = 5,
): Promise<void> => {
  if (!isURL(url)) {
    throw new Error("This url is invalid");
  }
  return new Promise((resolve, reject) => {
    const request = get(url, { timeout: 45000 }, async (res) => {
      if (!res?.statusCode) {
        return reject("downloadFile: 'response' is undefined");
      }
      // Redirect, if permitted
      if (
        res.statusCode >= 300 &&
        res.statusCode <= 400 &&
        res.headers.location
      ) {
        res.resume();
        if (redirects >= maxRedirects)
          return reject(new Error("downloadFile: Too many redirects"));
        return downloadFile(
          new URL(res.headers.location, url).href,
          dest,
          redirects + 1,
        );
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(
          new Error(
            `downloadFile: Status code ${res.statusCode} returned by ${url}`,
          ),
        );
      }
      try {
        await pipeline(res, createWriteStream(dest));
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    request.on("timeout", () =>
      request.destroy(
        new Error(`downloadFile: Socket timeout produced by ${url}`),
      ),
    );
    request.on("error", reject);
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
