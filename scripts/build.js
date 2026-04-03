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

function resolveExistingPath(candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Required build asset not found. Checked: ${candidates.join(", ")}`);
}

const pdfModulePath = resolveExistingPath([
  path.join(rootDir, "node_modules", "pdfjs-dist", "legacy", "build", "pdf.min.mjs"),
  path.join(rootDir, "node_modules", "pdfjs-dist", "build", "pdf.min.mjs")
]);
const pdfWorkerPath = resolveExistingPath([
  path.join(rootDir, "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.min.mjs"),
  path.join(rootDir, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs")
]);
const tesseractModulePath = path.join(rootDir, "node_modules", "tesseract.js", "dist", "tesseract.min.js");
const tesseractWorkerPath = path.join(rootDir, "node_modules", "tesseract.js", "dist", "worker.min.js");
const tesseractCorePath = path.join(rootDir, "node_modules", "tesseract.js-core", "tesseract-core-lstm.wasm.js");
const tesseractEnglishDataPath = path.join(rootDir, "assets", "tessdata", "eng.traineddata.gz");

const template = read(path.join(srcDir, "index.template.html"));
const css = read(path.join(srcDir, "styles.css"));
const codeLists = read(path.join(srcDir, "lib", "schema", "code-lists.js"));
const historicalRegistry = read(path.join(srcDir, "lib", "schema", "historical-registry.js"));
const extractionQuality = read(path.join(srcDir, "lib", "extraction", "quality.js"));
const scheduleRouter = read(path.join(srcDir, "lib", "extraction", "schedule-router.js"));
const fieldMapper = read(path.join(srcDir, "lib", "extraction", "field-mapper.js"));
const pdfSource = read(path.join(srcDir, "lib", "extraction", "pdf-source.js"));
const ocrPipeline = read(path.join(srcDir, "lib", "extraction", "ocr-pipeline.js"));
const core = read(path.join(srcDir, "lib", "core.js"));
const app = read(path.join(srcDir, "app.js"));
const vendorBootstrap = [
  "window.__FORM5500_VENDOR__ = {",
  `  pdfModuleBase64: ${JSON.stringify(fs.readFileSync(pdfModulePath).toString("base64"))},`,
  `  pdfWorkerBase64: ${JSON.stringify(fs.readFileSync(pdfWorkerPath).toString("base64"))},`,
  `  tesseractModuleBase64: ${JSON.stringify(fs.readFileSync(tesseractModulePath).toString("base64"))},`,
  `  tesseractWorkerBase64: ${JSON.stringify(fs.readFileSync(tesseractWorkerPath).toString("base64"))},`,
  `  tesseractCoreBase64: ${JSON.stringify(fs.readFileSync(tesseractCorePath).toString("base64"))},`,
  `  tesseractEnglishDataBase64: ${JSON.stringify(fs.readFileSync(tesseractEnglishDataPath).toString("base64"))}`,
  "};"
].join("\n");

const html = template
  .replace("/*__INLINE_CSS__*/", css)
  .replace(
    "/*__INLINE_JS__*/",
    escapeInlineScript(
      [
        vendorBootstrap,
        codeLists,
        historicalRegistry,
        extractionQuality,
        scheduleRouter,
        fieldMapper,
        pdfSource,
        ocrPipeline,
        core,
        app
      ].join("\n\n")
    )
  );

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(outputPath, html, "utf8");

const files = fs.readdirSync(distDir);
if (files.length !== 1 || files[0] !== outputName) {
  throw new Error(`Build must emit exactly one file in dist, found: ${files.join(", ")}`);
}

console.log(`Built ${path.relative(rootDir, outputPath)}`);
