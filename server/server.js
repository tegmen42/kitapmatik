import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5500;

// Serve static files from assets directory
const assetsPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets');
app.use(express.static(assetsPath));

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(assetsPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${assetsPath}`);
  console.log(`\n✨ Open http://localhost:${PORT} in your browser\n`);
});

