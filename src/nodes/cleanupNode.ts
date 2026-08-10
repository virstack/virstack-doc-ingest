import fs from "node:fs/promises";
import { pipelineConfig } from "../core/config.js";
import type { PipelineState } from "../core/state.js";
import { logger, LogSource } from "../core/logger.js";

/**
 * Cleans up temporary directories and generated output files created during the pipeline run.
 * Preserves files only if keepLocalFiles is explicitly set to true.
 */
export async function cleanupNode(state: PipelineState): Promise<Partial<PipelineState>> {
  if (pipelineConfig?.keepLocalFiles) {
    logger.info(LogSource.CLEANUP, "keepLocalFiles is enabled; preserving local files.");
    return {};
  }

  const { tempDirs } = state;
  if (!tempDirs || tempDirs.length === 0) {
    return {};
  }

  for (const dir of tempDirs) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
      logger.success(LogSource.CLEANUP, `Cleaned up: ${dir}`);
    } catch (err: unknown) {
      logger.warn(
        LogSource.CLEANUP,
        `Failed to clean up ${dir}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return {};
}
