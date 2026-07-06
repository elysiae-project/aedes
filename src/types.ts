// Background, Overlay
/** biome-ignore-all lint/suspicious/noExplicitAny: Some data types at the api endpoint can be changed in the future */

// Launcher backgrounds/overlays
export type GraphicsData = {
	retcode: number;
	message: string;
	data: {
		game_info_list: {
			game: {
				id: string;
				biz: string;
			};
			backgrounds: {
				id: string;
				background: {
					url: string;
					link: string;
					login_state_in_link: boolean;
				};
				icon: {
					url: string;
					hover_url: string;
					link: string;
					login_state_in_link: boolean;
					md5: string;
					size: number;
				};
				video: {
					url: string;
					size: number;
				};
				theme: {
					url: string;
					link: string;
					login_state_in_link: boolean;
				};
				type: string;
			}[];
		}[];
	};
};

// Game Icons, other assets
export type BrandingData = {
	retcode: number;
	message: string;
	data: {
		games: {
			id: string;
			biz: string;
			display: {
				language: string;
				name: string;
				icon: {
					url: string;
					hover_url: string;
					link: string;
					login_state_in_link: boolean;
					md5: string;
					size: number;
				};
				title: string;
				subtitle: string;
				background: {
					url: string;
					link: string;
					login_state_in_link: boolean;
				};
				logo: {
					url: string;
					link: string;
					login_state_in_link: boolean;
				};
				thumbnail: {
					url: string;
					link: string;
					login_state_in_link: boolean;
				};
				korea_rating: any;
				shortcut: {
					url: string;
					hover_url: string;
					link: string;
					login_state_in_link: boolean;
					md5: string;
					size: number;
				};
				wpf_icon?: {
					url: string;
					hover_url: string;
					link: string;
					login_state_in_link: boolean;
					md5: string;
					size: number;
				};
			};
			reservation: any;
			display_status: string;
			game_server_configs: {
				i18n_name: string;
				i18n_description: string;
				package_name: string;
				auto_scan_registry_key: string;
				package_detection_info: string;
				game_id: string;
				reservation: any;
				display_status: string;
			}[];
		}[];
	};
};

export const FFMPEG_FILTERS: Record<"webp" | "webm", string> = {
	webm: "-c:v libx264 -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc iec61966-2-1 -tune animation -preset fast -movflags +faststart -c:a copy",
	webp: "-lossless 1 -compression_level 6",
};

export type GameAsset = {
	image: string | null;
	video: string | null;
};

export type Manifest = Record<string, { backgrounds: GameAsset[]; overlay: string | null, icon: string | null }>;

export const GRAPHICS_URL =
	"\x68\x74\x74\x70\x73\x3a\x2f\x2f\x73\x67\x2d\x68\x79\x70\x2d\x61\x70\x69\x2e\x68\x6f\x79\x6f\x76\x65\x72\x73\x65\x2e\x63\x6f\x6d\x2f\x68\x79\x70\x2f\x68\x79\x70\x2d\x63\x6f\x6e\x6e\x65\x63\x74\x2f\x61\x70\x69\x2f\x67\x65\x74\x41\x6c\x6c\x47\x61\x6d\x65\x42\x61\x73\x69\x63\x49\x6e\x66\x6f\x3f\x6c\x61\x75\x6e\x63\x68\x65\x72\x5f\x69\x64\x3d\x56\x59\x54\x70\x58\x6c\x62\x57\x6f\x38\x26\x6c\x61\x6e\x67\x75\x61\x67\x65\x3d\x65\x6e";

export const BRANDING_URL =
	"\x68\x74\x74\x70\x73\x3a\x2f\x2f\x73\x67\x2d\x68\x79\x70\x2d\x61\x70\x69\x2e\x68\x6f\x79\x6f\x76\x65\x72\x73\x65\x2e\x63\x6f\x6d\x2f\x68\x79\x70\x2f\x68\x79\x70\x2d\x63\x6f\x6e\x6e\x65\x63\x74\x2f\x61\x70\x69\x2f\x67\x65\x74\x47\x61\x6d\x65\x73\x3f\x6c\x61\x75\x6e\x63\x68\x65\x72\x5f\x69\x64\x3d\x56\x59\x54\x70\x58\x6c\x62\x57\x6f\x38";
