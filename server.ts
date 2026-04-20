import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure tmp directory exists
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const upload = multer({ dest: tmpDir });

  app.use(express.json());

  // API Route for Transcribing Video
  app.post('/api/transcribe', upload.single('videoFile'), async (req, res) => {
    let localFilePath = '';
    let isFileDownloaded = false;

    try {
      const { videoUrl, apiKey } = req.body;
      const file = req.file;

      if (!apiKey) {
        return res.status(400).json({ error: 'Please provide a valid Gemini API key.' });
      }

      if (!videoUrl && !file) {
        return res.status(400).json({ error: 'Please provide either a video file or a video URL.' });
      }

      // Initialize Gemini SDK with the user-provided key.
      const ai = new GoogleGenAI({ apiKey: apiKey });

      if (file) {
        localFilePath = file.path;
      } else if (videoUrl) {
        // Download video from URL
        localFilePath = path.join(tmpDir, `${uuidv4()}.mp4`);
        isFileDownloaded = true;
        const writer = fs.createWriteStream(localFilePath);
        const response = await axios({
          url: videoUrl,
          method: 'GET',
          responseType: 'stream',
        });
        
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on('finish', () => resolve(true));
          writer.on('error', reject);
        });
      }

      console.log(`Uploading file to Gemini: ${localFilePath}`);

      // Upload file to Gemini
      const uploadResponse = await ai.files.upload({
        file: localFilePath,
        config: {
          mimeType: file ? file.mimetype : 'video/mp4',
        }
      });

      console.log(`Uploaded to Gemini: ${uploadResponse.name}`);

      // Wait for the video processing to complete
      let fileStatus = await ai.files.get({ name: uploadResponse.name });
      while (fileStatus.state === 'PROCESSING') {
        process.stdout.write('.');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        fileStatus = await ai.files.get({ name: uploadResponse.name });
      }

      if (fileStatus.state === 'FAILED') {
        throw new Error('Video processing failed in Gemini.');
      }

      console.log('Video ready. Extracting transcript...');

      const prompt = `You are a professional video transcriber and translator.
Transcribe the exact audio of this video.
Output the full transcript accurately in Myanmar (Burmese) language.
If the original audio is in English or another language, translate it directly into Myanmar (Burmese) language.
Do NOT include any extra conversational text like "Here is the transcript". Only provide the raw transcript.`;

      const result = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
           fileStatus,
           prompt
        ],
      });

      const transcript = result.text;

      // Clean up file in Gemini
      try {
        await ai.files.delete({ name: uploadResponse.name });
      } catch (err) {
        console.error('Failed to clean up Gemini file:', err);
      }

      res.json({ transcript });
    } catch (error: any) {
      console.error('Transcription error:', error);
      let errorMessage = error.message || 'An error occurred during transcription.';
      
      // Parse specific Gemini API errors
      if (errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY_INVALID')) {
        errorMessage = 'Invalid Gemini API key. Please check your API key settings in AI Studio secrets.';
      }
      
      res.status(500).json({ error: errorMessage });
    } finally {
      // Clean up local temp file
      if (localFilePath && fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // In Express 4, we use *
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
