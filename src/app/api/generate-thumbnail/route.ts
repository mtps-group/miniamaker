import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/constants'
import { generateImage, generateThumbnailPrompt } from '@/lib/openrouter'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
    const plan = PLANS[(profile?.plan || 'free') as keyof typeof PLANS]

    if (!plan.hasAnalysis) {
      return NextResponse.json({ error: 'Fonctionnalité réservée au plan Business' }, { status: 403 })
    }

    const { channelName, videoTitle, niche, style, colors, model } = await request.json()

    if (!videoTitle?.trim()) {
      return NextResponse.json({ error: 'Titre de la vidéo requis' }, { status: 400 })
    }

    // Generate optimized prompt via Claude
    const optimizedPrompt = await generateThumbnailPrompt(
      channelName || 'YouTube Channel',
      videoTitle,
      niche || 'général',
      style || 'impactant et accrocheur',
      colors || 'rouge et noir',
    )

    // Add YouTube thumbnail specific instructions to the prompt
    const finalPrompt = `YouTube thumbnail, ${optimizedPrompt}, 16:9 ratio, high quality, professional design, eye-catching, vibrant colors, no watermark`

    // Generate image via OpenRouter
    const imageModel = model || 'black-forest-labs/flux-schnell'
    const imageUrl = await generateImage(finalPrompt, imageModel, 1792, 1024)

    return NextResponse.json({
      imageUrl,
      prompt: finalPrompt,
      model: imageModel,
    })
  } catch (error) {
    console.error('Generate thumbnail error:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération' }, { status: 500 })
  }
}
