import Link from 'next/link'
import { connectDB } from '@/lib/mongodb'
import Salon from '@/models/Salon'

const CATEGORIES = ['Coiffure','Hammam','Spa','Onglerie','Barbier','Institut beauté','Bien-être','Esthétique']
const CITIES = ['Casablanca','Rabat','Marrakech','Fès','Tanger','Agadir','Meknès']

const CAT_EMOJI: Record<string, string> = {
  'Coiffure': '✂️', 'Hammam': '🛁', 'Spa': '💆', 'Onglerie': '💅',
  'Barbier': '🪒', 'Institut beauté': '💄', 'Bien-être': '🌿', 'Esthétique': '✨',
}

async function getFeaturedSalons() {
  await connectDB()
  return Salon.find({ active: true }).sort({ rating: -1 }).limit(6).lean()
}

export default async function HomePage() {
  const salons = await getFeaturedSalons()

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-serif text-xl">Elite<em className="text-[#C17B4E]">Booking</em></span>
          <div className="flex gap-3">
            <Link href="/auth?mode=login" className="btn-secondary text-sm">Se connecter</Link>
            <Link href="/auth?mode=register" className="btn-primary text-sm">S'inscrire</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white pt-20 pb-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-serif text-5xl mb-6 leading-tight">
            Réservez votre soin<br /><em className="text-[#C17B4E]">en quelques secondes</em>
          </h1>
          <p className="text-gray-300 text-lg mb-10">Les meilleurs salons du Maroc, disponibles 24h/24</p>
          <div className="bg-white rounded-2xl p-4 flex gap-3 shadow-2xl max-w-2xl mx-auto">
            <select className="flex-1 input text-gray-900">
              <option value="">Toutes les villes</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="flex-1 input text-gray-900">
              <option value="">Toutes les catégories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
            </select>
            <Link href="/search" className="btn-primary whitespace-nowrap">Rechercher</Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <h2 className="font-serif text-3xl text-center mb-10">Toutes les catégories</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
          {CATEGORIES.map(cat => (
            <Link href={`/search?category=${encodeURIComponent(cat)}`} key={cat}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100
                         hover:border-gray-900 hover:shadow-md transition-all text-center group">
              <span className="text-3xl">{CAT_EMOJI[cat]}</span>
              <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900">{cat}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured salons */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-3xl text-center mb-10">Salons recommandés</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {salons.map((salon: any) => (
              <Link href={`/salon/${salon._id}`} key={salon._id.toString()}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100
                           hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="h-40 bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center text-5xl">
                  {CAT_EMOJI[salon.category] || '🏪'}
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-lg mb-1">{salon.name}</h3>
                  <p className="text-sm text-gray-500">{salon.category} · {salon.city}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-amber-500 text-sm">★ {salon.rating.toFixed(1)}</span>
                    <span className="text-xs text-gray-400">({salon.reviewsCount} avis)</span>
                    <span className="ml-auto badge-green">Disponible</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/search" className="btn-secondary">Voir tous les salons →</Link>
          </div>
        </div>
      </section>

      {/* For pros */}
      <section className="py-20 px-4 bg-gray-900 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-4xl mb-4">Vous êtes un professionnel ?</h2>
          <p className="text-gray-400 mb-8">Gérez votre agenda, vos réservations et votre équipe depuis un seul endroit.</p>
          <Link href="/auth?mode=register&type=pro" className="btn-primary text-base px-8 py-3">
            Ouvrir mon espace pro gratuitement →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 px-4 text-center text-sm text-gray-400">
        <span className="font-serif text-gray-700">Elite<em className="text-[#C17B4E]">Booking</em></span>
        <p className="mt-2">© {new Date().getFullYear()} EliteBooking — La référence beauté au Maroc</p>
      </footer>
    </div>
  )
}
