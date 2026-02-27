import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "../..");
const collectionRoot = path.join(repoRoot, "postman", "collection");
const outputFile = path.join(repoRoot, "postman", "postman_collection.json");

const readJson = async (relativePath) => {
  const fullPath = path.join(collectionRoot, relativePath);
  const raw = await readFile(fullPath, "utf8");
  return JSON.parse(raw);
};

const build = async () => {
  const info = await readJson("info.json");
  const variable = await readJson("variables.json");
  const order = await readJson("order.json");

  const item = [];
  for (const entry of order) {
    if (!entry?.file) {
      throw new Error(`Invalid order entry: ${JSON.stringify(entry)}`);
    }
    item.push(await readJson(entry.file));
  }

  const collection = {
    info,
    item,
    variable,
  };

  await writeFile(outputFile, `${JSON.stringify(collection, null, 4)}\n`, "utf8");
  console.log(`Built ${path.relative(repoRoot, outputFile)} from postman/collection`);
};

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
