import { exec } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, unlinkSync } from "node:fs";
import { get } from "node:https";
import { join } from "node:path";
import { promisify } from "node:util";
import { FFMPEG_FILTERS } from "./types.ts";

const execAsync = promisify(exec);

export const updateCache = async (destPath: string, downloadUrls: string[]) => {
	await Promise.all(
		downloadUrls.map(async (url) => {
			if (isURL(url)) {
				const ext = getExtensionFromURL(url);
				const filters = FFMPEG_FILTERS[ext as "webm" | "webp"];
				const tempFile = join(destPath, `temp.${ext}`);

				await downloadFile(url, tempFile);
				const finalPath = join(
					destPath,
					`${await computeFileHash(tempFile)}.${ext}`,
				);

				await ffmpegCommand(tempFile, filters, finalPath);
				unlinkSync(tempFile);
			} else {
				console.warn(`${url} is NOT a valid url; skipping file...`);
			}
		}),
	);
};

const isURL = (url: string): boolean => {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
};

const getExtensionFromURL = (url: string): string => {
	return url.split(/[#?]/)[0]?.split(".").pop()?.trim() as string;
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
			response.pipe(file);

			file.on("finish", () => {
				file.close((e) => {
					if(e) reject(e);
					else resolve();
				});
			})

			file.on("error", (e) => reject(e));
			response.on("error", (e) => reject(e));
		
		})
	})
};

const computeFileHash = async (path: string): Promise<string> => {
	return new Promise((resolve, reject) => {
		const hash = createHash("sha256");
		const stream = createReadStream(path);

		stream.on("data", (c) => hash.update(c));
		stream.on("end", () => resolve(hash.digest("hex")));
		stream.on("error", reject);
	});
};

const ffmpegCommand = async (
	input: string,
	filters: string,
	dest: string,
): Promise<void> => {
	return new Promise((resolve, reject) => {
		execAsync(`ffmpeg -y -i "${input}" ${filters} ${dest}`)
			.then(() => resolve)
			.catch(reject);
	});
};
