import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const selfPath = fileURLToPath(import.meta.url);
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".tmp",
  ".vercel",
  "node_modules",
  "node_modules_corrupt_backup",
]);

const allowedExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".json",
  ".md",
  ".css",
  ".prisma",
  ".yml",
  ".yaml",
]);

const suspiciousPatterns = [
  { label: "utf8-mojibake", pattern: /[ÃÄÅ�]/u },
  {
    label: "literal-question-mark-corruption",
    pattern:
      /\b(?:Kateg\?ri|g\?nder|g\?r(?:sel|n(?:e|ü)m|ü)?|y\?l|olu\?tu|itirazi|Listesine Don|\?\?itma)\b/u,
  },
];

function shouldInspect(filePath) {
  const fileName = path.basename(filePath);
  if (fileName.startsWith(".env")) {
    return true;
  }

  return allowedExtensions.has(path.extname(filePath));
}

function walk(directory, collector) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        walk(path.join(directory, entry.name), collector);
      }
      continue;
    }

    const fullPath = path.join(directory, entry.name);
    if (fullPath === selfPath) {
      continue;
    }

    if (!shouldInspect(fullPath)) {
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (line.includes("not.toMatch(/[ÃÄÅ]/)") || line.includes("toMatch(/[ÃÄÅ]/)")) {
        return;
      }

      for (const { label, pattern } of suspiciousPatterns) {
        if (pattern.test(line)) {
          collector.push({
            file: path.relative(root, fullPath).replace(/\\/g, "/"),
            line: index + 1,
            label,
            text: line.trim(),
          });
          break;
        }
      }
    });
  }
}

const findings = [];
walk(root, findings);

if (findings.length === 0) {
  console.log("No suspicious mojibake patterns found.");
  process.exit(0);
}

console.error("Suspicious mojibake patterns found:");
for (const finding of findings) {
  console.error(`${finding.file}:${finding.line} [${finding.label}] ${finding.text}`);
}
process.exit(1);
