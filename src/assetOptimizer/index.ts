import { lookpath } from "lookpath";
import { regenerateAssetData } from "./assets.ts";
import { regenerateComponentData } from "./components.ts";

(async () => {
	if (!(await lookpath("ffmpeg"))) {
		console.error(
			"FFMpeg was not found on your system path. Please install FFMpeg and ensure that it is on your system path to run the Aedes asset optimiser",
		);
		return;
	}

	if (!(await lookpath("magick"))) {
		console.error(
			"ImageMagick was not found on your system path. Please install ImageMagick and ensure that it is on your system path to run the Aedes asset optimiser.",
		);
	}
	if (!(await lookpath("cjxl"))) {
		console.error(
			"libjxl was not found on your system path. Please install libjxl and ensure that it is on your system path to run the Aedes asset optimiser.",
		);
	}
	await regenerateAssetData();

	console.log("Assets/Asset Data Generated. Generating component data");
	await regenerateComponentData();
})();
