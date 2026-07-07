import { mkdirSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	BRANDING_URL,
	type BrandingData,
	type ComponentTracker,
	type GameAsset,
	GRAPHICS_URL,
	type GraphicsData,
	type Manifest,
} from "./types.ts";
import {
	findGithubArchiveIndex,
	githubApiFetch,
	updateCache,
	updateComponentJson,
} from "./Util.ts";

/**
 * Downloads and optimizes launcher asset data. Files are renamed to their hash before any optimizations are applied
 */
const generateAssets = async (): Promise<void> => {
	["overlay", "bg", "icon"].forEach((item) => {
		const path = join("assets", item);
		mkdirSync(path, { recursive: true });
		["nap", "hkrpg", "hk4e", "bh3"].forEach((g) => {
			mkdirSync(join(path, g), { recursive: true });
		});
	});

	const graphicsData = (await (
		await fetch(GRAPHICS_URL)
	).json()) as GraphicsData;
	const brandingData = (await (
		await fetch(BRANDING_URL)
	).json()) as BrandingData;

	const manifest: Manifest = {};

	await Promise.all(
		["nap", "hkrpg", "hk4e", "bh3"].map(async (game, index) => {
			const gameGraphics = graphicsData.data.game_info_list[index];
			const gameBranding = brandingData.data.games[index];

			if (!gameGraphics) {
				console.error("Game graphics is invalid");
				throw new Error();
			}

			if (!gameBranding) {
				console.error("Game branding is invalid");
				throw new Error();
			}

			const backgrounds: GameAsset[] = [];

			console.log(`Downloading/Optimising backgrounds for ${game}`);
			let overlayPath = "";
			await Promise.all(
				gameGraphics.backgrounds.map(async (background) => {
					const imageUrl = background.background.url;
					const videoUrl = background.video.url;
					const overlayUrl = background.theme.url;

					const urls = [imageUrl];
					if (videoUrl) urls.push(videoUrl);
					const [imagePath, videoPath] = await updateCache(
						join("assets", "bg", game),
						urls,
					);

					const currentOverlayPath = (
						await updateCache(join("assets", "overlay", game), [overlayUrl])
					)[0];
					if (currentOverlayPath) overlayPath = currentOverlayPath;

					backgrounds.push({
						image: imagePath as string | null,
						video: videoPath ?? null,
					});
				}),
			);

			console.log(`Downloading icon for ${game}`);
			const iconUrl = gameBranding.display.icon.url;
			const [iconPath] = await updateCache(join("assets", "icon", game), [
				iconUrl,
			]);

			manifest[game] = {
				backgrounds,
				icon: iconPath as string | null,
				overlay: overlayPath as string,
			};
		}),
	);

	await writeFile(
		join("assets", "assetData.json"),
		JSON.stringify(manifest, null, 2),
	);
};

/**
 * Updates information on the most up-to-date versions of components that Elysiae relies on for games to run
 */
const generateComponentData = async () => {
	const trackedAssets: ComponentTracker = [
		{
			saveTo: "proton.json",
			repo: "GloriousEggroll/proton-ge-custom",
		},
	];

	await Promise.all(
		trackedAssets.map(async (asset) => {
			const savePath = join("components", asset.saveTo);
			const response = await githubApiFetch(asset.repo);

			const archiveIndex = findGithubArchiveIndex(response);
			if (archiveIndex === -1) {
				console.error(
					`ERROR: Repo ${asset.repo} does NOT have any valid download links`,
				);
				return;
			}

			updateComponentJson(
				response.tag_name,
				response.assets[archiveIndex]?.browser_download_url as string,
				response.assets[archiveIndex]?.digest.split("sha256:")[1] as string,
				savePath,
			);
		}),
	);

	writeJadteieFile();
};

// Jadeite is deprecated so the contents of this file will be the same. Once jadeite is no longer needed (only one game still needs it), this function will be removed
const writeJadteieFile = () => {
	const jaditeData = `
	[
  		{
    		"tag": "v5.0.1",
    		"download_url": "https://codeberg.org/mkrsym1/jadeite/releases/download/v5.0.1/v5.0.1.zip",
    		"hash": "95986915debe66d6308ae81ead28c362eff79624f806da22a88b9073259d703a"
  		}
	]`;

	writeFileSync(join("components", "jadeite.json"), jaditeData);
};

(async () => {
	await Promise.all([generateAssets(), generateComponentData()]);
})();
