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

function sanitizeLegacyVendorSyntax(source) {
  return source
    .replaceAll("document.currentScript?.src", "(document.currentScript&&document.currentScript.src)")
    .replaceAll("process.versions?.node", "(process.versions&&process.versions.node)")
    .replaceAll("e.onAbort?.(a)", "(e.onAbort&&e.onAbort(a))")
    .replaceAll("pa?.(a)", "(pa&&pa(a))")
    .replaceAll("a.output?.length", "(a.output&&a.output.length)")
    .replaceAll("e.monitorRunDependencies?.(qb)", "(e.monitorRunDependencies&&e.monitorRunDependencies(qb))")
    .replaceAll("m?.()", "(m&&m())")
    .replaceAll("b.gg??(b.gg=!0)", "(b.gg==null&&(b.gg=!0))")
    .replaceAll("44===m?.Lf", "44===(m&&m.Lf)")
    .replaceAll("a.Gf?.Hh?.(a)", "(a.Gf&&a.Gf.Hh&&a.Gf.Hh(a))")
    .replaceAll("var d=a?.Gf.Rf;a=d?a:b;d??=b.Ff.Rf;", "var d=a&&a.Gf?a.Gf.Rf:void 0;a=d?a:b;if(d==null)d=b.Ff.Rf;")
    .replaceAll("a.Gf.open?.(a)", "(a.Gf.open&&a.Gf.open(a))")
    .replaceAll("a??=e.stdin", "a=a==null?e.stdin:a")
    .replaceAll("b??=e.stdout", "b=b==null?e.stdout:b")
    .replaceAll("c??=e.stderr", "c=c==null?e.stderr:c")
    .replaceAll("(f=x.Yf).ug??(f.ug=64);", "if((f=x.Yf).ug==null)f.ug=64;")
    .replaceAll("d?.buffer?.length", "((d&&d.buffer)&&d.buffer.length)")
    .replaceAll("e.onExit?.(a)", "(e.onExit&&e.onExit(a))")
    .replaceAll("oa?.(e)", "(oa&&oa(e))")
    .replaceAll("e.onRuntimeInitialized?.()", "(e.onRuntimeInitialized&&e.onRuntimeInitialized())")
    .replaceAll("xa??=e.locateFile?e.locateFile(\"tesseract-core-lstm.wasm\",fa):fa+\"tesseract-core-lstm.wasm\"",
      "xa=xa==null?(e.locateFile?e.locateFile(\"tesseract-core-lstm.wasm\",fa):fa+\"tesseract-core-lstm.wasm\"):xa");
}

function buildEmbeddedTesseractCore(coreSource, wasmBase64) {
  const embeddedBinary = [
    "moduleArg.wasmBinary=(function(){",
    `var b=atob(${JSON.stringify(wasmBase64)});`,
    "var a=new Uint8Array(b.length);",
    "for(var i=0;i<b.length;i+=1){a[i]=b.charCodeAt(i);}",
    "return a.buffer;",
    "})();"
  ].join("");

  return sanitizeLegacyVendorSyntax(coreSource).replace(
    "return async function(moduleArg={}){",
    `return async function(moduleArg={}){${embeddedBinary}`
  );
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
const tesseractCorePath = path.join(rootDir, "node_modules", "tesseract.js-core", "tesseract-core-lstm.js");
const tesseractCoreWasmPath = path.join(rootDir, "node_modules", "tesseract.js-core", "tesseract-core-lstm.wasm");
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
  `  tesseractCoreBase64: ${JSON.stringify(
    Buffer.from(
      buildEmbeddedTesseractCore(
        fs.readFileSync(tesseractCorePath, "utf8"),
        fs.readFileSync(tesseractCoreWasmPath).toString("base64")
      ),
      "utf8"
    ).toString("base64")
  )},`,
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
