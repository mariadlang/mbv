import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(repositoryRoot, "scripts", "design-token-baseline.json");
const sourceRoots = ["app", "src"];
const sourceExtensions = new Set([".css", ".ts", ".tsx"]);
const colorPattern = /#[0-9a-f]{3,8}(?![0-9a-z_-])|(?:rgba?|hsla?)\([^\r\n)]*\)/gi;

const toRepositoryPath = (absolutePath) => path.relative(repositoryRoot, absolutePath).split(path.sep).join("/");
const normalizeLiteral = (value) => value.toLowerCase().replace(/\s+/g, "");

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectSourceFiles(absolutePath));
    else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) files.push(absolutePath);
  }

  return files;
}

async function inventoryColors() {
  const files = (await Promise.all(sourceRoots.map((root) => collectSourceFiles(path.join(repositoryRoot, root)))))
    .flat()
    .sort((left, right) => left.localeCompare(right));
  const inventory = {};
  const occurrences = [];

  for (const absolutePath of files) {
    const source = await readFile(absolutePath, "utf8");
    const relativePath = toRepositoryPath(absolutePath);
    const lines = source.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      colorPattern.lastIndex = 0;
      for (const match of lines[index].matchAll(colorPattern)) {
        const literal = normalizeLiteral(match[0]);
        inventory[relativePath] ??= {};
        inventory[relativePath][literal] = (inventory[relativePath][literal] ?? 0) + 1;
        occurrences.push({
          file: relativePath,
          line: index + 1,
          column: (match.index ?? 0) + 1,
          literal,
        });
      }
    }
  }

  return {
    files: Object.fromEntries(Object.entries(inventory).map(([file, literals]) => [
      file,
      Object.fromEntries(Object.entries(literals).sort(([left], [right]) => left.localeCompare(right))),
    ])),
    occurrences,
  };
}

function createBaseline(files) {
  return {
    version: 1,
    description: "Maximum reviewed direct-color occurrences across token sources, technical exceptions, and inherited CSS debt.",
    scope: ["app/**/*.{css,ts,tsx}", "src/**/*.{css,ts,tsx}"],
    policy: "A lower count is accepted; any new literal or increase requires an intentional baseline review.",
    files,
  };
}

const updateBaseline = process.argv.includes("--update-baseline");
const showHelp = process.argv.includes("--help") || process.argv.includes("-h");

if (showHelp) {
  console.log("Usage: node scripts/audit-design-tokens.mjs [--update-baseline]");
  console.log("Without flags, fails when direct-color usage exceeds the reviewed baseline.");
  process.exit(0);
}

const current = await inventoryColors();

if (updateBaseline) {
  await writeFile(baselinePath, `${JSON.stringify(createBaseline(current.files), null, 2)}\n`, "utf8");
  console.log(`Design-token baseline updated: ${toRepositoryPath(baselinePath)}`);
  console.log(`Tracked ${current.occurrences.length} direct-color occurrences across ${Object.keys(current.files).length} files.`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(await readFile(baselinePath, "utf8"));
} catch (error) {
  console.error(`Cannot read ${toRepositoryPath(baselinePath)}. Run with --update-baseline only after reviewing current debt.`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

if (baseline.version !== 1 || !baseline.files || typeof baseline.files !== "object") {
  console.error("Unsupported or malformed design-token baseline.");
  process.exit(1);
}

const regressions = current.occurrences.filter(({ file, literal }) => {
  const actualCount = current.files[file]?.[literal] ?? 0;
  const allowedCount = baseline.files[file]?.[literal] ?? 0;
  return actualCount > allowedCount;
});
const uniqueRegressions = [...new Map(regressions.map((entry) => [`${entry.file}:${entry.literal}`, entry])).values()];

if (uniqueRegressions.length > 0) {
  console.error("Design-token audit failed. Direct colors exceed the reviewed baseline:");
  for (const entry of uniqueRegressions) {
    const actualCount = current.files[entry.file][entry.literal];
    const allowedCount = baseline.files[entry.file]?.[entry.literal] ?? 0;
    console.error(`- ${entry.file}:${entry.line}:${entry.column} ${entry.literal} (${actualCount} current, ${allowedCount} allowed)`);
  }
  console.error("Use an existing token, add an approved token, or document the exception before updating the baseline.");
  process.exit(1);
}

const baselineTotal = Object.values(baseline.files).reduce(
  (fileTotal, literals) => fileTotal + Object.values(literals).reduce((literalTotal, count) => literalTotal + count, 0),
  0,
);
const reduction = baselineTotal - current.occurrences.length;
console.log(`Design-token audit passed: ${current.occurrences.length}/${baselineTotal} baseline direct-color occurrences.`);
if (reduction > 0) console.log(`Inherited direct-color debt reduced by ${reduction} occurrence${reduction === 1 ? "" : "s"}; update the baseline after review.`);
