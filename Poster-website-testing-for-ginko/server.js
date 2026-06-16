const express  = require('express');
const multer   = require('multer');
const fs       = require('fs');
const path     = require('path');

// ── Optional Cloudinary ──────────────────────────────────
let cloudinary = null;
if (process.env.CLOUDINARY_CLOUD_NAME) {
  try {
    const { v2: cld } = require('cloudinary');
    cld.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    cloudinary = cld;
    console.log('☁️  Cloudinary enabled');
  } catch (err) {
    console.warn('⚠️  Cloudinary not available:', err.message);
  }
}

const app  = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, 'data', 'site.json');

// ── Init data file if missing ────────────────────────────
const DEFAULT_DATA = {
  site: { name:'Ginko Posters', logo:'ginko-logo.png', heroImage:'', heroTitle:'Original Art Prints', heroSubtitle:'Free worldwide shipping on all orders', currency:'GBP', currencies:['GBP','USD','EUR','AUD','CAD'] },
  artists: [
    { id:'laz-lewis', name:'Laz Lewis', tagline:'Adventure Photography', heroImage:'Lazlewis landing page.jpg', page:'laz-lewis.html' },
    { id:'madebygray', name:'MadeByGray', tagline:'Editorial Fashion Art', heroImage:'MadeByGray Poster Files/madebygray-hero.jpg', page:'madebygray.html' }
  ],
  products: [
    { id:'laz-1', artistId:'laz-lewis', name:'Red Cliffs', description:'', images:['Lazzy (1) 2x3.jpg'], sku:'', stock:999 },
    { id:'laz-2', artistId:'laz-lewis', name:'Beach Drive', description:'', images:['Lazzy (2) 2x3.jpg'], sku:'', stock:999 },
    { id:'laz-3', artistId:'laz-lewis', name:'Canyon', description:'', images:['Lazzy (3) 2x3 copy.jpg'], sku:'', stock:999 },
    { id:'laz-4', artistId:'laz-lewis', name:'Dunes', description:'', images:['Lazzy (4) 2x3.jpg'], sku:'', stock:999 },
    { id:'laz-5', artistId:'laz-lewis', name:'Emerald Water', description:'', images:['lazzy (5) 2x3 #2 Final.jpg'], sku:'', stock:999 },
    { id:'laz-6', artistId:'laz-lewis', name:'Coastal Haze', description:'', images:['lazzy (6) 2x3.jpg'], sku:'', stock:999 },
    { id:'laz-7', artistId:'laz-lewis', name:'Open Road', description:'', images:['lazzy (7) 2x3.jpg'], sku:'', stock:999 },
    { id:'laz-8', artistId:'laz-lewis', name:'Horizon', description:'', images:['lazzy (8) 2x3.jpg'], sku:'', stock:999 },
    { id:'gray-1', artistId:'madebygray', name:'Travis Scott', description:'', images:['MadeByGray Poster Files/Travis Scott - 2x3.jpg'], sku:'', stock:999 },
    { id:'gray-2', artistId:'madebygray', name:'Jordan Barrett', description:'', images:['MadeByGray Poster Files/Jordan Barrett - 2x3.jpg'], sku:'', stock:999 },
    { id:'gray-3', artistId:'madebygray', name:'Bape x KidSuper', description:'', images:['MadeByGray Poster Files/Bape x KidSuper - 2x3.jpg'], sku:'', stock:999 },
    { id:'gray-4', artistId:'madebygray', name:'Sp5der Cuntry', description:'', images:['MadeByGray Poster Files/Sp5der Cuntry - 2x3.jpg'], sku:'', stock:999 },
    { id:'gray-5', artistId:'madebygray', name:'Dominic Fike', description:'', images:['MadeByGray Poster Files/sunburn dominic fike - 2x3.jpg'], sku:'', stock:999 },
    { id:'gray-6', artistId:'madebygray', name:'AT Vetement', description:'', images:['MadeByGray Poster Files/AT Vetement - 2x3.jpg'], sku:'', stock:999 },
    { id:'gray-7', artistId:'madebygray', name:'Yohji Yamamoto', description:'', images:['MadeByGray Poster Files/yohji yamamoto aw1998 - 2x3.jpg'], sku:'', stock:999 }
  ],
  sizes: [
    { label:'A4', price:21.76 },
    { label:'A3', price:27.48 },
    { label:'A2', price:33.21 },
    { label:'A1', price:38.93 }
  ],
  orders: []
};

if (!fs.existsSync(path.join(ROOT, 'data'))) fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
if (!fs.existsSync(DATA)) fs.writeFileSync(DATA, JSON.stringify(DEFAULT_DATA, null, 2));

// ── Middleware ───────────────────────────────────────────
app.use(express.json());
app.use(express.static(ROOT));
app.use('/uploads', express.static(path.join(ROOT, 'uploads')));

const MBG_DIR = path.join(ROOT, 'MadeByGray Poster Files');
if (fs.existsSync(MBG_DIR)) {
  app.use('/MadeByGray Poster Files', express.static(MBG_DIR));
}

// ── Multer ───────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// ── Data helpers ─────────────────────────────────────────
function read() {
  const raw = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  if (!raw.site) raw.site = { name:'Ginko Posters', logo:'ginko-logo.png', heroImage:'', heroTitle:'Original Art Prints', heroSubtitle:'Free worldwide shipping', currency:'USD', currencies:['USD','GBP','EUR','AUD','CAD'] };
  if (!raw.orders) raw.orders = [];
  raw.products = raw.products.map(p => ({ sku:'', stock:999, ...p }));
  return raw;
}
function write(data) { fs.writeFileSync(DATA, JSON.stringify(data, null, 2)); }
function slug(str)   { return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

// ── Upload ───────────────────────────────────────────────
app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  if (cloudinary) {
    try {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'ginko-posters', use_filename: true },
          (err, result) => err ? reject(err) : resolve(result)
        ).end(req.file.buffer);
      });
      return res.json({ path: result.secure_url });
    } catch (err) {
      return res.status(500).json({ error: 'Cloudinary upload failed: ' + err.message });
    }
  }
  const dir = path.join(ROOT, 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(req.file.originalname);
  const filename = Date.now() + ext;
  fs.writeFileSync(path.join(dir, filename), req.file.buffer);
  res.json({ path: 'uploads/' + filename });
});

// ── Site settings ────────────────────────────────────────
app.get('/api/site', (req, res) => res.json(read().site));
app.put('/api/site', (req, res) => {
  const data = read(); data.site = { ...data.site, ...req.body }; write(data); res.json(data.site);
});

// ── Sizes ────────────────────────────────────────────────
app.get('/api/sizes', (req, res) => res.json(read().sizes));
app.put('/api/sizes', (req, res) => {
  const data = read(); data.sizes = req.body; write(data); res.json(data.sizes);
});

// ── Artists ──────────────────────────────────────────────
app.get('/api/artists', (req, res) => res.json(read().artists));
app.get('/api/artists/:id', (req, res) => {
  const artist = read().artists.find(a => a.id === req.params.id);
  if (!artist) return res.status(404).json({ error: 'Not found' });
  res.json(artist);
});
app.post('/api/artists', (req, res) => {
  const data = read();
  const { name, tagline, heroImage } = req.body;
  const id = slug(name); const page = id + '.html';
  if (data.artists.find(a => a.id === id)) return res.status(400).json({ error: 'Artist already exists' });
  const artist = { id, name, tagline: tagline||'', heroImage: heroImage||'', page };
  data.artists.push(artist); write(data); generateArtistPage(artist); res.json(artist);
});
app.put('/api/artists/:id', (req, res) => {
  const data = read();
  const idx = data.artists.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.artists[idx] = { ...data.artists[idx], ...req.body }; write(data); res.json(data.artists[idx]);
});
app.delete('/api/artists/:id', (req, res) => {
  const data = read();
  const artist = data.artists.find(a => a.id === req.params.id);
  if (!artist) return res.status(404).json({ error: 'Not found' });
  data.artists = data.artists.filter(a => a.id !== req.params.id);
  data.products = data.products.filter(p => p.artistId !== req.params.id);
  write(data);
  const safe = ['laz-lewis.html','madebygray.html'];
  const pg = path.join(ROOT, artist.page);
  if (!safe.includes(artist.page) && fs.existsSync(pg)) fs.unlinkSync(pg);
  res.json({ ok: true });
});

// ── Products ─────────────────────────────────────────────
app.get('/api/products', (req, res) => {
  let products = read().products;
  if (req.query.artistId) products = products.filter(p => p.artistId === req.query.artistId);
  res.json(products);
});
app.get('/api/products/:id', (req, res) => {
  const data = read();
  const product = data.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  const artist = data.artists.find(a => a.id === product.artistId);
  res.json({ ...product, artistName: artist ? artist.name : '' });
});
app.post('/api/products', (req, res) => {
  const data = read();
  const { artistId, name, description, images, sku, stock } = req.body;
  if (!artistId || !name) return res.status(400).json({ error: 'artistId and name are required' });
  const id = artistId + '-' + slug(name) + '-' + Date.now();
  const product = { id, artistId, name, description: description||'', images: images||[], sku: sku||'', stock: stock !== undefined ? stock : 999 };
  data.products.push(product); write(data); res.json(product);
});
app.put('/api/products/:id', (req, res) => {
  const data = read();
  const idx = data.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.products[idx] = { ...data.products[idx], ...req.body }; write(data); res.json(data.products[idx]);
});
app.delete('/api/products/:id', (req, res) => {
  const data = read();
  if (!data.products.find(p => p.id === req.params.id)) return res.status(404).json({ error: 'Not found' });
  data.products = data.products.filter(p => p.id !== req.params.id); write(data); res.json({ ok: true });
});

// ── Orders ───────────────────────────────────────────────
app.get('/api/orders', (req, res) => res.json(read().orders));
app.post('/api/orders', (req, res) => {
  const data = read();
  const order = { id: 'ord-' + Date.now(), createdAt: new Date().toISOString(), ...req.body };
  data.orders.push(order); write(data); res.json(order);
});
app.delete('/api/orders/:id', (req, res) => {
  const data = read();
  if (!data.orders.find(o => o.id === req.params.id)) return res.status(404).json({ error: 'Not found' });
  data.orders = data.orders.filter(o => o.id !== req.params.id); write(data); res.json({ ok: true });
});

// ── Generate artist page ─────────────────────────────────
function generateArtistPage(artist) {
  const templatePath = path.join(ROOT, 'laz-lewis.html');
  const destPath     = path.join(ROOT, artist.page);
  if (!fs.existsSync(templatePath)) return;
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html.replace(/laz-lewis/g, artist.id)
             .replace(/Laz Lewis/g, artist.name);
  fs.writeFileSync(destPath, html);
}

// ── Start ────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🚀  Ginko Posters running on http://localhost:${PORT}`));
