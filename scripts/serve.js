const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const fileName = "form5500-ingestor-v0.7.0.html";
const filePath = path.join(distDir, fileName);
const port = Number(process.env.PORT || 4173);

if (!fs.existsSync(filePath)) {
  console.error("Build output not found. Run `npm run build` first.");
  process.exit(1);
}

http
  .createServer((req, res) => {
    const reqPath = req.url === "/" ? `/${fileName}` : req.url;
    if (reqPath !== `/${fileName}`) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(filePath));
  })
  .listen(port, () => {
    console.log(`Serving http://localhost:${port}/${fileName}`);
  });
