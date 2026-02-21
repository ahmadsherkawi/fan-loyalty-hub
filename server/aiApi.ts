// Vite Server Plugin for AI API Routes
// This allows the AI endpoints to work in both development and preview environments

import type { Plugin, ViteDevServer } from 'vite';
import ZAI from 'z-ai-web-dev-sdk';

interface AIRequest {
  prompt: string;
  context?: Record<string, unknown>;
}

export function aiApiPlugin(): Plugin {
  return {
    name: 'ai-api-plugin',
    configureServer(server: ViteDevServer) {
      // Handle AI chant generation
      server.middlewares.use('/api/ai/generate-chant', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const body: AIRequest = await parseBody(req);
          
          if (!body.prompt) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Prompt is required' }));
            return;
          }

          const zai = await ZAI.create();

          const systemPrompt = `You are an expert football chant creator. Generate authentic, passionate fan chants that:
- Are rhythmic and easy to sing
- Use football terrace culture language
- Can include club colors, player names, or special occasions
- Are family-friendly but passionate
- Typically 4-8 lines
- Include a mood: celebratory, defiant, supportive, humorous, or passionate
- Suggest relevant hashtags

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "content": "the chant lyrics",
  "mood": "celebratory|defiant|supportive|humorous|passionate",
  "suggestedHashtags": ["#hashtag1", "#hashtag2"]
}`;

          const completion = await zai.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: body.prompt }
            ],
            temperature: 0.8,
            max_tokens: 500,
          });

          const responseContent = completion.choices[0]?.message?.content;
          
          if (!responseContent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'No response from AI' }));
            return;
          }

          // Parse the JSON response
          let cleanedContent = responseContent.trim();
          if (cleanedContent.startsWith('```json')) {
            cleanedContent = cleanedContent.slice(7);
          }
          if (cleanedContent.startsWith('```')) {
            cleanedContent = cleanedContent.slice(3);
          }
          if (cleanedContent.endsWith('```')) {
            cleanedContent = cleanedContent.slice(0, -3);
          }
          cleanedContent = cleanedContent.trim();
          
          try {
            const chantData = JSON.parse(cleanedContent);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              content: chantData.content,
              mood: chantData.mood || 'passionate',
              suggestedHashtags: chantData.suggestedHashtags || [],
              context: body.context,
            }));
          } catch {
            // If parsing fails, return the raw content as a chant
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              content: responseContent,
              mood: 'passionate',
              suggestedHashtags: [],
              context: body.context,
            }));
          }
        } catch (error) {
          console.error('Chant generation error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to generate chant' }));
        }
      });

      // Handle AI prediction generation
      server.middlewares.use('/api/ai/generate-prediction', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const body = await parseBody(req);
          
          if (!body.match) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Match data is required' }));
            return;
          }

          const zai = await ZAI.create();

          const systemPrompt = `You are a football match prediction expert. Analyze matches and provide predictions.
Consider team form, head-to-head records, home advantage, and current standings.
Provide predictions in JSON format with confidence levels.`;

          const completion = await zai.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Predict the outcome for this match: ${JSON.stringify(body.match)}` }
            ],
            temperature: 0.6,
            max_tokens: 500,
          });

          const responseContent = completion.choices[0]?.message?.content;
          
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            prediction: responseContent,
            match: body.match,
          }));
        } catch (error) {
          console.error('Prediction generation error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to generate prediction' }));
        }
      });

      // Handle AI recommendations generation
      server.middlewares.use('/api/ai/generate-recommendations', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const body = await parseBody(req);
          
          if (!body.fanProfile) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Fan profile is required' }));
            return;
          }

          const zai = await ZAI.create();

          const systemPrompt = `You are a fan engagement expert for a football loyalty platform.
Generate personalized recommendations for fans based on their profile, preferences, and activity.
Provide actionable suggestions to improve their fan experience.`;

          const completion = await zai.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Generate recommendations for this fan: ${JSON.stringify(body.fanProfile)}` }
            ],
            temperature: 0.7,
            max_tokens: 800,
          });

          const responseContent = completion.choices[0]?.message?.content;
          
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            recommendations: responseContent,
            fanProfile: body.fanProfile,
          }));
        } catch (error) {
          console.error('Recommendations generation error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to generate recommendations' }));
        }
      });
    }
  };
}

// Helper to parse request body
async function parseBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: string) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export default aiApiPlugin;
