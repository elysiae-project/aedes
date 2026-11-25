import { createHash } from "node:crypto";
import {
	copyFileSync,
	createReadStream,
	existsSync,
	mkdirSync,
	renameSync,
	unlinkSync,
} from "node:fs";
import type { AssetKind } from "../types/Hyp.ts";
import { execAsync } from "./cli.ts";
import { downloadFile, getExtensionFromURL, isURL } from "./web.ts";

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

	const finalExt = ext === "webm" ? "mp4" : ext === "ico" ? "ico" : "jxl";
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
		case "icon": {
			if (ext === "ico") {
				// Desktop shortcut files do not need to be optimized
				copyFileSync(downloadPath, optimizedPath);
			} else {
				await execAsync(
					`magick "${downloadPath}[0]" -strip -quality 85 "${optimizedPath}"`,
				);
			}
			break;
		}
		default: {
			// Every other scraped asset is some form of normal image
			await execAsync(
				`magick "${downloadPath}[0]" -strip -quality 85 "${optimizedPath}"`,
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
