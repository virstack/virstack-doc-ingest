import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import type { PipelineState } from "../state.js";

const execFileAsync = promisify(execFile);

/**
 * Resolves the LibreOffice soffice binary.
 * Checks SOFFICE_PATH env var first, then common install locations.
 */
function getSofficePath(): string {
  if (process.env.SOFFICE_PATH) return process.env.SOFFICE_PATH;

  const candidates = [
    "/Applications/LibreOffice.app/Contents/MacOS/soffice", // macOS
    "/usr/bin/soffice",                                       // Linux
    "/usr/local/bin/soffice",                                 // Linux (homebrew)
    "soffice",                                                // In PATH
  ];

  // Return first that might exist; runtime will throw if none are valid
  return candidates[0];
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
  const inputPath = path.resolve(process.cwd(), state.filePath);
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "lo-pdf-"));

  console.log(`[libreOfficeToPdf] Converting: ${path.basename(inputPath)}`);
  console.log(`[libreOfficeToPdf] Using soffice: ${sofficePath}`);
  console.log(`[libreOfficeToPdf] Output dir: ${outputDir}`);

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

  console.log(`[libreOfficeToPdf] ✅ Converted to: ${pdfPath}`);

  return { filePath: pdfPath };
}
