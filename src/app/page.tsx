import Link from 'next/link';
import { CATEGORIES, CITIES } from '@/lib/utils';
import FeaturedSalons from '@/components/FeaturedSalons';
import NavBar from '@/components/NavBar';
import { createClient } from '@/lib/supabase/server';

async function getFeaturedSalons() {
  try {
    const supabase = createClient();
    const { data } = await supabase.from('salons').select('*').eq('active', true).order('rating', { ascending: false }).limit(12);
    return data ?? [];
  } catch {
    return [];
  }
}

async function getStats() {
  try {
    const supabase = createClient();
    const { count } = await supabase.from('salons').select('*', { count: 'exact', head: true }).eq('active', true);
    return { salons: count ?? 0 };
  } catch {
    return { salons: 0 };
  }
}

export default async function HomePage() {
  const [salons, stats] = await Promise.all([getFeaturedSalons(), getStats()]);
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP || '212600000000';

  return (
    <div className="min-h-screen" style={{fontFamily:"'DM Sans',system-ui,sans-serif"}}>

      {/* ── NAV ── */}
      <NavBar />

      {/* ── HERO ── */}
      <div style={{minHeight:'calc(100vh - 64px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',position:'relative',overflow:'hidden',background:'#fff'}}>
        <div style={{position:'absolute',inset:0,background:"linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.65) 55%,#fff 100%),url('https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&q=80') center/cover no-repeat",zIndex:0}} />
        <div style={{position:'relative',zIndex:1,maxWidth:700,padding:'0 24px'}}>
          <span className="hero-eyebrow">🇲🇦 La beauté marocaine</span>
          <h1 className="serif hero-h1">
            Réservez vos soins<br /><em style={{fontStyle:'italic',color:'#C17B4E'}}>en quelques secondes</em>
          </h1>
          <p className="hero-sub">Coiffeurs, hammams, spas, instituts — les meilleurs établissements du Maroc disponibles en ligne, 24h/24.</p>

          <form action="/search" method="GET" className="hero-search-bar">
            <div style={{flex:1,display:'flex',flexDirection:'column',padding:'4px 12px'}}>
              <label style={{fontSize:'0.62rem',fontWeight:700,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.06em'}}>Prestation</label>
              <input name="q" type="text" placeholder="Coiffure, hammam, massage…" style={{border:'none',outline:'none',fontSize:'0.88rem',color:'#111',background:'transparent',width:'100%'}} />
            </div>
            <div style={{width:1,height:32,background:'#e5e5e5',flexShrink:0}} />
            <div style={{flex:1,display:'flex',flexDirection:'column',padding:'4px 12px'}}>
              <label style={{fontSize:'0.62rem',fontWeight:700,color:'#aaa',textTransform:'uppercase',letterSpacing:'0.06em'}}>Ville</label>
              <select name="city" style={{border:'none',outline:'none',fontSize:'0.88rem',color:'#111',background:'transparent',cursor:'pointer',width:'100%'}}>
                <option value="">Toutes les villes</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button type="submit" style={{background:'#111',color:'#fff',border:'none',borderRadius:10,padding:'12px 22px',fontSize:'0.85rem',fontWeight:500,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
              Rechercher →
            </button>
          </form>

          <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',marginTop:18}}>
            {CATEGORIES.slice(0,5).map(c => (
              <Link key={c.id} href={`/search?category=${c.id}`}
                style={{fontSize:'0.78rem',color:'#555',background:'#f5f5f5',borderRadius:20,padding:'6px 14px',textDecoration:'none',transition:'all 0.2s'}}
                className="hero-tag">
                {c.emoji} {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="stats-bar" style={{display:'flex',justifyContent:'center',gap:56,borderTop:'1px solid #efefef',borderBottom:'1px solid #efefef',background:'#fafafa',flexWrap:'wrap'}}>
        {[
          { n: stats.salons > 0 ? `${stats.salons}+` : '500+', l: 'Établissements partenaires' },
          { n: '12K+', l: 'Réservations effectuées' },
          { n: '4.9★', l: 'Note moyenne clients' },
          { n: '7', l: 'Villes couvertes' },
        ].map(s => (
          <div key={s.l} style={{textAlign:'center'}}>
            <span className="serif" style={{fontSize:'1.9rem',display:'block'}}>{s.n}</span>
            <span style={{fontSize:'0.78rem',color:'#888'}}>{s.l}</span>
          </div>
        ))}
      </div>

      {/* ── CATEGORIES ── */}
      <div style={{padding:'80px 40px',textAlign:'center'}}>
        <div style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#C17B4E',marginBottom:12}}>Explorer</div>
        <h2 className="serif" style={{fontSize:'clamp(1.8rem,3vw,2.6rem)',marginBottom:40}}>
          Tous vos soins,<br /><em style={{fontStyle:'italic'}}>une seule plateforme</em>
        </h2>
        <div style={{display:'flex',justifyContent:'center',gap:10,flexWrap:'wrap',maxWidth:900,margin:'0 auto'}}>
          {CATEGORIES.map(cat => (
            <Link key={cat.id} href={`/search?category=${cat.id}`}
              style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'20px 16px',borderRadius:14,border:'1.5px solid #efefef',width:120,textDecoration:'none',color:'inherit',transition:'all 0.25s',background:'#fff'}}
              className="cat-pill">
              <span style={{fontSize:'1.7rem'}}>{cat.emoji}</span>
              <span style={{fontSize:'0.75rem',fontWeight:500,color:'#333',textAlign:'center'}}>{cat.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── FEATURED SALONS (client component for city filter) ── */}
      <div style={{background:'#fafafa',padding:'0 40px 80px'}}>
        <FeaturedSalons salons={salons} cities={CITIES} />
      </div>

      {/* ── HOW IT WORKS ── */}
      <div id="how" style={{padding:'80px 40px',textAlign:'center'}}>
        <div style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#C17B4E',marginBottom:12}}>Simple & rapide</div>
        <h2 className="serif" style={{fontSize:'clamp(1.8rem,3vw,2.6rem)',marginBottom:52}}>
          Réservez en <em style={{fontStyle:'italic'}}>3 étapes</em>
        </h2>
        <div className="steps-grid-wrap" style={{gap:36,maxWidth:820,margin:'0 auto'}}>
          {[
            { n:'1', t:'Trouvez votre salon', p:'Recherchez par ville, type de soin ou établissement. Consultez photos, avis et tarifs.' },
            { n:'2', t:'Choisissez un créneau', p:'Sélectionnez la prestation, l\'employé et l\'horaire. Confirmation instantanée.' },
            { n:'3', t:'Profitez de votre soin', p:'Recevez un rappel avant votre RDV et vivez une expérience beauté d\'exception.' },
          ].map(s => (
            <div key={s.n} className="step-card" style={{textAlign:'center'}}>
              <div style={{width:44,height:44,borderRadius:'50%',border:'1.5px solid #111',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',transition:'all 0.3s'}}>
                <span className="serif" style={{fontSize:'1.1rem'}}>{s.n}</span>
              </div>
              <h4 style={{fontSize:'0.95rem',fontWeight:600,marginBottom:6}}>{s.t}</h4>
              <p style={{fontSize:'0.82rem',color:'#777',lineHeight:1.65,fontWeight:300}}>{s.p}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRO SECTION ── */}
      <div id="pro-section" style={{background:'#111',color:'#fff',padding:'80px 40px'}}>
        <div className="pro-section-grid" style={{gap:64,alignItems:'center',maxWidth:1000,margin:'0 auto'}}>
          <div>
            <div style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#C17B4E',marginBottom:12}}>Espace professionnels</div>
            <h2 className="serif" style={{fontSize:'clamp(1.8rem,3vw,2.6rem)',color:'#fff',marginBottom:12}}>
              Développez<br />votre <em style={{fontStyle:'italic'}}>salon</em>
            </h2>
            <p style={{color:'rgba(255,255,255,0.55)',fontSize:'0.92rem',lineHeight:1.7,fontWeight:300,marginBottom:32}}>
              Rejoignez des centaines de professionnels qui font confiance à EliteBooking pour remplir leur agenda et fidéliser leurs clients.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:0,borderTop:'1px solid rgba(255,255,255,0.1)'}}>
              {[
                { icon:'📅', t:'Agenda en ligne 24h/24', p:'Vos clients réservent à toute heure, sans appel.' },
                { icon:'📊', t:'Analytics en temps réel', p:'Suivez revenus, taux de remplissage et clients.' },
                { icon:'👥', t:'Gestion des employés', p:'Assignez les RDV à vos collaborateurs.' },
                { icon:'🔔', t:'Rappels automatiques', p:'Réduisez les no-shows grâce aux rappels.' },
              ].map(f => (
                <div key={f.t} style={{display:'flex',gap:14,padding:'16px 0',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                  <span style={{fontSize:'1.1rem'}}>{f.icon}</span>
                  <div>
                    <div style={{fontSize:'0.88rem',fontWeight:600,marginBottom:2}}>{f.t}</div>
                    <div style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.45)'}}>{f.p}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:10,marginTop:28,flexWrap:'wrap'}}>
              <Link href="/auth?mode=register&type=pro" className="btn btn-lg" style={{background:'#fff',color:'#111'}}>
                Rejoindre EliteBooking →
              </Link>
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"
                style={{display:'inline-flex',alignItems:'center',gap:8,background:'#25D366',color:'#fff',padding:'12px 22px',borderRadius:12,fontSize:'0.88rem',fontWeight:600,textDecoration:'none'}}>
                💬 Support WhatsApp
              </a>
            </div>
          </div>
          <div style={{background:'#1a1a1a',borderRadius:18,padding:22,border:'1px solid rgba(255,255,255,0.08)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <span style={{fontSize:'0.82rem',fontWeight:600}}>Tableau de bord</span>
              <span style={{fontSize:'0.68rem',color:'rgba(255,255,255,0.35)'}}>Ce mois</span>
            </div>
            <div className="auto-grid-sm" style={{marginBottom:18}}>
              {[{v:'142',l:'RDV',c:'↑ +18%'},{v:'24K',l:'MAD',c:'↑ +23%'},{v:'4.9',l:'Note',c:'★ Top 5%'}].map(k=>(
                <div key={k.l} style={{background:'rgba(255,255,255,0.05)',borderRadius:10,padding:12}}>
                  <span className="serif" style={{fontSize:'1.4rem',display:'block'}}>{k.v}</span>
                  <span style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.35)',textTransform:'uppercase'}}>{k.l}</span>
                  <span style={{fontSize:'0.65rem',color:'#6fcf97',display:'block',marginTop:4}}>{k.c}</span>
                </div>
              ))}
            </div>
            <div style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Réservations cette semaine</div>
            <div style={{display:'flex',gap:5,alignItems:'flex-end',height:52}}>
              {[{h:'40%',d:'Lu'},{h:'65%',d:'Ma'},{h:'50%',d:'Me'},{h:'85%',d:'Je',gold:true},{h:'95%',d:'Ve'},{h:'70%',d:'Sa'},{h:'25%',d:'Di'}].map(b=>(
                <div key={b.d} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center'}}>
                  <div style={{width:'100%',height:b.h,background:b.gold?'#C17B4E':'rgba(255,255,255,0.12)',borderRadius:'3px 3px 0 0'}} />
                  <div style={{fontSize:'0.5rem',color:'rgba(255,255,255,0.3)',marginTop:3}}>{b.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FREE TRIAL ── */}
      <div style={{padding:'80px 40px',background:'linear-gradient(135deg,#fff8f2 0%,#fff 60%)'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:48}}>
            <span style={{display:'inline-block',background:'#C17B4E',color:'#fff',fontSize:'0.75rem',fontWeight:700,padding:'5px 14px',borderRadius:20,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>Offre de lancement</span>
            <h2 className="serif" style={{fontSize:'clamp(1.8rem,3vw,2.6rem)',marginBottom:8}}>
              Essai gratuit<br /><em style={{fontStyle:'italic'}}>14 jours</em> pour les professionnels
            </h2>
            <p style={{color:'#888',fontSize:'0.92rem',marginBottom:16}}>Aucune carte bancaire requise · Annulation à tout moment</p>
            <Link href="/auth?mode=register&type=pro" className="btn btn-lg" style={{marginTop:8}}>Démarrer mon essai gratuit →</Link>
          </div>
          <div className="featured-grid" style={{gap:16}}>
            {[
              { icon:'📵', t:'Fini les appels manqués', p:'Vos clients réservent seuls, 24h/24 et 7j/7, même la nuit et le week-end.' },
              { icon:'💰', t:'Augmentez votre CA', p:'Nos salons partenaires reportent en moyenne +28% de revenus dès le 1er mois.' },
              { icon:'🗓', t:'Agenda intelligent', p:'Vue par employé, gestion des blocages, horaires d\'ouverture. Tout en un seul endroit.' },
              { icon:'👥', t:'Fidélisez vos clients', p:'Fiches clients complètes, historique des visites, panier moyen. Connaissez votre clientèle.' },
            ].map(f => (
              <div key={f.t} style={{display:'flex',gap:16,alignItems:'flex-start',padding:22,background:'#fff',borderRadius:16,border:'1.5px solid #f0e0d0',boxShadow:'0 2px 12px rgba(193,123,78,0.07)'}}>
                <div style={{width:40,height:40,borderRadius:12,background:'#fff3eb',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',flexShrink:0}}>{f.icon}</div>
                <div>
                  <div style={{fontWeight:700,marginBottom:4}}>{f.t}</div>
                  <div style={{fontSize:'0.82rem',color:'#888'}}>{f.p}</div>
                </div>
              </div>
            ))}
            <div style={{display:'flex',gap:16,alignItems:'flex-start',padding:22,background:'#fff',borderRadius:16,border:'1.5px solid #f0e0d0',boxShadow:'0 2px 12px rgba(193,123,78,0.07)',gridColumn:'1/-1'}}>
              <div style={{width:40,height:40,borderRadius:12,background:'#25D366',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',flexShrink:0}}>💬</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,marginBottom:4}}>Support WhatsApp dédié</div>
                <div style={{fontSize:'0.82rem',color:'#888'}}>Notre équipe répond en moins d'1h sur WhatsApp. Installation, formation, questions : on est là.</div>
              </div>
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"
                style={{display:'inline-flex',alignItems:'center',gap:8,background:'#25D366',color:'#fff',padding:'10px 18px',borderRadius:10,fontSize:'0.82rem',fontWeight:600,textDecoration:'none',whiteSpace:'nowrap',flexShrink:0}}>
                Nous contacter
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── TESTIMONIALS ── */}
      <div style={{padding:'80px 40px'}}>
        <div style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#C17B4E',marginBottom:12}}>Témoignages</div>
        <h2 className="serif" style={{fontSize:'clamp(1.8rem,3vw,2.6rem)',marginBottom:44}}>
          Ce que disent <em style={{fontStyle:'italic'}}>nos utilisateurs</em>
        </h2>
        <div className="testi-grid-wrap" style={{gap:18}}>
          {[
            { stars:'★★★★★', text:'"EliteBooking m\'a changé la vie. Mon agenda est plein, je ne réponds plus au téléphone pour prendre des RDV."', av:'👩', name:'Fatima Z.', role:'Gérante · Beldi Spa, Casa' },
            { stars:'★★★★★', text:'"Enfin une app 100% marocaine. Je réserve mon hammam en 30 secondes depuis mon canapé. Parfait."', av:'👨', name:'Karim M.', role:'Client · Rabat' },
            { stars:'★★★★★', text:'"Les analytics m\'ont permis de comprendre mon activité. +30% de CA en 3 mois. Je recommande à 100%."', av:'👩', name:'Nadia B.', role:'Gérante · Riad Wellness, Marrakech' },
          ].map(t => (
            <div key={t.name} style={{padding:24,border:'1.5px solid #efefef',borderRadius:14,transition:'all 0.3s'}} className="testi-card">
              <div style={{color:'#C17B4E',fontSize:'0.72rem',marginBottom:12}}>{t.stars}</div>
              <div style={{fontSize:'0.85rem',color:'#333',lineHeight:1.7,marginBottom:18,fontStyle:'italic',fontWeight:300}}>{t.text}</div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:34,height:34,borderRadius:'50%',background:'#fafafa',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.9rem',flexShrink:0}}>{t.av}</div>
                <div>
                  <div style={{fontSize:'0.8rem',fontWeight:600}}>{t.name}</div>
                  <div style={{fontSize:'0.7rem',color:'#888'}}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DUAL CTA ── */}
      <div style={{background:'#111',color:'#fff',textAlign:'center',padding:'80px 40px'}}>
        <h2 className="serif" style={{fontSize:'clamp(1.8rem,3vw,2.6rem)',color:'#fff',maxWidth:520,margin:'0 auto 12px'}}>
          Prêt à réserver<br /><em style={{fontStyle:'italic'}}>votre prochain soin ?</em>
        </h2>
        <p style={{color:'rgba(255,255,255,0.55)',margin:'12px auto 32px',fontSize:'0.92rem'}}>Gratuit pour les clients. Inscription en 2 minutes.</p>
        <div style={{display:'flex',justifyContent:'center',gap:12,flexWrap:'wrap'}}>
          <Link href="/auth?mode=register" className="btn btn-lg" style={{background:'#fff',color:'#111'}}>Je suis client</Link>
          <Link href="/auth?mode=register&type=pro" className="btn btn-lg btn-secondary" style={{borderColor:'rgba(255,255,255,0.25)',color:'#fff',background:'transparent'}}>Je suis professionnel →</Link>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="footer-grid" style={{padding:'52px 40px 32px',display:'grid',gap:40,borderTop:'1px solid #efefef'}}>
        <div>
          <div className="serif" style={{fontSize:'1.3rem',marginBottom:10}}>Elite<em style={{fontStyle:'italic',color:'#C17B4E'}}>Booking</em></div>
          <p style={{fontSize:'0.8rem',color:'#888',lineHeight:1.65,fontWeight:300,maxWidth:220}}>La première plateforme de réservation beauté & bien-être dédiée au Maroc.</p>
        </div>
        <div>
          <h5 style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:14}}>Plateforme</h5>
          <Link href="/search" style={{display:'block',fontSize:'0.8rem',color:'#888',marginBottom:8,textDecoration:'none'}}>Trouver un salon</Link>
          <Link href="/search" style={{display:'block',fontSize:'0.8rem',color:'#888',marginBottom:8,textDecoration:'none'}}>Villes</Link>
          <Link href="/search" style={{display:'block',fontSize:'0.8rem',color:'#888',marginBottom:8,textDecoration:'none'}}>Catégories</Link>
        </div>
        <div>
          <h5 style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:14}}>Professionnels</h5>
          <Link href="/auth?mode=register&type=pro" style={{display:'block',fontSize:'0.8rem',color:'#888',marginBottom:8,textDecoration:'none'}}>S'inscrire</Link>
          <Link href="/pro" style={{display:'block',fontSize:'0.8rem',color:'#888',marginBottom:8,textDecoration:'none'}}>Espace Pro</Link>
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" style={{display:'block',fontSize:'0.8rem',color:'#888',marginBottom:8,textDecoration:'none'}}>Support</a>
        </div>
        <div>
          <h5 style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:14}}>Légal</h5>
          <span style={{display:'block',fontSize:'0.8rem',color:'#888',marginBottom:8}}>CGU</span>
          <span style={{display:'block',fontSize:'0.8rem',color:'#888',marginBottom:8}}>Confidentialité</span>
          <span style={{display:'block',fontSize:'0.8rem',color:'#888',marginBottom:8}}>Contact</span>
        </div>
      </footer>
      <div style={{textAlign:'center',padding:'20px 40px',borderTop:'1px solid #efefef',fontSize:'0.72rem',color:'#bbb'}}>
        © {new Date().getFullYear()} EliteBooking · Made in Morocco 🇲🇦
      </div>

    </div>
  );
}
