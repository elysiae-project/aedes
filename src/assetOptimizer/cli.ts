import ansiColors from "ansi-colors";
import cliProgress from "cli-progress";
import { exec } from "node:child_process";
import { promisify } from "node:util";

export const execAsync = promisify(exec);

export const optimiseProgress = new cliProgress.SingleBar({
  format: `Optimising Files... ${ansiColors.whiteBright("{bar}")} {value}/{total} ({percentage}% Complete)`,
  barCompleteChar: "\u2588",
  barIncompleteChar: "\u0020",
  hideCursor: true,
});
