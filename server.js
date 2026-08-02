const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// generates a random 6-character short code
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// basic URL format check
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function toResponse(link, req) {
  return {
    shortCode: link.code,
    shortUrl: `${req.protocol}://${req.get('host')}/${link.code}`,
    originalUrl: link.originalUrl,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
}

// CREATE — POST /links
app.post('/links', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A "url" field is required.' });
  }
  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'The provided url is not a valid URL.' });
  }

  let code = generateCode();
  let exists = await prisma.link.findUnique({ where: { code } });
  while (exists) {
    code = generateCode();
    exists = await prisma.link.findUnique({ where: { code } });
  }

  const link = await prisma.link.create({
    data: { code, originalUrl: url },
  });

  res.status(201).json(toResponse(link, req));
});

// READ (all) — GET /links
app.get('/links', async (req, res) => {
  const links = await prisma.link.findMany({ orderBy: { createdAt: 'desc' } });
  res.status(200).json(links.map((link) => toResponse(link, req)));
});

// READ (one, metadata only — does not redirect) — GET /links/:code
app.get('/links/:code', async (req, res) => {
  const link = await prisma.link.findUnique({ where: { code: req.params.code } });
  if (!link) {
    return res.status(404).json({ error: 'Short link not found.' });
  }
  res.status(200).json(toResponse(link, req));
});

// UPDATE — PUT /links/:code
app.put('/links/:code', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A "url" field is required.' });
  }
  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'The provided url is not a valid URL.' });
  }

  const existing = await prisma.link.findUnique({ where: { code: req.params.code } });
  if (!existing) {
    return res.status(404).json({ error: 'Short link not found.' });
  }

  const updated = await prisma.link.update({
    where: { code: req.params.code },
    data: { originalUrl: url },
  });

  res.status(200).json(toResponse(updated, req));
});

// DELETE — DELETE /links/:code
app.delete('/links/:code', async (req, res) => {
  const existing = await prisma.link.findUnique({ where: { code: req.params.code } });
  if (!existing) {
    return res.status(404).json({ error: 'Short link not found.' });
  }

  await prisma.link.delete({ where: { code: req.params.code } });
  res.status(204).send();
});

// REDIRECT — GET /:code  (must stay below the routes above so "/links" isn't caught here)
app.get('/:code', async (req, res) => {
  const link = await prisma.link.findUnique({ where: { code: req.params.code } });
  if (!link) {
    return res.status(404).json({ error: 'Short link not found.' });
  }
  res.redirect(link.originalUrl);
});

// fallback for anything else
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// basic error-handling middleware (500s)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`URL Shortener API (with database) running on http://localhost:${PORT}`);
});
