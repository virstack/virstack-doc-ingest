import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import type { PipelineState } from "../core/state.js";
import { logger, LogSource } from "../core/logger.js";

const execFileAsync = promisify(execFile);

/**
 * Resolves the LibreOffice soffice binary.
 * Checks SOFFICE_PATH env var first, otherwise relies on system PATH.
 */
function getSofficePath(): string {
  if (process.env.SOFFICE_PATH) return process.env.SOFFICE_PATH;
  return "soffice"; // Default to whatever is in the PATH
}

/**
 * Converts the input file to PDF using LibreOffice headless.
 * Updates state.filePath to point to the newly generated PDF.
 * Supported: DOCX, DOC, RTF, ODT, EPUB, PPTX, PPT, ODP
 */
export async function libreOfficeToPdf(
  state: PipelineState,
): Promise<Partial<PipelineState>> {
  const sofficePath = getSofficePath();
  if (!state.filePath) throw new Error("[libreOfficeToPdf] filePath is missing");
  const inputPath = path.resolve(process.cwd(), state.filePath);
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "lo-pdf-"));

  logger.info(LogSource.LIBRE_OFFICE, `Converting: ${path.basename(inputPath)}`);
  logger.info(LogSource.LIBRE_OFFICE, `Using soffice: ${sofficePath}`);
  logger.info(LogSource.LIBRE_OFFICE, `Output dir: ${outputDir}`);

  try {
    await execFileAsync(sofficePath, [
      "--headless",
      "--norestore",
      "--convert-to", "pdf",
      "--outdir", outputDir,
      inputPath,
    ]);
  } catch (err: any) {
    throw new Error(
      `LibreOffice conversion failed. Is LibreOffice installed?\n` +
      `  Tried: ${sofficePath}\n` +
      `  On macOS: brew install --cask libreoffice\n` +
      `  Set SOFFICE_PATH in .env to override.\n` +
      `  Original error: ${err.message}`
    );
  }

  // LibreOffice names the output file after the input file with .pdf extension
  const baseName = path.parse(inputPath).name;
  const pdfPath = path.join(outputDir, `${baseName}.pdf`);

  // Verify the file exists
  try {
    await fs.access(pdfPath);
  } catch {
    throw new Error(
      `LibreOffice ran but output PDF not found at: ${pdfPath}. ` +
      `Check LibreOffice installation.`
    );
  }

  logger.success(LogSource.LIBRE_OFFICE, `Converted to: ${pdfPath}`);

  return { filePath: pdfPath };
}
