import { exec } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
	createReadStream,
	createWriteStream,
	readFileSync,
	rename,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { get } from "node:https";
import { join } from "node:path";
import { promisify } from "node:util";
import {
	FFMPEG_FILTERS,
	type ComponentData,
	type GithubApiResponse,
} from "./types.ts";

const execAsync = promisify(exec);

/**
 * Downloads all image/video assets from a set of download URLs and dditionally performs enhancements with ffmpeg on webm/webp images
 * @param destPath Directory where all of the assets should be saved
 * @param downloadUrls The files to be downloaded
 * @returns Array of paths that are now present in `destPath`
 */
export const updateCache = async (
	destPath: string,
	downloadUrls: string[],
): Promise<(string | null)[]> => {
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
						try {
							unlinkSync(tempSource);
						} catch {}
					}
				} else {
					try {
						await renameFile(tempSource, finalPath);
					} finally {
						try {
							unlinkSync(tempSource);
						} catch {}
					}
				}

				return finalPath;
			} else {
				return null;
			}
		}),
	);
};

/**
 * Fetches release data from a specific GitHub repository
 * @param repo Github repo ID (user/repo)
 * @returns Full information on the latest release in a GitHub repository
 */
export const githubApiFetch = async (
	repo: string,
): Promise<GithubApiResponse> => {
	return new Promise((resolve, reject) => {
		fetch(`https://api.github.com/repos/${repo}/releases/latest`)
			.then((data) => {
				data
					.json()
					.then((json) => {
						resolve(json as GithubApiResponse);
					})
					.catch(reject);
			})
			.catch(reject);
	});
};

/**
 * Finds the archive asset index, skipping aarch64/arm64 builds
 * @param apiResponse GitHub API release data response
 * @returns index to the preferred archive file
 */
export const findGithubArchiveIndex = (
	apiResponse: GithubApiResponse,
): number => {
	for (let i = 0; i < apiResponse.assets.length; i++) {
		const contentType = apiResponse.assets[i]?.content_type ?? null;
		const name = apiResponse.assets[i]?.name ?? "";
		if (contentType) {
			if (["gzip", "zstd", "x-xz"].includes(contentType.split("/")[1] ?? "")) {
				if (name.includes("aarch") || name.includes("arm")) {
					continue;
				}
				return i;
			}
		}
	}
	return -1;
};

/**
 * Adds new version data to a component json file if the data isn't already present. Older data is shifted back to make way for newer data
 * @param tag Release tag of component
 * @param downloadURL Download url of component
 * @param hash Hash of the downloaded artifact
 * @param filePath Where to save the component file
 */
export const updateComponentJson = (
	tag: string,
	downloadURL: string,
	hash: string,
	filePath: string,
): void => {
	const latestContent: ComponentData = {
		tag: tag,
		download_url: downloadURL,
		hash: hash,
	};
	const existingData: ComponentData[] = JSON.parse(readFileSync(filePath).toString());

	if (JSON.stringify(existingData[0]) !== JSON.stringify(latestContent)) {
		existingData.unshift(latestContent);
		writeFileSync(filePath, JSON.stringify(existingData, null, 2));
	} else console.log(`${filePath} does not need to be updated. Skipping`);
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
 * Calculates the sha256 hash of a file present on the filesystem
 * @param path path to the file
 * @returns hash of `path`
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

/**
 *
 * @param src source path
 * @param dest desired final path
 * @returns
 */
const renameFile = async (src: string, dest: string): Promise<void> => {
	return new Promise((resolve, reject) => {
		rename(src, dest, (e) => {
			if (e) reject(e);
			else resolve();
		});
	});
};

/**
 * Executes a command with ffmpeg. Intended to be used with webm or webp files
 * @param input source path
 * @param ext file extension of file
 * @param dest destination path
 */
const ffmpegCommand = async (
	input: string,
	ext: string,
	dest: string,
): Promise<void> => {
	const filter = FFMPEG_FILTERS[ext as "webp" | "webm"];
	return execAsync(`ffmpeg -y -i "${input}" ${filter} ${dest}`).then(() => {});
};
