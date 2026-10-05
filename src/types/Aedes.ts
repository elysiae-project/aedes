export type Arch = "amd64" | "aarch64";
export const SUPPORTED_ARCHES = ["amd64", "aarch64"] as const;

export interface Download {
  url: string;
  checksum: string;
}

export enum StatusCodes {
  Ok = 200,
  BadRequest = 400,
  NotFount = 404,
  Teapot = 418,
  InternalError = 500,
}
