# EliteBooking — Documentation Développeur (Supabase)

**Stack :** Next.js 14 App Router · Supabase (PostgreSQL + Auth) · Tailwind CSS · Vercel  
**Prototype UI de référence :** `elitebooking.html` (toute la logique UI en vanilla JS)

---

## 1. DÉPLOIEMENT EN 30 MINUTES

### Étape 1 — Créer le projet Supabase

1. Aller sur [supabase.com](https://supabase.com) → **New project**
2. Organisation → nom du projet : `elitebooking`
3. Région : **West EU (Ireland)** pour les utilisateurs marocains
4. Database password : noter le mot de passe
5. Attendre ~2 min que le projet soit prêt

### Étape 2 — Exécuter le schéma SQL

Dans Supabase → **SQL Editor** → **New query** :

1. Coller le contenu de `supabase/migrations/001_schema.sql` → **Run**
2. Coller le contenu de `supabase/migrations/002_rls.sql` → **Run**

✅ Les 8 tables sont créées avec les index et les politiques RLS.

### Étape 3 — Récupérer les clés API

Dans Supabase → **Settings → API** :

```
Project URL       → NEXT_PUBLIC_SUPABASE_URL
anon public key   → NEXT_PUBLIC_SUPABASE_ANON_KEY
service_role key  → SUPABASE_SERVICE_ROLE_KEY  (⚠️ secret, jamais exposé côté client)
```

### Étape 4 — Configurer l'Auth Supabase

Dans Supabase → **Authentication → Settings** :

- **Site URL** : `https://votre-app.vercel.app`
- **Redirect URLs** : `https://votre-app.vercel.app/**`
- Email confirmation : désactiver en dev (re-activer en prod)

### Étape 5 — Déployer sur Vercel

```bash
# Installer les dépendances
npm install

# Variables d'environnement à définir sur Vercel :
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://votre-app.vercel.app
NEXT_PUBLIC_WHATSAPP=212663472335
```

→ Push sur GitHub → Vercel → **New project** → importer le repo → **Deploy** ✅

---

## 2. ARCHITECTURE

```
elitebooking-final/
├── middleware.ts                      ← Auth guard (protection /pro et /client)
├── supabase/migrations/
│   ├── 001_schema.sql                 ← Schéma complet (tables + triggers)
│   └── 002_rls.sql                    ← Row Level Security (policies)
├── src/
│   ├── types/database.ts              ← Types TypeScript (schéma complet)
│   ├── lib/
│   │   ├── supabase/client.ts         ← Client browser (React/hooks)
│   │   ├── supabase/server.ts         ← Client server (API routes, Server Components)
│   │   └── utils.ts                   ← tMin, toISO, isSlotFree, generateSlots, formatPrice
│   └── app/
│       ├── layout.tsx                 ← Root layout (fonts DM Sans + DM Serif Display)
│       ├── globals.css                ← Design system complet
│       ├── page.tsx                   ← ⚠️ À CRÉER — Landing page
│       ├── auth/page.tsx              ← ⚠️ À CRÉER — Login/Register
│       ├── search/page.tsx            ← ⚠️ À CRÉER — Recherche salons
│       ├── salon/[id]/page.tsx        ← ⚠️ À CRÉER — Fiche salon + booking
│       ├── client/page.tsx            ← ⚠️ À CRÉER — Dashboard client
│       ├── pro/page.tsx               ← ⚠️ À CRÉER — Dashboard pro
│       └── api/                       ← ✅ COMPLET — 14 routes prêtes
```

---

## 3. SCHÉMA BASE DE DONNÉES

### Table `profiles` (extension de `auth.users`)

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid PK | = auth.users.id |
| `firstname` | text | Prénom |
| `lastname` | text | Nom |
| `phone` | text\|null | Téléphone |
| `type` | 'client'\|'pro' | Type de compte |
| `salon_id` | uuid\|null | Référence salon (pro seulement) |
| `plan` | 'trial'\|'starter'\|'pro' | Abonnement |
| `trial_ends_at` | timestamptz | J+14 à l'inscription |

> **Important :** le trigger `on_auth_user_created` crée automatiquement le profil lors de l'inscription Supabase Auth.

---

### Table `salons`

| Colonne | Type | Description |
|---------|------|-------------|
| `owner_id` | uuid → profiles | Propriétaire |
| `name` | text | Nom du salon |
| `category` | enum | hammam \| coiffure \| onglerie \| massage \| esthetic \| barbier \| autre |
| `city` | text | Ville |
| `address` | text | Adresse |
| `phone`, `email`, `whatsapp`, `instagram` | text | Contacts |
| `rating` | numeric(3,1) | Note (défaut 4.5) |
| `active` | boolean | Visible sur la plateforme |
| `cover_image` | text | URL photo (Cloudinary) |
| `pin` | text | Code PIN 4 chiffres (protection CA + annulation) |

---

### Table `service_categories`

| Colonne | Type | Description |
|---------|------|-------------|
| `salon_id` | uuid → salons | |
| `name` | text | Ex : "Coiffure", "Soins" |
| `color` | text | Couleur hex (#C17B4E) |
| `order` | integer | Ordre d'affichage |

---

### Table `services`

| Colonne | Type | Description |
|---------|------|-------------|
| `salon_id` | uuid → salons | |
| `cat_id` | uuid → service_categories \| null | Catégorie parente |
| `name` | text | Nom de la prestation |
| `price_type` | 'fixed'\|'from'\|'quote' | Type de tarification |
| `price` | numeric | Montant (0 si quote) |
| `duration` | integer | Durée en minutes (min: 5) |
| `staff_ids` | uuid[] | Employés habilités (vide = tous) |

---

### Table `staff`

| Colonne | Type | Description |
|---------|------|-------------|
| `salon_id` | uuid → salons | |
| `firstname`, `lastname` | text | |
| `role` | text | Ex : "Coiffeuse", "Masseuse" |
| `days` | text[] | Jours travaillés : ['Lu','Ma','Me','Je','Ve','Sa','Di'] |
| `start_time`, `end_time` | text | Horaires ('09:00', '19:00') |

---

### Table `schedules` (1 ligne par salon)

Colonnes par jour (ex: lundi) : `lu_open` (bool), `lu_start` (text '09:00'), `lu_end` (text '19:00')  
Jours : `lu_` `ma_` `me_` `je_` `ve_` `sa_` `di_`

---

### Table `blocks` (indisponibilités manuelles)

| Colonne | Type | Description |
|---------|------|-------------|
| `salon_id` | uuid → salons | |
| `staff_id` | uuid → staff \| null | null = tout le salon |
| `label` | text | Ex : "Réunion", "Pause déj" |
| `date` | date | YYYY-MM-DD |
| `start_time`, `end_time` | text | HH:MM |

---

### Table `rdvs` (rendez-vous)

| Colonne | Type | Description |
|---------|------|-------------|
| `client_id` | uuid → profiles \| null | null si ajout manuel pro |
| `client_name` | text | Toujours rempli (dénormalisé) |
| `salon_id`, `salon_name` | uuid + text | |
| `service_id`, `service_name` | uuid + text | |
| `staff_id`, `staff_name` | uuid + text | |
| `date` | date | YYYY-MM-DD |
| `start_time` | text | HH:MM |
| `duration` | integer | Minutes |
| `price`, `price_type` | numeric + enum | |
| `status` | confirmed\|cancelled\|completed\|no-show | |
| `group_id` | uuid \| null | Lie plusieurs prestations réservées ensemble |
| `source` | 'client'\|'pro' | Qui a créé le RDV |

---

## 4. API ENDPOINTS

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/register` | — | Inscription (crée profil + salon + schedule si pro) |
| GET | `/api/salons` | — | Recherche publique (`?city=&category=&q=`) |
| PUT | `/api/salons` | Pro | Modifier son salon |
| GET | `/api/salons/[id]` | — | Détail salon + cats + services + staff + schedule |
| GET | `/api/services` | Pro | Catégories + services du salon |
| POST | `/api/services` | Pro | Créer (`resourceType:'category'` ou service) |
| PUT | `/api/services` | Pro | Modifier |
| DELETE | `/api/services` | Pro | Supprimer (services orphelins → uncategorized) |
| GET | `/api/staff` | Pro | Employés actifs |
| POST, PUT, DELETE | `/api/staff` | Pro | CRUD employés |
| GET | `/api/rdv` | Client | Ses RDV |
| POST | `/api/rdv` | Client | Réserver (`{items:[...]}` ou item unique) |
| PATCH | `/api/rdv/[id]` | Auth | Changer statut |
| GET | `/api/rdv/pro` | Pro | Tous les RDV du salon |
| POST | `/api/rdv/pro` | Pro | Créer RDV(s) pour client |
| GET | `/api/availability` | — | Créneaux libres (`?salonId=&staffId=&serviceId=&date=`) |
| GET | `/api/schedule` | Pro | Horaires du salon |
| PUT | `/api/schedule` | Pro | Modifier horaires |
| GET, POST, DELETE | `/api/blocks` | Pro | Blocages agenda |
| GET | `/api/users/me` | Auth | Profil + salon si pro |
| PUT | `/api/users/me` | Auth | Modifier profil / PIN / password |

---

## 5. PAGES FRONTEND À CRÉER

### 5.1 `/auth` — Connexion / Inscription

```tsx
// Utilise le client Supabase browser
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Connexion
await supabase.auth.signInWithPassword({ email, password });

// Inscription : appeler d'abord POST /api/auth/register pour créer le profil/salon
// puis signIn automatiquement
const res = await fetch('/api/auth/register', { method:'POST', body: JSON.stringify({...}) });
if (res.ok) await supabase.auth.signInWithPassword({ email, password });

// Déconnexion
await supabase.auth.signOut();
```

**UX :** toggle client ↔ pro. Si pro → champs supplémentaires (nom salon, ville, catégorie).

---

### 5.2 `/` — Landing page

- Hero searchbar : prestation (text) + ville (select CITIES) + bouton 📍 géolocalisation
- Sur submit → redirect vers `/search?q=...&city=...`
- Salons vedettes : `GET /api/salons` sans filtres, limit 6
- Section pro : WhatsApp support + "Essai gratuit 14 jours" + 5 arguments

**Géolocalisation (bouton 📍) :**
```js
navigator.geolocation.getCurrentPosition(pos => {
  fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
    .then(r => r.json())
    .then(d => setCityField(d.address.city || d.address.town || ''));
});
```

---

### 5.3 `/search` — Recherche salons

- Filtres : ville + catégorie + texte libre → `GET /api/salons?city=&category=&q=`
- Grille de cards avec : photo, nom, ville, catégorie, rating, prix min
- Clic → `/salon/[id]`

---

### 5.4 `/salon/[id]` — Fiche salon + booking

**Données :** `GET /api/salons/[id]` → `{ salon, categories, services, staff, schedule }`

**Flow réservation multi-prestations (côté client) :**

```
État local : bookingCart = []

Étape 1 → sélection prestation (affichées groupées par catégorie avec couleur)
Étape 2 → sélection employé (avatars avec initiales)
Étape 3 → sélection date (28 jours, jours fermés selon schedule grisés)
Étape 4 → sélection créneau :
           GET /api/availability?salonId=&staffId=&serviceId=&date=
           → slots libres en tenant compte DB + items déjà dans bookingCart

Bouton "Ajouter au panier" → push dans bookingCart
  → le panier s'affiche en haut avec total MAD
  → bouton "+ Autre prestation" → retour étape 1
  → bouton "Confirmer tout" → POST /api/rdv avec { items: bookingCart }
```

**Vérification conflits intra-panier :**
Avant d'ajouter un item au panier, vérifier que le créneau ne chevauche pas un item déjà dans le panier local :
```js
const conflict = bookingCart.some(ci => {
  if (ci.staffId !== staffId || ci.date !== date) return false;
  const cs = tMin(ci.start_time), ce = cs + ci.duration;
  const ts = tMin(time), te = ts + duration;
  return ts < ce && te > cs;
});
```

---

### 5.5 `/client` — Dashboard client

- Liste RDV : `GET /api/rdv`
- Tabs : À venir / Historique (filtrer par date)
- Chaque card : salon, prestation, employé, date, heure, prix, statut
- Bouton annuler → `PATCH /api/rdv/[id]` `{ status: 'cancelled' }`

---

### 5.6 `/pro` — Dashboard pro

**Récupérer les données pro :**
```tsx
const { profile, salon } = await fetch('/api/users/me').then(r => r.json());
const rdvs     = await fetch('/api/rdv/pro').then(r => r.json());
const { categories, services } = await fetch('/api/services').then(r => r.json());
const staff    = await fetch('/api/staff').then(r => r.json());
const schedule = await fetch('/api/schedule').then(r => r.json());
```

**Sections sidebar :**

| Onglet | Description |
|--------|-------------|
| 📊 Vue d'ensemble | KPIs : RDV aujourd'hui, CA masqué par PIN, RDV semaine |
| 📅 Agenda | 4 vues : Jour, Employés, Semaine, Mois |
| 📋 Rendez-vous | Tableau avec colonnes : Client, Date, Heure, Prestation, Employé, Prix, Statut |
| ✂️ Prestations | Catégories + services imbriqués, 3 types de prix |
| 👥 Employés | CRUD : prénom, rôle, jours, horaires |
| 🧑‍🤝‍🧑 Clients | Cartes avec stats, clic → fiche détaillée + historique |
| 🕐 Horaires | Schedule par jour (ouvert/fermé, heures) + blocages |
| ⚙️ Profil | Infos salon, PIN, déconnexion |

**Bouton FAB (+ RDV) :** fixe en bas à droite sur tous les onglets  
→ ouvre modale multi-prestations pro (voir §6)

---

## 6. LOGIQUE MÉTIER CRITIQUE

### 6.1 Calcul disponibilité / anti-conflit

```typescript
// lib/utils.ts — isSlotFree
// Règle : ts < re && te > rs  (chevauchement strict)
// Un RDV finissant à 15:30 → le créneau 15:30 est LIBRE

function isSlotFree(rdvs, staffId, date, startTime, duration) {
  const ts = tMin(startTime), te = ts + duration;
  return !rdvs.some(r => {
    if (r.staff_id !== staffId || r.date !== date || r.status === 'cancelled') return false;
    const rs = tMin(r.start_time), re = rs + r.duration;
    return ts < re && te > rs;
  });
}
```

### 6.2 Agenda avec positionnement absolu (Google Calendar style)

```
ROW_H = 60px par heure

top  = (tMin(start_time) - startHour * 60) / 60 * ROW_H
height = Math.max(duration / 60 * ROW_H - 3, 28)

// Chaque RDV est position:absolute dans sa colonne (vue Jour ou vue Employés)
// La couleur couvre toute la durée réelle de la prestation
```

Affichage dans chaque card :
- Ligne 1 : **nom du client** (gras)
- Ligne 2 : nom de la prestation (si height > 40px)
- Ligne 3 : heure · employé · prix (si height > 56px)

### 6.3 Schedule → plage horaire agenda

```typescript
// Le nom de colonne suit le pattern : {lu|ma|me|je|ve|sa|di}_{open|start|end}
const dayKey = dayKeyForISO(date).toLowerCase(); // 'lu', 'ma', ...
const isOpen = (schedule as any)[`${dayKey}_open`];
const start  = (schedule as any)[`${dayKey}_start`]; // '09:00'
const end    = (schedule as any)[`${dayKey}_end`];   // '19:00'

// L'agenda commence à Math.floor(tMin(start)/60)
// et finit à Math.ceil(tMin(end)/60)
```

### 6.4 Code PIN (pro)

- Stocké en clair dans `salons.pin` (4 chiffres, pas une donnée sensible)
- Interface : clavier visuel custom (4 cercles + grille 3×4)
- Protège : consultation CA (revenus masqués par défaut) + annulation RDV
- Modifiable via `PUT /api/users/me` `{ pin: '1234' }`

### 6.5 Booking multi-prestations (groupId)

Quand plusieurs prestations sont réservées ensemble → toutes partagent le même `group_id` (UUID).  
Permet d'afficher "Réservation du 15/06 : 3 prestations" comme un groupe cohérent.

### 6.6 Prix dénormalisés

`service_name`, `staff_name`, `salon_name` sont copiés dans `rdvs` au moment de la réservation.  
→ Si un service est modifié/supprimé, les RDV historiques conservent les informations correctes.

---

## 7. SUPABASE AUTH — FLUX COMPLET

```
Inscription pro :
  1. POST /api/auth/register (crée profil + salon + schedule via service_role)
  2. supabase.auth.signInWithPassword({ email, password })
  3. Cookie de session créé automatiquement par @supabase/ssr

Connexion :
  supabase.auth.signInWithPassword({ email, password })

Déconnexion :
  supabase.auth.signOut()

Côté serveur (Server Components / Route Handlers) :
  const supabase = createClient(); // src/lib/supabase/server.ts
  const { data: { user } } = await supabase.auth.getUser();
  // → null si non connecté, sinon user.id = profiles.id

Côté client (React components) :
  const supabase = createClient(); // src/lib/supabase/client.ts
  const { data: { session } } = await supabase.auth.getSession();
```

---

## 8. ROW LEVEL SECURITY (RLS)

Toutes les tables ont RLS activé. Résumé des accès :

| Table | Lecture anonyme | Lecture auth | Écriture |
|-------|----------------|--------------|---------|
| salons | ✅ (active=true) | ✅ (own) | Pro (own) |
| services | ✅ (active=true) | ✅ | Pro (own salon) |
| staff | ✅ (active=true) | ✅ | Pro (own salon) |
| schedules | ✅ | ✅ | Pro (own salon) |
| blocks | ❌ | Pro (own salon) | Pro (own salon) |
| rdvs | ❌ | Client (own) + Pro (salon) | Client + Pro |
| profiles | ❌ | Own only | Own only |

---

## 9. COÛTS ESTIMÉS

| Service | Plan gratuit | Limite | Plan payant |
|---------|-------------|--------|-------------|
| **Supabase** | Free | 500 MB DB, 50K MAU | Pro $25/mois |
| **Vercel** | Hobby | 100 GB bandwidth | Pro $20/mois |
| **Cloudinary** | Free | 25 GB stockage | Plus $89/mois |
| **Total MVP** | **0€/mois** | ~300 utilisateurs | — |

Pour 300–2000 utilisateurs : ~$50/mois (Supabase Pro + Vercel Pro).

---

## 10. CHECKLIST AVANT MISE EN LIGNE

**Supabase :**
- [ ] `001_schema.sql` exécuté sans erreur
- [ ] `002_rls.sql` exécuté sans erreur
- [ ] Site URL + Redirect URLs configurés dans Authentication → Settings
- [ ] Email confirmation activé (prod)

**Vercel :**
- [ ] 4 variables d'environnement définies
- [ ] Build réussi (no TypeScript errors)
- [ ] Middleware actif (test : `/pro` sans login → redirect `/auth`)

**Fonctionnel :**
- [ ] Inscription pro → salon créé dans Supabase
- [ ] Schedule créé automatiquement
- [ ] Inscription client → réservation → RDV visible chez le pro
- [ ] Multi-prestations : 2 services réservés ensemble → même group_id
- [ ] Annulation RDV client + côté pro (avec PIN)
- [ ] Agenda : vues Jour et Employés avec positionnement absolu
- [ ] Horaires modifiés → créneaux mis à jour en temps réel

---

## 11. RÉFÉRENCE — FONCTIONS CLÉS DU PROTOTYPE HTML

Pour convertir la logique UI, chercher ces fonctions dans `elitebooking.html` :

| Fonction | Rôle |
|----------|------|
| `buildMultiBookingFlow()` | Flow réservation client multi-prestations |
| `bwPickSvc/Staff/Date/Time()` | Étapes de sélection |
| `bwAddToCart()` / `bwOpenConfirmAll()` | Panier client |
| `openProMultiRdv()` | Formulaire pro multi-prestations |
| `pmcAddItem()` / `pmcSaveAll()` | Panier pro |
| `renderDayView()` / `renderStaffView()` | Agenda absolu positioning |
| `renderWeekView()` / `renderMonthView()` | Vues semaine et mois |
| `requirePin()` / `pinPress()` | Clavier PIN |
| `changeRdvStatus()` | Annulation avec PIN |
| `renderProServices()` | Liste prestations groupées par catégorie |
| `renderProClients()` / `showCliCard()` | Clients + fiche détaillée |
| `clientLabel()` | Résolution nom client (compte ou saisie manuelle) |
| `formatPrice()` | Prix selon type (fixed/from/quote) |
| `geolocate()` | Géolocalisation Nominatim |
| `staffSlotFree()` | ≡ `isSlotFree()` dans utils.ts |
