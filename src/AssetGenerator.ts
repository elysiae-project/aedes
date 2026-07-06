import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { BrandingData, GraphicsData } from "./types.ts";
import { updateCache } from "./Util.ts";

const GAMES = ["nap", "hkrpg", "hk4e", "bh3"];

const GRAPHICS_URL =
	"\x68\x74\x74\x70\x73\x3a\x2f\x2f\x73\x67\x2d\x68\x79\x70\x2d\x61\x70\x69\x2e\x68\x6f\x79\x6f\x76\x65\x72\x73\x65\x2e\x63\x6f\x6d\x2f\x68\x79\x70\x2f\x68\x79\x70\x2d\x63\x6f\x6e\x6e\x65\x63\x74\x2f\x61\x70\x69\x2f\x67\x65\x74\x41\x6c\x6c\x47\x61\x6d\x65\x42\x61\x73\x69\x63\x49\x6e\x66\x6f\x3f\x6c\x61\x75\x6e\x63\x68\x65\x72\x5f\x69\x64\x3d\x56\x59\x54\x70\x58\x6c\x62\x57\x6f\x38\x26\x6c\x61\x6e\x67\x75\x61\x67\x65\x3d\x65\x6e";
const BRANDING_URL =
	"\x68\x74\x74\x70\x73\x3a\x2f\x2f\x73\x67\x2d\x68\x79\x70\x2d\x61\x70\x69\x2e\x68\x6f\x79\x6f\x76\x65\x72\x73\x65\x2e\x63\x6f\x6d\x2f\x68\x79\x70\x2f\x68\x79\x70\x2d\x63\x6f\x6e\x6e\x65\x63\x74\x2f\x61\x70\x69\x2f\x67\x65\x74\x47\x61\x6d\x65\x73\x3f\x6c\x61\x75\x6e\x63\x68\x65\x72\x5f\x69\x64\x3d\x56\x59\x54\x70\x58\x6c\x62\x57\x6f\x38";

const generateAssets = async () => {
	["overlay", "bg", "icon"].forEach((item) => {
		const path = join("assets", item);
		mkdirSync(path, {
			recursive: true,
		});
		GAMES.forEach((g) => {
			const gamePath = join(path, g);
			mkdirSync(gamePath, {
				recursive: true,
			});
		});
	});

	const graphicsData = (await (
		await fetch(GRAPHICS_URL)
	).json()) as GraphicsData;

	const brandingData = (await (
		await fetch(BRANDING_URL)
	).json()) as BrandingData;

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

			console.log(`Downloading all existing image, video, and overlay data for ${game}`)
			await Promise.all(
				gameGraphics?.backgrounds.map(async (background, index) => {
					const imageUrl = background.background.url;
					const videoUrl = background.video.url;
					const overlayUrl = background.theme.url;

					await updateCache(join("assets", "bg", game, index.toString()), [imageUrl, videoUrl]);
					await updateCache(join("assets", "overlay", game), [overlayUrl]);
				}),
			);

			console.log(`Downloading icon for ${game}`);
			const iconUrl = gameBranding.display.icon.url;
			await updateCache(join("assets", "icon", game), [iconUrl]);
		}),
	);
};

const generateComponentData = async() => {

}

(async () => {
	await generateAssets();
	await generateComponentData();
})();
