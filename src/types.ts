/** biome-ignore-all lint/suspicious/noExplicitAny: Some endpoint properties have types that are unknown until updated, if they ever are */
export const GAMES = ["bh3", "hk4e", "hkrpg", "nap"] as const;
export const SUPPORTED_LOCALES = [
  "en-us",
  "zh-cn",
  "ko-kr",
  "fr-fr",
  "de-de",
  "es-es",
  "ru-ru",
  "id-id",
  "ja-jp",
  "th-th",
  "zh-tw",
  "vi-vn",
  "pt-br",
] as const;

export const ELYSIAE_COMPONENTS = ["phlogiston"] as const;
export const ASSETS_SCRAPE_ENDPOINT =
  "\x68\x74\x74\x70\x73\x3a\x2f\x2f\x73\x67\x2d\x68\x79\x70\x2d\x61\x70\x69\x2e\x68\x6f\x79\x6f\x76\x65\x72\x73\x65\x2e\x63\x6f\x6d\x2f\x68\x79\x70\x2f\x68\x79\x70\x2d\x63\x6f\x6e\x6e\x65\x63\x74\x2f\x61\x70\x69\x2f\x67\x65\x74\x41\x6c\x6c\x47\x61\x6d\x65\x42\x61\x73\x69\x63\x49\x6e\x66\x6f\x3f\x6c\x61\x75\x6e\x63\x68\x65\x72\x5f\x69\x64\x3d\x56\x59\x54\x70\x58\x6c\x62\x57\x6f\x38\x26\x6c\x61\x6e\x67\x75\x61\x67\x65\x3d"; // Locale parameter value is missing, append by just adding a supported locale code to the end of this string
export const ICONS_SCRAPE_ENDPOINT =
  "\x68\x74\x74\x70\x73\x3a\x2f\x2f\x73\x67\x2d\x68\x79\x70\x2d\x61\x70\x69\x2e\x68\x6f\x79\x6f\x76\x65\x72\x73\x65\x2e\x63\x6f\x6d\x2f\x68\x79\x70\x2f\x68\x79\x70\x2d\x63\x6f\x6e\x6e\x65\x63\x74\x2f\x61\x70\x69\x2f\x67\x65\x74\x47\x61\x6d\x65\x73\x3f\x6c\x61\x75\x6e\x63\x68\x65\x72\x5f\x69\x64\x3d\x56\x59\x54\x70\x58\x6c\x62\x57\x6f\x38";
export const CN_ICONS_SCRAPE_ENDPOINT =
  "\x68\x74\x74\x70\x73\x3a\x2f\x2f\x68\x79\x70\x2d\x61\x70\x69\x2e\x6d\x69\x68\x6f\x79\x6f\x2e\x63\x6f\x6d\x2f\x68\x79\x70\x2f\x68\x79\x70\x2d\x63\x6f\x6e\x6e\x65\x63\x74\x2f\x61\x70\x69\x2f\x67\x65\x74\x47\x61\x6d\x65\x73\x3f\x6c\x61\x75\x6e\x63\x68\x65\x72\x5f\x69\x64\x3d\x6a\x47\x48\x42\x48\x6c\x63\x4f\x71\x31";

/**
 * API scrape getAllGameBasicInfo() response structure
 */
export type BackgroundEndpoint = {
  retcode: number;
  message: string;
  data: {
    game_info_list: BackgroundEndpointAssets[];
  };
};

export type BackgroundEndpointAssets = {
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
    type: "BACKGROUND_TYPE_VIDEO" | "BACKGROUND_TYPE_UNSPECIFIED";
  }[];
};

export type EndpointIconAssetData = {
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
        korea_rating: any | null;
        shortcut: {
          url: string;
          hover_url: string;
          link: string;
          login_state_in_link: boolean;
          md5: string;
          size: number;
        };
        wpf_icon: {
          url: string;
          hover_url: string;
          link: string;
          login_state_in_link: boolean;
          md5: string;
          size: number;
        };
        top_left_logo: any | null;
        introduction: string;
        reservation: any | null;
        display_satus: string;
        game_server_configs: any[];
      };
    }[];
  };
};

export type Locales = (typeof SUPPORTED_LOCALES)[number];
export type Games = (typeof GAMES)[number];
export type Components = (typeof ELYSIAE_COMPONENTS)[number];

export type LocaleBackgroundAsset = {
  image: string;
  video: string | null;
  overlay: string | null;
};

export interface ComponentAsset {
  tag: string;
  url: string;
  hash: string;
}
[];

export type AedesComponents = Record<Components, ComponentAsset>;

export type AedesAssets = {
  [G in Games]: {
    [L in Locales]: LocaleBackgroundAsset[];
  } & {
    icon: string;
    icon_cn: string;
    shortcut: string;
    shortcut_cn: string;
  };
};
