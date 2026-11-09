import { writeFileSync } from "node:fs";
import type {
  AedesComponents,
  GithubApiReleases,
  GithubReleaseAsset,
} from "../types/GitHub.ts";

export const regenerateComponentData = async () => {
  // Only phlogiston exists so there's no point in using fancy for loops to fetch everything
  const res = {} as AedesComponents;
  const apiResponse = (await (
    await fetch(
      `https://api.github.com/repos/elysiae-project/phlogiston/releases`,
    )
  ).json()) as GithubApiReleases[];
  res.phlogiston ??= [];

  for (let i = apiResponse.length - 1; i >= 0; i--) {
    const current = apiResponse[i] as GithubApiReleases;
    const amdAsset = current.assets[
      getPhlogistonArchIndex(current, "x86_64") as number
    ] as GithubReleaseAsset;
    const armAsset = current.assets[
      getPhlogistonArchIndex(current, "aarch64") as number
    ] as GithubReleaseAsset;

    res.phlogiston.push({
      tag: current.tag_name,
      download: {
        amd64: {
          url: amdAsset.browser_download_url,
          checksum: amdAsset.digest.slice(7),
        },
        aarch64: {
          url: armAsset.browser_download_url,
          checksum: armAsset.digest.slice(7),
        },
      },
      prerelease: current.prerelease,
    });
  }

  writeFileSync(
    "./static/launcher-components.json",
    JSON.stringify(res, null, 2),
  );
};

const getPhlogistonArchIndex = (
  data: GithubApiReleases,
  arch: "x86_64" | "aarch64",
): number | null => {
  for (let i = 0; i < data.assets.length; i++) {
    const current = data.assets[i] as GithubReleaseAsset;
    if (current.name.includes(arch) && !current.name.includes(".sha512sum")) {
      return i;
    }
  }
  return null;
};
