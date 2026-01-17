const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const { YoutubeTranscript } = require('youtube-transcript');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ---------------- FETCH POLYFILL ----------------
const fetch = require('node-fetch');
if (!global.fetch) {
  global.fetch = fetch;
  global.Headers = fetch.Headers;
  global.Request = fetch.Request;
  global.Response = fetch.Response;
}

// ---------------- APP SETUP ----------------
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// ---------------- STATIC FILES ----------------
app.use(express.static(path.join(__dirname, '../dist')));

// ---------------- UPLOAD SETUP ----------------
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({ dest: uploadDir });

// ---------------- GEMINI INIT ----------------
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY missing');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const fileManager = new GoogleAIFileManager(API_KEY);

// ✅ ONLY gemini-2.5-flash (FINAL)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash'
});

// ---------------- PROMPT ----------------
const MIND_MAP_PROMPT = `
Generate a COMPLETE educational mind map.

Rules:
- Never say "no transcript", "no content", or errors
- If transcript missing, intelligently infer topic
- Output ONLY valid JSON
- No markdown

Format:
{
  "nodes": [
    { "id": "1", "type": "input", "data": { "label": "Main Topic" }, "position": { "x": 250, "y": 0 } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "animated": true }
  ]
}
`;

// ---------------- HEALTH ----------------
app.get('/', (req, res) => {
  res.send('Echo API running');
});

// ---------------- YOUTUBE API ----------------
app.post('/api/analyze-youtube', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    console.log('▶ YouTube URL:', url);

    let content = '';

    try {
      const items = await YoutubeTranscript.fetchTranscript(url);
      content = items.map(i => i.text).join(' ');
      console.log('✅ Captions found');
    } catch {
      console.log('⚠️ No captions → AI inference mode');
      content = `
You are an expert teacher.
Infer and explain the full topic of this YouTube video
and generate a complete educational mind map.

Video URL:
${url}
      `;
    }

    const result = await model.generateContent([
      MIND_MAP_PROMPT,
      content.substring(0, 30000)
    ]);

    const text = result.response.text();
    const clean = text.replace(/```json|```/g, '').trim();
    const json = JSON.parse(clean);

    res.json(json);
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

// ---------------- FILE API ----------------
const handleFile = async (req, res, label) => {
  let filePath;
  try {
    if (!req.file) return res.status(400).json({ error: 'File missing' });

    filePath = path.resolve(req.file.path);

    const uploaded = await fileManager.uploadFile(filePath, {
      mimeType: req.file.mimetype,
      displayName: req.file.originalname
    });

    let file = await fileManager.getFile(uploaded.file.name);
    while (file.state === 'PROCESSING') {
      await new Promise(r => setTimeout(r, 2000));
      file = await fileManager.getFile(uploaded.file.name);
    }

    const result = await model.generateContent([
      MIND_MAP_PROMPT,
      {
        fileData: {
          fileUri: uploaded.file.uri,
          mimeType: req.file.mimetype
        }
      }
    ]);

    const text = result.response.text();
    const clean = text.replace(/```json|```/g, '').trim();
    const json = JSON.parse(clean);

    res.json(json);
    fs.unlinkSync(filePath);
  } catch {
    if (filePath) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'File analysis failed' });
  }
};

app.post('/api/analyze-video', upload.single('video'), (req, res) =>
  handleFile(req, res, 'video')
);

app.post('/api/analyze-pdf', upload.single('pdf'), (req, res) =>
  handleFile(req, res, 'pdf')
);

// ---------------- CATCH-ALL FOR FRONTEND ----------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ---------------- START ----------------
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
