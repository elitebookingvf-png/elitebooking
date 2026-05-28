import Link from 'next/link';
import { CATEGORIES, CITIES } from '@/lib/utils';

async function getFeaturedSalons() {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${base}/api/salons?limit=6`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const salons = await getFeaturedSalons();

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="serif text-xl font-bold">Elite<em style={{color:'#C17B4E',fontStyle:'normal'}}>Booking</em></span>
          <div className="flex gap-3">
            <Link href="/auth?mode=login" className="btn btn-secondary btn-sm">Se connecter</Link>
            <Link href="/auth?mode=register" className="btn btn-primary btn-sm">S'inscrire</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{background:'linear-gradient(135deg,#111 0%,#222 100%)'}} className="text-white pt-20 pb-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="serif text-5xl mb-6 leading-tight">
            Réservez votre soin<br /><em style={{color:'#C17B4E',fontStyle:'normal'}}>en quelques secondes</em>
          </h1>
          <p className="text-lg mb-10" style={{color:'#aaa'}}>Les meilleurs salons du Maroc, disponibles 24h/24</p>
          <form action="/search" method="GET"
            className="bg-white rounded-2xl p-4 flex gap-3 shadow-2xl max-w-2xl mx-auto">
            <select name="city" className="form-control flex-1" style={{color:'#111'}}>
              <option value="">Toutes les villes</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select name="category" className="form-control flex-1" style={{color:'#111'}}>
              <option value="">Toutes les catégories</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
            </select>
            <button type="submit" className="btn btn-primary" style={{whiteSpace:'nowrap'}}>Rechercher</button>
          </form>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <h2 className="serif text-3xl text-center mb-10">Toutes les catégories</h2>
        <div className="grid grid-cols-4 gap-4" style={{gridTemplateColumns:'repeat(7,1fr)'}}>
          {CATEGORIES.map(cat => (
            <Link href={`/search?category=${cat.id}`} key={cat.id}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100
                         hover:border-gray-900 hover:shadow-md transition-all text-center group"
              style={{textDecoration:'none',color:'inherit'}}>
              <span style={{fontSize:'2rem'}}>{cat.emoji}</span>
              <span style={{fontSize:'0.75rem',fontWeight:500,color:'#666'}}>{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured salons */}
      <section className="py-16 px-4" style={{background:'#f7f7f7'}}>
        <div className="max-w-7xl mx-auto">
          <h2 className="serif text-3xl text-center mb-10">Salons recommandés</h2>
          {salons.length > 0 ? (
            <div className="grid grid-cols-1 gap-6" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
              {salons.map((salon: any) => {
                const cat = CATEGORIES.find(c => c.id === salon.category);
                return (
                  <Link href={`/salon/${salon.id}`} key={salon.id}
                    style={{textDecoration:'none',color:'inherit'}}
                    className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 block">
                    <div className="h-40 flex items-center justify-center text-5xl"
                      style={{background:'linear-gradient(135deg,#fef3e8,#fde8c8)'}}>
                      {cat?.emoji || '🏪'}
                    </div>
                    <div className="p-5">
                      <h3 style={{fontWeight:600,fontSize:'1.1rem',marginBottom:4}}>{salon.name}</h3>
                      <p style={{fontSize:'0.85rem',color:'#888'}}>{cat?.label || salon.category} · {salon.city}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span style={{color:'#f59e0b',fontSize:'0.85rem'}}>★ {Number(salon.rating).toFixed(1)}</span>
                        <span className="badge badge-green ml-auto">Disponible</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-center" style={{color:'#888'}}>Connectez Supabase pour voir les salons.</p>
          )}
          <div className="text-center mt-8">
            <Link href="/search" className="btn btn-secondary">Voir tous les salons →</Link>
          </div>
        </div>
      </section>

      {/* For pros */}
      <section className="py-20 px-4 text-white text-center" style={{background:'#111'}}>
        <div className="max-w-2xl mx-auto">
          <h2 className="serif text-4xl mb-4">Vous êtes un professionnel ?</h2>
          <p className="mb-8" style={{color:'#aaa'}}>Gérez votre agenda, vos réservations et votre équipe depuis un seul endroit.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/auth?mode=register&type=pro" className="btn btn-primary btn-lg">
              Ouvrir mon espace pro gratuitement →
            </Link>
            <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP || '212600000000'}`}
              target="_blank" rel="noopener noreferrer"
              className="btn btn-secondary btn-lg" style={{background:'#25D366',color:'#fff',borderColor:'#25D366'}}>
              💬 WhatsApp support
            </a>
          </div>
          <div className="grid gap-4 mt-12" style={{gridTemplateColumns:'repeat(5,1fr)'}}>
            {['Agenda intelligent','Multi-prestations','Gestion équipe','Statistiques','14j gratuits'].map(a => (
              <div key={a} className="p-4 rounded-2xl" style={{background:'rgba(255,255,255,0.07)'}}>
                <div style={{fontSize:'0.82rem',fontWeight:500,color:'#fff'}}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-8 px-4 text-center" style={{borderColor:'#eee',fontSize:'0.85rem',color:'#aaa'}}>
        <span className="serif" style={{color:'#333',fontWeight:700}}>Elite<em style={{color:'#C17B4E',fontStyle:'normal'}}>Booking</em></span>
        <p className="mt-2">© {new Date().getFullYear()} EliteBooking — La référence beauté au Maroc</p>
      </footer>
    </div>
  );
}
