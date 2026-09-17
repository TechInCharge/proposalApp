import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const TIMEOUT_MS = 60_000;

/** Common install locations, checked when LIBREOFFICE_EXECUTABLE_PATH isn't set. */
const DEFAULT_CANDIDATES = ["/Applications/LibreOffice.app/Contents/MacOS/soffice", "/usr/bin/soffice", "/usr/lib/libreoffice/program/soffice"];

async function resolveSofficePath(): Promise<string> {
  if (process.env.LIBREOFFICE_EXECUTABLE_PATH) return process.env.LIBREOFFICE_EXECUTABLE_PATH;
  for (const candidate of DEFAULT_CANDIDATES) {
    try {
      await readFile(candidate);
      return candidate;
    } catch {
      // not at this path, try the next
    }
  }
  return "soffice"; // fall back to PATH resolution
}

/**
 * Runs one headless LibreOffice conversion (`--convert-to <targetFilter>`) on
 * `input`, named `<inputBasename>.<ext>`, and returns the converted bytes.
 *
 * A fresh -env:UserInstallation profile is used per call: headless `soffice`
 * has known lock-file contention when multiple conversions share one profile
 * concurrently (see the SuperDoc migration plan) — cheaper to give every call
 * its own throwaway profile than to serialize around it.
 */
export async function convertWithSoffice(input: Buffer, inputExt: string, targetFilter: string, outputExt: string): Promise<Buffer> {
  const soffice = await resolveSofficePath();
  const workDir = await mkdtemp(join(tmpdir(), "soffice-work-"));
  const profileDir = await mkdtemp(join(tmpdir(), "soffice-profile-"));
  try {
    const inputPath = join(workDir, `input-${randomUUID()}.${inputExt}`);
    await writeFile(inputPath, input);

    try {
      await execFileAsync(
        soffice,
        ["--headless", "--norestore", `-env:UserInstallation=file://${profileDir}`, "--convert-to", targetFilter, "--outdir", workDir, inputPath],
        { timeout: TIMEOUT_MS },
      );
    } catch (err) {
      const stderr = err && typeof err === "object" && "stderr" in err ? String((err as { stderr?: unknown }).stderr ?? "") : "";
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`LibreOffice conversion (${inputExt}->${targetFilter}) failed: ${message}${stderr ? `\n${stderr}` : ""}`);
    }

    const outputPath = join(workDir, basename(inputPath, `.${inputExt}`) + `.${outputExt}`);
    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
    await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}
