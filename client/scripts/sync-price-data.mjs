import { mkdir, readdir, copyFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.resolve(__dirname, "../../data/prices");
const targetDir = path.resolve(__dirname, "../public/data/prices");

async function syncPriceData() {
  await mkdir(targetDir, { recursive: true });

  const sourceEntries = await readdir(sourceDir, { withFileTypes: true });
  const sourceFiles = sourceEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name);
  const sourceFileSet = new Set(sourceFiles);

  await Promise.all(
    sourceFiles.map((file) =>
      copyFile(path.join(sourceDir, file), path.join(targetDir, file))
    )
  );

  const targetEntries = await readdir(targetDir, { withFileTypes: true });
  await Promise.all(
    targetEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .filter((entry) => !sourceFileSet.has(entry.name))
      .map((entry) => unlink(path.join(targetDir, entry.name)))
  );

  console.log(`Synced ${sourceFiles.length} price files to ${targetDir}`);
}

syncPriceData().catch((error) => {
  console.error("Failed to sync price files:", error);
  process.exitCode = 1;
});
