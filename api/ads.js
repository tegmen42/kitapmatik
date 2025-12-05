import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), "seo.config.json"), "utf8"));

  let txt = "";
  if (config.ads.enabled) {
    txt = `google.com, ${config.ads.publisherId}, DIRECT, f08c47fec0942fa0`;
  }

  res.setHeader("Content-Type", "text/plain");
  res.status(200).send(txt);
}

