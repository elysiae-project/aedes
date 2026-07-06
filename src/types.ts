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
