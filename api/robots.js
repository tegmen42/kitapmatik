import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), "seo.config.json"), "utf8"));

  let robots = "User-agent: *\n";

  if (config.robots.allowAll) robots += "Allow: /\n";

  if (config.robots.disallow.length > 0) {
    config.robots.disallow.forEach(route => {
      robots += `Disallow: ${route}\n`;
    });
  }

  robots += `\nSitemap: ${config.siteUrl}/sitemap.xml`;

  res.setHeader("Content-Type", "text/plain");
  res.status(200).send(robots);
}

