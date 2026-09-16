export const ELYSIAE_COMPONENT_NAMES = ["phlogiston"] as const;
export const ELYSIAE_COMPONENT_REPOS = ["elysiae-project/phlogiston"] as const;

export type GithubApiReleases = {
  url: string;
  assets_url: string;
  upload_url: string;
  html_url: string;
  id: number;
  author: GithubUserInfo;
  node_id: string;
  tag_name: string;
  draft: boolean;
  immutable: boolean;
  prerelease: boolean;
  created_at: string;
  updated_at: string;
  published_at: string;
  assets: GithubReleaseAsset[];
};

export type GithubReleaseAsset = {
  url: string;
  id: number;
  node_id: string;
  name: string;
  label: string;
  uploader: GithubUserInfo;
  content_type: string;
  state: string;
  size: number;
  digest: string;
  download_count: number;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
};

export type GithubUserInfo = {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: "Bot" | "User";
  user_view_type: "public" | "private"; // Best guess
  site_admin: boolean;
};

export type Components = (typeof ELYSIAE_COMPONENT_NAMES)[number];

export type ComponentAsset = {
  tag: string;
  download:
    | string
    | {
        amd64: {
          url: string;
          checksum: string;
        };
        aarch64: {
          url: string;
          checksum: string;
        };
      };
  prerelease: boolean;
};

export type AedesComponents = {
  [key in Components]: ComponentAsset[];
};
