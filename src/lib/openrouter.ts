const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

// ─── Text / Vision ───────────────────────────────────────────
export async function chatCompletion(
  messages: Array<{ role: string; content: unknown }>,
  model = 'anthropic/claude-sonnet-4-6',
  maxTokens = 1000,
) {
  const res = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
      'X-Title': 'MiniaMaker',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter chat error: ${err}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content as string
}

// ─── Image generation ────────────────────────────────────────
export async function generateImage(
  prompt: string,
  model = 'black-forest-labs/flux-schnell',
  width = 1792,
  height = 1024,
): Promise<string> {
  const res = await fetch(`${OPENROUTER_API_URL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
      'X-Title': 'MiniaMaker',
    },
    body: JSON.stringify({ model, prompt, n: 1, size: `${width}x${height}` }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter image error: ${err}`)
  }
  const data = await res.json()
  return data.data?.[0]?.url as string
}

// ─── Analyze a single thumbnail via vision ───────────────────
export async function analyzeThumbnail(thumbnailUrl: string, videoTitle: string) {
  const prompt = `Tu es un expert en miniatures YouTube. Analyse cette miniature pour la vidéo intitulée "${videoTitle}".

Retourne UNIQUEMENT un JSON valide avec cette structure exacte :
{
  "composition": <score 0-100>,
  "textReadability": <score 0-100>,
  "colorContrast": <score 0-100>,
  "facePresence": <true|false>,
  "score": <score global 0-100>,
  "feedback": "<une phrase d'analyse actionnable en français>"
}

Critères :
- composition : équilibre visuel, hiérarchie des éléments, utilisation de l'espace
- textReadability : lisibilité du texte, taille, contraste texte/fond
- colorContrast : impact des couleurs, contraste général, attractivité
- facePresence : y a-t-il un visage humain visible et expressif ?
- score : moyenne pondérée (composition 30%, textReadability 30%, colorContrast 25%, bonus visage 15%)
- feedback : ce qui manque et comment l'améliorer concrètement`

  const content = await chatCompletion(
    [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: thumbnailUrl } },
          { type: 'text', text: prompt },
        ],
      },
    ],
    'anthropic/claude-sonnet-4-6',
    400,
  )

  // Extract JSON from response
  const match = content.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Invalid JSON response from vision model')
  return JSON.parse(match[0]) as {
    composition: number
    textReadability: number
    colorContrast: number
    facePresence: boolean
    score: number
    feedback: string
  }
}

// ─── Generate thumbnail prompt from channel context ──────────
export async function generateThumbnailPrompt(
  channelName: string,
  videoTitle: string,
  niche: string,
  style: string,
  colors: string,
): Promise<string> {
  const content = await chatCompletion(
    [
      {
        role: 'user',
        content: `Tu es un expert en miniatures YouTube. Génère un prompt en anglais pour créer une miniature YouTube professionnelle.

Infos :
- Chaîne : ${channelName}
- Titre vidéo : ${videoTitle}
- Niche : ${niche}
- Style : ${style}
- Couleurs dominantes : ${colors}

Le prompt doit décrire : la composition, les couleurs, l'ambiance, les éléments visuels clés, le style graphique.
Le prompt doit être optimisé pour Flux/DALL-E : précis, en anglais, max 200 mots.
Retourne UNIQUEMENT le prompt, rien d'autre.`,
      },
    ],
    'anthropic/claude-sonnet-4-6',
    300,
  )
  return content.trim()
}
