import { createWriteStream } from "node:fs";
import { get } from "node:https";
import { pipeline } from "node:stream/promises";

/**
 * Gets the file extension from a valid download URL
 * @param url the web URL
 * @returns File extension of the valid download URL. otherwise returns an empty string or invalid data
 */
export const getExtensionFromURL = (url: string): string => {
  if (isURL(url)) {
    return url.split(/[#?]/)[0]?.split(".").pop()?.trim() as string;
  } else return "";
};

/**
 * Checks if a string is a valid URL or not
 * @param url string to test if it is a URL
 * @returns weather or not `url` is a string or not
 */
export const isURL = (url: string): boolean => {
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
export const downloadFile = async (
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
