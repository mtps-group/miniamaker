import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/constants'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data, error } = await supabase
      .from('prospects')
      .select(`
        *,
        channel:channels(*)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ prospects: data || [] })
  } catch (error) {
    console.error('GET prospects error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    const plan = PLANS[(profile?.plan || 'free') as keyof typeof PLANS]

    // Check prospect limit
    if (plan.maxProspects !== Infinity) {
      const { count } = await supabase
        .from('prospects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if ((count || 0) >= plan.maxProspects) {
        return NextResponse.json(
          { error: `Limite de ${plan.maxProspects} prospects atteinte`, limitReached: true },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const { channel_id, status = 'decouvert', priority = 'medium', notes, estimated_value, tags } = body

    if (!channel_id) return NextResponse.json({ error: 'channel_id requis' }, { status: 400 })

    const { data, error } = await supabase
      .from('prospects')
      .insert({
        user_id: user.id,
        channel_id,
        status,
        priority,
        notes: notes || null,
        estimated_value: estimated_value || null,
        tags: tags || [],
      })
      .select(`*, channel:channels(*)`)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ce prospect existe déjà' }, { status: 409 })
      }
      throw error
    }

    // Log activity
    await supabase.from('prospect_activities').insert({
      prospect_id: data.id,
      user_id: user.id,
      type: 'status_change',
      description: 'Prospect ajouté au pipeline',
    })

    return NextResponse.json({ prospect: data }, { status: 201 })
  } catch (error) {
    console.error('POST prospect error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const oldProspect = await supabase
      .from('prospects')
      .select('status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const { data, error } = await supabase
      .from('prospects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`*, channel:channels(*)`)
      .single()

    if (error) throw error

    // Log status change
    if (updates.status && oldProspect.data?.status !== updates.status) {
      const statusLabels: Record<string, string> = {
        decouvert: 'Découvert',
        contacte: 'Contacté',
        negociation: 'Négociation',
        client: 'Client',
        perdu: 'Perdu',
      }
      await supabase.from('prospect_activities').insert({
        prospect_id: id,
        user_id: user.id,
        type: 'status_change',
        description: `Statut changé en "${statusLabels[updates.status] || updates.status}"`,
      })
    }

    if (updates.notes) {
      await supabase.from('prospect_activities').insert({
        prospect_id: id,
        user_id: user.id,
        type: 'note',
        description: updates.notes,
      })
    }

    return NextResponse.json({ prospect: data })
  } catch (error) {
    console.error('PATCH prospect error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE prospect error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
