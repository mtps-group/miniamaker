import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { ImageIcon, ExternalLink } from 'lucide-react'
import { NICHE_LABELS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PublicPortfolioPage({ params }: Props) {
  const { slug } = await params
  const supabase = createAdminClient()

  // Get profile by portfolio slug
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, portfolio_public')
    .eq('portfolio_slug', slug)
    .single()

  if (!profile || !profile.portfolio_public) {
    notFound()
  }

  // Get portfolio items
  const { data: items } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('user_id', profile.id)
    .eq('is_visible', true)
    .order('position')

  const displayName = profile.full_name || profile.email?.split('@')[0] || 'Miniamaker'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm uppercase">
              {displayName.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">Miniamaker YouTube</p>
            </div>
          </div>
          <a
            href="/"
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <span>MiniaMaker</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-50 to-purple-50 py-16 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            Portfolio de <span className="text-indigo-600">{displayName}</span>
          </h1>
          <p className="text-lg text-gray-600">
            Miniatures YouTube créatives qui convertissent et captivent
          </p>
        </div>
      </section>

      {/* Portfolio Grid */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {!items || items.length === 0 ? (
          <div className="text-center py-24">
            <ImageIcon className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Ce portfolio est vide pour le moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item) => (
              <div
                key={item.id}
                className="group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
              >
                {/* After image (main) */}
                <div className="aspect-video bg-gray-100 overflow-hidden relative">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  {/* Before badge if available */}
                  {item.before_image_url && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 bg-black/60 text-white text-[10px] font-semibold rounded-full uppercase tracking-wide">
                        Après
                      </span>
                    </div>
                  )}
                </div>

                {/* Before image (small preview) */}
                {item.before_image_url && (
                  <div className="h-24 bg-gray-50 overflow-hidden relative border-t border-gray-100">
                    <div className="absolute top-1 left-2">
                      <span className="px-2 py-0.5 bg-black/40 text-white text-[10px] font-semibold rounded-full uppercase tracking-wide">
                        Avant
                      </span>
                    </div>
                    <img
                      src={item.before_image_url}
                      alt={`Avant - ${item.title}`}
                      className="w-full h-full object-cover opacity-80"
                    />
                  </div>
                )}

                {/* Info */}
                <div className="p-4">
                  <p className="font-semibold text-gray-900 text-sm truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.client_name && (
                      <span className="text-xs text-gray-500 truncate">{item.client_name}</span>
                    )}
                    {item.category && (
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                        {NICHE_LABELS[item.category] || item.category}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{item.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* CTA Footer */}
      <section className="border-t border-gray-200 py-12 text-center bg-white">
        <p className="text-gray-500 text-sm mb-2">Vous cherchez un miniamaker ?</p>
        <p className="text-lg font-bold text-gray-900 mb-4">Contactez {displayName}</p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          Propulsé par MiniaMaker
        </a>
      </section>
    </div>
  )
}
