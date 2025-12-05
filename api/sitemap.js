import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), "seo.config.json"), "utf8"));

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    config.urls
      .map(url => `<url><loc>${config.siteUrl}${url}</loc><priority>1.0</priority><changefreq>daily</changefreq></url>`)
      .join("\n") +
    `\n</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.status(200).send(xml);
}

