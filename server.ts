import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // 1. Analyze an uploaded garment photo or text description and generate 3 complete outfit plans
  app.post('/api/stylist/analyze', async (req, res) => {
    try {
      const { imageBase64, mimeType, garmentTitle, garmentNotes } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        garmentTitle?: string;
        garmentNotes?: string;
      };

      const ai = getAiClient();
      const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];

      if (imageBase64 && mimeType) {
        parts.push({
          inlineData: {
            data: imageBase64.replace(/^data:[^;]+;base64,/, ''),
            mimeType,
          },
        });
      }

      parts.push({
        text: `You are an elite fashion director and color-theory stylist. Analyze this difficult-to-match garment (${
          garmentTitle || 'Uploaded Anchor Piece'
        }${garmentNotes ? ` — ${garmentNotes}` : ''}).
Extract its 5-swatch color palette (with exact hex codes and proportions summing to 100), identify why it is challenging to style, and design 3 complete, distinct flat-lay outfit options for "Casual", "Business", and "Night Out" featuring this exact anchor garment.
Each outfit must include 5 pieces (including the Anchor Garment first, plus Top / Layer, Outerwear / Tailoring or secondary piece, Footwear, Bag / Carry, and Jewelry / Accessory) and a detailed overhead knolling flat-lay photography prompt.`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              silhouette: { type: Type.STRING },
              fabricAndTexture: { type: Type.STRING },
              patternComplexity: {
                type: Type.STRING,
                description:
                  'One of: "High — Multi-Hue Motif", "Medium — Geometric / Woven", "Low — Tonal Texture"',
              },
              seasonality: { type: Type.STRING },
              versatilityScore: { type: Type.INTEGER },
              stylingChallenge: { type: Type.STRING },
              stylistVerdict: { type: Type.STRING },
              palette: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    hex: { type: Type.STRING },
                    name: { type: Type.STRING },
                    role: {
                      type: Type.STRING,
                      description:
                        'One of: "Dominant", "Secondary", "Accent", "Neutral Base", "Metallic/Highlight"',
                    },
                    proportion: { type: Type.INTEGER },
                  },
                },
              },
              outfits: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    occasion: {
                      type: Type.STRING,
                      description: 'Exactly one of: "Casual", "Business", "Night Out"',
                    },
                    editorialTitle: { type: Type.STRING },
                    subtitle: { type: Type.STRING },
                    dressCode: { type: Type.STRING },
                    colorHarmonyStrategy: { type: Type.STRING },
                    stylistRationale: { type: Type.STRING },
                    flatLayPrompt: { type: Type.STRING },
                    harmonySwatches: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    pieces: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          category: {
                            type: Type.STRING,
                            description:
                              'One of: "Anchor Garment", "Top / Layer", "Outerwear / Tailoring", "Footwear", "Bag / Carry", "Jewelry / Accessory"',
                          },
                          name: { type: Type.STRING },
                          colorName: { type: Type.STRING },
                          colorHex: { type: Type.STRING },
                          material: { type: Type.STRING },
                          stylingNote: { type: Type.STRING },
                          isAnchor: { type: Type.BOOLEAN },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({ ok: true, analysis: parsed });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to analyze garment with Gemini API.';
      res.status(200).json({
        ok: false,
        fallback: true,
        error: message,
      });
    }
  });

  // 2. Create or Edit a Flat-Lay Image or Garment Image using gemini-nano-banana-2.1
  app.post('/api/stylist/image-banana', async (req, res) => {
    try {
      const {
        prompt,
        referenceImageBase64,
        referenceMimeType,
        aspectRatio = '3:4',
        imageSize = '1K',
        useGoogleSearch = false,
      } = req.body as {
        prompt: string;
        referenceImageBase64?: string;
        referenceMimeType?: string;
        aspectRatio?: string;
        imageSize?: string;
        useGoogleSearch?: boolean;
      };

      if (!prompt || !prompt.trim()) {
        res.status(400).json({ ok: false, error: 'A text prompt is required.' });
        return;
      }

      const ai = getAiClient();
      const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];

      if (referenceImageBase64 && referenceMimeType) {
        const cleanData = referenceImageBase64.replace(/^data:[^;]+;base64,/, '');
        parts.push({
          inlineData: {
            data: cleanData,
            mimeType: referenceMimeType,
          },
        });
      }

      parts.push({
        text: prompt.trim(),
      });

      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize,
          },
          ...(useGoogleSearch
            ? {
                tools: [
                  {
                    googleSearch: {
                      searchTypes: {
                        webSearch: {},
                        imageSearch: {},
                      },
                    },
                  },
                ],
              }
            : {}),
        },
      });

      let generatedImageUrl: string | null = null;
      let accompanyingText = '';

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const base64EncodeString = part.inlineData.data;
          const mime = part.inlineData.mimeType ?? 'image/png';
          generatedImageUrl = `data:${mime};base64,${base64EncodeString}`;
        } else if (part.text) {
          accompanyingText += part.text;
        }
      }

      if (!generatedImageUrl) {
        res.status(200).json({
          ok: false,
          fallback: true,
          error: 'No image data returned by gemini-nano-banana-2.1.',
          text: accompanyingText,
        });
        return;
      }

      res.json({
        ok: true,
        imageUrl: generatedImageUrl,
        text: accompanyingText,
        modelUsed: 'gemini-nano-banana-2.1',
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate or edit image with gemini-nano-banana-2.1.';
      res.status(200).json({
        ok: false,
        fallback: true,
        error: message,
        modelUsed: 'gemini-nano-banana-2.1 (Studio Composite Fallback)',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Atelier Flat-Lay server listening on http://localhost:${PORT}`);
  });
}

startServer();
