import { writeFileSync } from "node:fs";
import pLimit from "p-limit";
import {
	ASSETS_SCRAPE_ENDPOINT,
	CN_ICONS_SCRAPE_ENDPOINT,
	GAMES,
	ICONS_SCRAPE_ENDPOINT,
	SUPPORTED_LOCALES,
	type AedesAssets,
	type BackgroundEndpoint,
	type EndpointIconAssetData,
	type Games,
	type LocaleBackgroundAsset,
} from "../types/Hyp.ts";
import { optimiseProgress } from "./cli.ts";
import { fetchAndOptimize } from "./optimiser.ts";

const localeLimit = pLimit(2);
const gameLimit = pLimit(2);
const iconLimit = pLimit(2);
const fetchLimit = pLimit(4);

let completedAssets = 0;

const optimizeAsset = async (
	url: string,
	destPath: string,
	kind: Parameters<typeof fetchAndOptimize>[2],
): Promise<string> => {
	if (url === "") {
		return "";
	}

	try {
		return await fetchAndOptimize(url, destPath, kind);
	} finally {
		completedAssets++;
		optimiseProgress.increment();
	}
};

export const regenerateAssetData = async () => {
	const res = {} as AedesAssets;
	const assetTotal = await getAssetLength();
	completedAssets = 0;
	optimiseProgress.start(assetTotal, completedAssets);
	try {
		await Promise.all(
			SUPPORTED_LOCALES.map(
				async (locale) =>
					await localeLimit(async () => {
						const response = (await (
							await fetch(`${ASSETS_SCRAPE_ENDPOINT}${locale}`)
						).json()) as BackgroundEndpoint;
						const data = response.data.game_info_list.slice(0, 6);

						await Promise.all(
							GAMES.map(
								async (_game, index) =>
									await gameLimit(async () => {
										const gameData = data[index];
										const gameCode = gameData?.game.biz.replaceAll(
											/_.*/g,
											"",
										) as Games;
										if (!gameData) {
											console.error(
												`Game data for '${gameCode}' does not exist`,
											);
											return;
										}

										const destPath = `./static/${gameCode}/${locale}`;
										const bgData: LocaleBackgroundAsset[] = await Promise.all(
											gameData.backgrounds.map(
												async (bg) =>
													await fetchLimit(async () => {
														return {
															image: await optimizeAsset(
																bg.background.url,
																`${destPath}/image`,
																"image",
															),
															video:
																bg.video.url !== ""
																	? await optimizeAsset(
																			bg.video.url,
																			`${destPath}/video`,
																			"video",
																		)
																	: null,
															overlay:
																bg.theme.url !== ""
																	? await optimizeAsset(
																			bg.theme.url,
																			`${destPath}/overlay`,
																			"overlay",
																		)
																	: null,
														};
													}),
											),
										);
										res[gameCode] ??= {} as AedesAssets[Games];
										res[gameCode][locale] = bgData;
									}),
							),
						);
					}),
			),
		);

		// Icons are hosted on their own endpoints
		const iconResGlobal = (
			(await (
				await fetch(ICONS_SCRAPE_ENDPOINT)
			).json()) as EndpointIconAssetData
		).data.games.slice(0, 6);
		const iconResCn = (
			(await (
				await fetch(CN_ICONS_SCRAPE_ENDPOINT)
			).json()) as EndpointIconAssetData
		).data.games.slice(0, 6);

		// Set Icon Data
		// iconResGlobal and iconResCn should be of identical length
		await Promise.all(
			GAMES.map(async (_game, index) =>
				iconLimit(async () => {
					const glbGameData = iconResGlobal[index];
					const cnGameData = iconResCn[index];

					const gameCode = glbGameData?.biz.replaceAll(/_.*/g, "") as Games;

					if (!glbGameData) {
						console.error(
							`Global icon/shortcut data for ${gameCode} does not exist. Skipping all icon/shortcut data for this game code`,
						);
						return;
					}
					if (!cnGameData) {
						console.error(
							`Chinese icon/shortcut data for ${gameCode} does not exist. Skipping all icon/shortcut data for this game code`,
						);
						return;
					}

					const iconDest = `./static/${gameCode}/icon`;
					await Promise.all(
						(["icon", "shortcut"] as const).map(async (asset) => {
							res[gameCode][asset] = await optimizeAsset(
								glbGameData.display[asset].url,
								iconDest,
								asset,
							);
							res[gameCode][`${asset}_cn`] = await optimizeAsset(
								cnGameData.display[asset].url,
								iconDest,
								asset,
							);
						}),
					);
				}),
			),
		);

		writeFileSync(
			"./static/launcher-assets.json",
			JSON.stringify(res, null, 2),
		);
	} finally {
		optimiseProgress.stop();
	}
};

export const getAssetLength = async (): Promise<number> => {
	let res = 0;
	const countUrl = (url: string): void => {
		if (url !== "") {
			res++;
		}
	};

	await Promise.all(
		SUPPORTED_LOCALES.map(async (locale) => {
			const response = (await (
				await fetch(`${ASSETS_SCRAPE_ENDPOINT}${locale}`)
			).json()) as BackgroundEndpoint;
			const data = response.data.game_info_list.slice(0, 6);

			for (const [index] of GAMES.entries()) {
				const gameData = data[index];
				if (!gameData) {
					continue;
				}

				for (const background of gameData.backgrounds) {
					countUrl(background.background.url);
					countUrl(background.video.url);
					countUrl(background.theme.url);
				}
			}
		}),
	);

	const iconResGlobal = (
		(await (await fetch(ICONS_SCRAPE_ENDPOINT)).json()) as EndpointIconAssetData
	).data.games.slice(0, 6);
	const iconResCn = (
		(await (
			await fetch(CN_ICONS_SCRAPE_ENDPOINT)
		).json()) as EndpointIconAssetData
	).data.games.slice(0, 6);

	for (const [index] of GAMES.entries()) {
		const globalGame = iconResGlobal[index];
		const chineseGame = iconResCn[index];
		if (!globalGame || !chineseGame) {
			continue;
		}

		for (const asset of ["icon", "shortcut"] as const) {
			countUrl(globalGame.display[asset].url);
			countUrl(chineseGame.display[asset].url);
		}
	}

	return res;
};
