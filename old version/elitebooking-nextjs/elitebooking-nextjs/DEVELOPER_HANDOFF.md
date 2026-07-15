# EliteBooking — Documentation Développeur

**Version :** 1.0.0  
**Stack :** Next.js 14 · MongoDB Atlas · NextAuth JWT · Vercel  
**Prototype de référence :** `elitebooking.html` (fichier HTML monofichier avec toute la logique)

---

## 1. ARCHITECTURE GÉNÉRALE

```
Client (React/Next.js)
    │
    ├── Pages publiques     : / , /search , /salon/[id]
    ├── Pages client        : /client (dashboard RDV)
    ├── Pages pro           : /pro (dashboard complet)
    └── Auth                : /auth (login/register)
         │
         ▼
API Routes (Next.js App Router — /src/app/api/)
         │
         ▼
MongoDB Atlas (mongoose)
```

---

## 2. DÉPLOIEMENT RAPIDE (20 min)

### Étape 1 — MongoDB Atlas
1. Aller sur https://cloud.mongodb.com
2. Créer un compte gratuit → **New Project** → **Build a Database** → **M0 Free**
3. Choisir la région : **AWS / eu-west-1 (Ireland)** pour les utilisateurs marocains
4. Créer un utilisateur DB : noter `USERNAME` et `PASSWORD`
5. Network Access → **Add IP Address** → **Allow Access from Anywhere** (0.0.0.0/0)
6. Cliquer **Connect** → **Connect your application** → copier l'URI

### Étape 2 — Vercel
1. Pusher le code sur GitHub (repo privé recommandé)
2. Aller sur https://vercel.com → **New Project** → importer le repo
3. Framework : **Next.js** (détecté automatiquement)
4. **Environment Variables** (Settings → Environment Variables) :

```
MONGODB_URI         = mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
NEXTAUTH_SECRET     = [générer avec: openssl rand -base64 32]
NEXTAUTH_URL        = https://votre-app.vercel.app
NEXT_PUBLIC_WHATSAPP = 212663472335
```

5. Cliquer **Deploy** → ✅

### Étape 3 — Données initiales (seed)
Après le premier déploiement, lancer ce script en local une seule fois :

```bash
MONGODB_URI="..." node scripts/seed.js
```

---

## 3. STRUCTURE DES FICHIERS

```
elitebooking-nextjs/
├── .env.example              ← Variables d'environnement (à copier en .env.local)
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── package.json
└── src/
    ├── app/
    │   ├── layout.tsx          ← Root layout (fonts DM Sans + DM Serif Display)
    │   ├── globals.css         ← Design system complet (tokens CSS)
    │   ├── page.tsx            ← Landing page
    │   ├── auth/page.tsx       ← Login / Register (toggle client/pro)
    │   ├── search/page.tsx     ← Recherche salons avec filtres
    │   ├── salon/[id]/page.tsx ← Fiche salon + booking multi-prestations
    │   ├── client/page.tsx     ← Dashboard client (RDV, historique)
    │   ├── pro/page.tsx        ← Dashboard pro (agenda, services, staff, etc.)
    │   └── api/
    │       ├── auth/[...nextauth]/route.ts   ← NextAuth (JWT)
    │       ├── auth/register/route.ts        ← Inscription + création salon
    │       ├── salons/route.ts               ← GET (recherche), PUT (update salon)
    │       ├── salons/[id]/route.ts          ← GET (détail complet pour booking)
    │       ├── services/route.ts             ← CRUD catégories + prestations
    │       ├── staff/route.ts                ← CRUD employés
    │       ├── rdv/route.ts                  ← GET (client), POST (client booking)
    │       ├── rdv/[id]/route.ts             ← PATCH status (cancel/complete)
    │       ├── rdv/pro/route.ts              ← GET + POST (pro crée des RDV)
    │       ├── availability/route.ts         ← Créneaux libres pour une date
    │       ├── schedule/route.ts             ← GET/PUT horaires du salon
    │       ├── blocks/route.ts               ← GET/POST/DELETE blocages agenda
    │       └── users/me/route.ts             ← GET/PUT profil utilisateur + PIN
    ├── models/
    │   └── index.ts            ← Tous les modèles Mongoose (voir §4)
    ├── lib/
    │   ├── mongodb.ts          ← Connexion DB avec cache global
    │   ├── auth.ts             ← NextAuthOptions (Credentials provider)
    │   └── utils.ts            ← tMin, toISO, isSlotFree, generateSlots, formatPrice
    ├── components/             ← À CRÉER par le développeur (voir §6)
    │   ├── ui/                 ← Button, Input, Modal, Toast, Badge, Card
    │   ├── layout/             ← Navbar, Footer, Sidebar
    │   ├── booking/            ← MultiServiceBooking, CartSummary, SlotPicker
    │   ├── pro/                ← Agenda (DayView, StaffView, WeekView, MonthView)
    │   │                          ServicesList, StaffList, ClientList, Schedule
    │   └── client/             ← RdvCard, RdvHistory
    └── types/
        └── next-auth.d.ts      ← Extension des types NextAuth
```

---

## 4. SCHÉMA MONGODB (7 collections)

### users
```typescript
{
  _id:         ObjectId
  firstname:   string (requis)
  lastname:    string (requis)
  email:       string (unique, lowercase)
  password:    string (bcrypt hash, 12 rounds)
  type:        'client' | 'pro'
  phone?:      string
  salonId?:    ObjectId → salons  (pro uniquement)
  pin?:        string (4 chiffres, pro uniquement, non hashé)
  trialEndsAt?: Date  (J+14 à l'inscription pro)
  plan?:       'trial' | 'starter' | 'pro'
  createdAt:   Date
  updatedAt:   Date
}
Index : email (unique)
```

### salons
```typescript
{
  _id:         ObjectId
  ownerId:     ObjectId → users
  name:        string
  category:    'hammam'|'coiffure'|'onglerie'|'massage'|'esthetic'|'barbier'|'autre'
  city:        string
  address?:    string
  phone?:      string
  email?:      string
  description?: string
  rating:      number (default 4.5)
  reviewCount: number
  active:      boolean
  whatsapp?:   string (numéro sans +)
  instagram?:  string (@handle)
  coverImage?: string (URL Cloudinary)
  pin:         string (4 chiffres, protège CA + annulation)
  createdAt:   Date
}
Index : { city, category }, { ownerId }
```

### servicecategories
```typescript
{
  _id:     ObjectId
  salonId: ObjectId → salons
  name:    string
  color:   string (hex, ex: '#C17B4E')
  order:   number
}
Index : { salonId, order }
```

### services
```typescript
{
  _id:         ObjectId
  salonId:     ObjectId → salons
  catId?:      ObjectId → servicecategories
  name:        string
  description?: string
  priceType:   'fixed' | 'from' | 'quote'
  price:       number (0 si quote)
  duration:    number (minutes)
  staffIds:    ObjectId[] → staffs ([] = tous les employés)
  active:      boolean
  order:       number
}
Index : { salonId, catId, order }
```

### staffs
```typescript
{
  _id:       ObjectId
  salonId:   ObjectId → salons
  firstname: string
  lastname:  string
  role:      string (ex: 'Coiffeuse')
  days:      string[] (ex: ['Lu','Ma','Me','Je','Ve'])
  start:     string ('09:00')
  end:       string ('19:00')
  phone?:    string
  avatar?:   string (URL)
  active:    boolean
}
Index : { salonId }
```

### schedules (1 document par salon)
```typescript
{
  _id:     ObjectId
  salonId: ObjectId → salons (UNIQUE)
  Lu:      { open: boolean, start: '09:00', end: '19:00' }
  Ma:      { open: boolean, start: '09:00', end: '19:00' }
  Me:      { open: boolean, start: '09:00', end: '19:00' }
  Je:      { open: boolean, start: '09:00', end: '19:00' }
  Ve:      { open: boolean, start: '09:00', end: '19:00' }
  Sa:      { open: boolean, start: '09:00', end: '18:00' }
  Di:      { open: false,   start: '09:00', end: '18:00' }
}
Index : { salonId } unique
```

### blocks (créneaux bloqués manuellement)
```typescript
{
  _id:      ObjectId
  salonId:  ObjectId → salons
  label:    string (ex: 'Réunion', 'Pause déj')
  date:     string ('YYYY-MM-DD')
  start:    string ('HH:MM')
  end:      string ('HH:MM')
  staffId?: ObjectId → staffs (null = tout le salon)
}
Index : { salonId, date }
```

### rdvs (rendez-vous)
```typescript
{
  _id:         ObjectId
  clientId:    ObjectId | 'pro-add'  // 'pro-add' si créé par le pro sans compte client
  clientName:  string   // toujours stocké (dénormalisé pour affichage)
  clientPhone?: string
  salonId:     ObjectId → salons
  salonName:   string   // dénormalisé
  serviceId:   ObjectId → services
  serviceName: string   // dénormalisé
  staffId:     ObjectId → staffs
  staffName:   string   // dénormalisé
  date:        string ('YYYY-MM-DD')
  time:        string ('HH:MM')
  duration:    number (minutes)
  price:       number
  priceType:   'fixed' | 'from' | 'quote'
  status:      'confirmed' | 'cancelled' | 'completed' | 'no-show'
  notes?:      string
  groupId?:    string (UUID, lie plusieurs services réservés ensemble)
  source:      'client' | 'pro'
  createdAt:   Date
}
Index : { salonId, date }, { clientId, status }, { staffId, date }, { groupId }
```

---

## 5. API ENDPOINTS

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/register` | — | Inscription client ou pro (crée salon + schedule) |
| POST | `/api/auth/[...nextauth]` | — | Login NextAuth |
| GET | `/api/salons` | — | Recherche publique (city, category, q) |
| PUT | `/api/salons` | Pro | Modifier son salon |
| GET | `/api/salons/[id]` | — | Détail salon + catégories + services + staff + schedule |
| GET | `/api/services` | Pro | Liste catégories + services du salon |
| POST | `/api/services` | Pro | Créer catégorie (type:'category') ou service |
| PUT | `/api/services` | Pro | Modifier catégorie ou service |
| DELETE | `/api/services` | Pro | Supprimer (services orphelins → uncategorized) |
| GET | `/api/staff` | Pro | Liste employés actifs |
| POST | `/api/staff` | Pro | Créer employé |
| PUT | `/api/staff` | Pro | Modifier employé |
| DELETE | `/api/staff` | Pro | Désactiver employé (soft delete) |
| GET | `/api/rdv` | Client | Ses propres RDV |
| POST | `/api/rdv` | Client | Réserver (body: `{items:[...]}` ou item unique) |
| PATCH | `/api/rdv/[id]` | Client/Pro | Changer status |
| GET | `/api/rdv/pro` | Pro | Tous les RDV du salon |
| POST | `/api/rdv/pro` | Pro | Créer RDV(s) pour un client |
| GET | `/api/availability` | — | Créneaux libres (salonId, staffId, serviceId, date) |
| GET | `/api/schedule` | Pro | Horaires du salon |
| PUT | `/api/schedule` | Pro | Modifier horaires |
| GET | `/api/blocks` | Pro | Blocages (optionnel: ?date=) |
| POST | `/api/blocks` | Pro | Créer blocage |
| DELETE | `/api/blocks` | Pro | Supprimer blocage |
| GET | `/api/users/me` | Auth | Profil + salon (si pro) |
| PUT | `/api/users/me` | Auth | Modifier profil / PIN |

---

## 6. FONCTIONNALITÉS À IMPLÉMENTER (composants frontend)

Le fichier `elitebooking.html` contient toute la logique UI en vanilla JS.
Le développeur doit la convertir en composants React. Voici les priorités :

### 🔴 Critique (MVP)

**`/app/page.tsx` — Landing page**
- Hero avec searchbar (prestation + ville + bouton géolocalisation 📍)
- Section "Pour les pros" avec bouton WhatsApp
- Section "Essai gratuit 14 jours" avec 5 arguments
- Salons vedettes en grille (appel GET /api/salons?featured=true)

**`/app/salon/[id]/page.tsx` — Fiche salon**
- Affichage infos salon, note, photos
- Onglets : Réserver / L'équipe
- Flow réservation multi-prestations :
  1. Sélection prestation (groupées par catégorie avec couleur)
  2. Sélection employé (avatars, horaires)
  3. Sélection date (calendrier, jours avec dispo)
  4. Sélection créneau (appel GET /api/availability)
  5. Bouton "Ajouter au panier" → panier affiché en haut
  6. Possibilité d'ajouter N prestations (chaque sélection va dans le panier)
  7. Bouton "Confirmer tout" → POST /api/rdv avec `{ items: [...] }`

**`/app/pro/page.tsx` — Dashboard pro**
- Sidebar : Vue d'ensemble / Agenda / Rendez-vous / Prestations / Employés / Clients / Horaires / Profil
- Bouton FAB `+ RDV` (positionnement fixe bas droite)

**Agenda — 4 vues** (logique détaillée dans l'HTML) :
- **Jour** : colonne unique, positionnement absolu (60px/heure), RDV colorés sur durée réelle
- **Employés** : une colonne par employé, même principe absolu
- **Semaine** : 7 colonnes, pastilles compactes par heure
- **Mois** : grille calendrier, 2 RDV max par case + "+N autres"
- RDV affiche : **nom du client** (gras), prestation, heure, prix
- Clic sur RDV → modale détail avec bouton annuler (PIN requis)
- Clic sur créneau vide → ouvre formulaire ajout RDV pro

**Code PIN** :
- Clavier à 4 chiffres (clavier visuel custom, pas `<input type=number>`)
- Protège : annulation RDV + consultation CA (revenus masqués par défaut)
- PIN stocké en clair dans `salons.pin` (pas de données sensibles)
- Modifiable depuis le profil pro

**Prestations** :
- Catégories avec couleur (créées par le pro)
- Prestations à l'intérieur avec : nom, description, type de prix (fixe/à partir de/sur devis), durée, employés habilités
- Côté client : groupées par catégorie avec point de couleur

**RDV Pro (multi-prestations)** :
- Formulaire avec : nom client, prestation (optgroup par catégorie), employé, date, heure
- Bouton "+ Ajouter" → panier en haut du formulaire
- Vérification conflits inter-prestations (même employé, même créneau)
- Bouton "Enregistrer (N prestations)" → POST /api/rdv/pro avec `{ items: [...] }`

### 🟡 Important (post-MVP)

- Upload photo salon (Cloudinary + `next/image`)
- Notifications email (Resend ou Nodemailer) : confirmation RDV, rappel J-1
- Vue client mobile : agenda simplifié
- Page recherche `/search` avec filtres avancés + carte (Google Maps ou Leaflet)
- Système d'avis clients
- Export PDF planning journalier

### 🟢 Futur

- Stripe pour abonnements pro (starter / pro plans)
- Multi-salons par compte pro
- Dashboard analytics avancé (CA par période, prestation la plus bookée)
- App mobile (React Native ou PWA)
- Rappels SMS (Twilio ou Orange SMS API Maroc)

---

## 7. DESIGN SYSTEM (tokens CSS)

```css
/* Couleurs principales */
--gold:       #C17B4E;   /* Couleur accent principale */
--black:      #111111;
--green:      #27AE60;   /* Confirmé */
--red:        #EB5757;   /* Annulé / erreur */
--muted:      #888888;   /* Texte secondaire */
--border:     #EEEEEE;   /* Bordures */
--grey:       #F7F7F7;   /* Fond cards */

/* Typographie */
font-family: 'DM Sans', system-ui, sans-serif;       /* Corps */
font-family: 'DM Serif Display', Georgia, serif;     /* Titres */

/* Espacements */
border-radius cards:  14px
border-radius buttons: 10px
border-radius pills:   6-8px

/* Agenda */
ROW_H = 60px par 60 minutes
Un RDV de 90 min = height: 87px (90/60 * 60 - 3)
Positionnement: position:absolute, top = (tMin(time) - startH*60)/60*ROW_H
```

---

## 8. LOGIQUE MÉTIER CRITIQUE

### Calcul de disponibilité (isSlotFree)
```typescript
// Un créneau [ts, te) est libre si aucun RDV existant [rs, re) ne chevauche
// Chevauchement : ts < re && te > rs
// Si un RDV finit à 15:30, le créneau 15:30 est LIBRE
function isSlotFree(rdvs, staffId, date, time, duration) {
  const ts = tMin(time);
  const te = ts + duration;
  return !rdvs.some(r => {
    if (r.staffId !== staffId || r.date !== date || r.status === 'cancelled') return false;
    const rs = tMin(r.time), re = rs + r.duration;
    return ts < re && te > rs;  // chevauchement strict
  });
}
```

### Multi-prestations (groupId)
Quand un client ou un pro réserve plusieurs prestations ensemble, toutes partagent le même `groupId` (UUID). Cela permet d'afficher le groupe "Coiffure + Soin + Massage le 15 juin" comme une réservation cohérente.

### PIN protection
- Revenus (CA) : masqués avec `filter:blur(8px)`, révélés après PIN correct
- Annulation RDV : modale PIN interstitielle avant `PATCH /api/rdv/[id]`
- Le PIN est stocké en clair dans `salons.pin` (ce n'est pas un secret de sécurité, juste une friction UI)

### Schedule → Agenda
L'agenda lit le schedule pour calculer les heures affichées :
- `dayStartH = Math.floor(tMin(daySch.start) / 60)`
- `dayEndH   = Math.ceil(tMin(daySch.end) / 60)`
- Les lignes de l'agenda commencent à `dayStartH` et finissent à `dayEndH`

---

## 9. VARIABLES D'ENVIRONNEMENT

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `MONGODB_URI` | ✅ | URI MongoDB Atlas (avec username:password) |
| `NEXTAUTH_SECRET` | ✅ | Chaîne aléatoire 32 chars (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | ✅ | URL publique de l'app (ex: https://elitebooking.vercel.app) |
| `NEXT_PUBLIC_WHATSAPP` | ✅ | Numéro WhatsApp support (sans +, ex: 212663472335) |
| `NEXT_PUBLIC_APP_NAME` | ⬜ | Nom affiché (défaut: EliteBooking) |
| `CLOUDINARY_CLOUD_NAME` | ⬜ | Pour l'upload de photos salons |
| `CLOUDINARY_API_KEY` | ⬜ | Clé API Cloudinary |
| `CLOUDINARY_API_SECRET` | ⬜ | Secret Cloudinary |

---

## 10. COÛTS EN PRODUCTION

| Service | Plan gratuit | Limite | Plan payant |
|---------|-------------|--------|-------------|
| **Vercel** | Hobby (gratuit) | 100GB bandwidth/mois | Pro $20/mois |
| **MongoDB Atlas** | M0 Free | 512 MB stockage | M10 $57/mois |
| **Cloudinary** | Free | 25 GB stockage | Plus $89/mois |
| **Total MVP** | **0€/mois** | ~500 utilisateurs | — |

Pour 500–2000 utilisateurs : ~$50-100/mois (Vercel Pro + Atlas M10).

---

## 11. SÉCURITÉ

- Mots de passe : `bcrypt` avec 12 rounds
- Sessions : JWT via NextAuth (pas de sessions DB)
- Protection CSRF : intégrée dans NextAuth
- Routes API pro : vérifient `session.user.type === 'pro'` ET `session.user.salonId === rdv.salonId`
- Upload fichiers : valider MIME type + taille max côté serveur (si implémenté)
- PIN : ne jamais exposer dans les réponses API publiques
- Rate limiting : à ajouter sur `/api/auth/register` (ex: Upstash Redis)

---

## 12. CHECKLIST AVANT MISE EN LIGNE

- [ ] Variables d'environnement configurées sur Vercel
- [ ] MongoDB Atlas : utilisateur DB créé, IP 0.0.0.0/0 whitelisté
- [ ] `NEXTAUTH_URL` pointe sur le domaine Vercel final
- [ ] Premier déploiement réussi (no build errors)
- [ ] Inscription pro testée → salon créé dans Atlas
- [ ] Réservation client testée → RDV visible en dashboard pro
- [ ] Code PIN fonctionnel (test annulation RDV)
- [ ] Multi-prestations testées (client + pro)
- [ ] Agenda : vues Jour + Employés + Semaine + Mois affichent correctement
- [ ] Horaires salon modifiés → agenda mis à jour
- [ ] Domaine personnalisé configuré (optionnel)

---

## CONTACT & RÉFÉRENCE

Pour toute question sur la logique métier, se référer au prototype `elitebooking.html`.
Toutes les fonctions clés sont documentées en commentaires dans ce fichier.

Fonctions importantes à retrouver dans le prototype :
- `staffSlotFree()` → logique anti-conflit créneaux
- `renderDayView()` / `renderStaffView()` → agenda absolu positioning
- `buildMultiBookingFlow()` → flow réservation client
- `openProMultiRdv()` → formulaire pro multi-prestations
- `requirePin()` / `changeRdvStatus()` → protection PIN
- `formatPrice()` → 3 types de prix (fixed/from/quote)
- `clientLabel()` → résolution nom client (compte ou saisie manuelle)
