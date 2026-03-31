const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");
const outputName = "form5500-ingestor-v0.7.0.html";
const outputPath = path.join(distDir, outputName);

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function escapeInlineScript(source) {
  return source.replace(/<\/script/gi, "<\\/script");
}

const template = read(path.join(srcDir, "index.template.html"));
const css = read(path.join(srcDir, "styles.css"));
const core = read(path.join(srcDir, "lib", "core.js"));
const app = read(path.join(srcDir, "app.js"));

const html = template
  .replace("/*__INLINE_CSS__*/", css)
  .replace("/*__INLINE_JS__*/", escapeInlineScript(`${core}\n\n${app}`));

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(outputPath, html, "utf8");

const files = fs.readdirSync(distDir);
if (files.length !== 1 || files[0] !== outputName) {
  throw new Error(`Build must emit exactly one file in dist, found: ${files.join(", ")}`);
}

console.log(`Built ${path.relative(rootDir, outputPath)}`);
