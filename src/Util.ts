import { exec } from "node:child_process";
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream, rename, unlinkSync } from "node:fs";
import { get } from "node:https";
import { join } from "node:path";
import { promisify } from "node:util";
import { FFMPEG_FILTERS } from "./types.ts";

const execAsync = promisify(exec);

export const updateCache = async (destPath: string, downloadUrls: string[]): Promise<(string | null)[]> => {
	return Promise.all(
		downloadUrls.map(async (url) => {
			if (isURL(url)) {
				const ext = getExtensionFromURL(url);
				const outputExt = ext === "webm" ? "mp4" : ext;
				const id = randomUUID();
				const tempSource = join(destPath, `temp-download-${id}.${ext}`);

				await downloadFile(url, tempSource);
				const fileHash = await computeFileHash(tempSource);
				const finalPath = join(destPath, `${fileHash}.${outputExt}`);

				if (ext === "webm" || ext === "webp") {
					try {
						await ffmpegCommand(tempSource, ext, finalPath);
					} finally {
						try { unlinkSync(tempSource); } catch {}
					}
				} else {
					try {
						await renameFile(tempSource, finalPath);
					} finally {
						try { unlinkSync(tempSource); } catch {}
					}
				}

				return finalPath;
			} else {
				return null;
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
			if (response.statusCode !== 200) {
				file.close(() => reject(new Error(`HTTP ${response.statusCode} for ${url}`)));
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

const computeFileHash = async (path: string): Promise<string> => {
	return new Promise((resolve, reject) => {
		const hash = createHash("sha256");
		const stream = createReadStream(path);

		stream.on("data", (c) => hash.update(c));
		stream.on("end", () => resolve(hash.digest("hex")));
		stream.on("error", reject);
	});
};

const renameFile = async (src: string, dest: string): Promise<void> => {
	return new Promise((resolve, reject) => {
		rename(src, dest, (e) => {
			if (e) reject(e);
			else resolve();
		});
	});
};

const ffmpegCommand = async (
	input: string,
	ext: string,
	dest: string,
): Promise<void> => {
	const filter = FFMPEG_FILTERS[ext as "webp" | "webm"];
	return execAsync(`ffmpeg -y -i "${input}" ${filter} ${dest}`).then(
		() => {},
	);
};
