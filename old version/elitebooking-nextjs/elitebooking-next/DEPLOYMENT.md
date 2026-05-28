# Guide de déploiement — EliteBooking

## Stack technique
- **Frontend + Backend** : Next.js 14 (App Router)
- **Base de données** : MongoDB Atlas
- **Auth** : NextAuth.js (JWT)
- **Hébergement** : Vercel (recommandé)
- **CSS** : Tailwind CSS

---

## 1. MongoDB Atlas — Configuration

### 1.1 Créer un cluster
1. Aller sur [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Créer un compte gratuit (cluster M0 = gratuit)
3. **Create a Cluster** → choisir une région proche (ex: Frankfurt pour l'Europe)
4. Nommer le cluster : `elitebooking-prod`

### 1.2 Sécurité
1. **Database Access** → Add New Database User
   - Username : `elitebooking-app`
   - Password : générer un mot de passe fort → **noter ce mot de passe**
   - Role : `readWriteAnyDatabase`

2. **Network Access** → Add IP Address
   - Pour Vercel : ajouter `0.0.0.0/0` (Allow Access from Anywhere)
   - ⚠️ En production, vous pouvez restreindre aux IPs de Vercel

### 1.3 URI de connexion
1. **Clusters** → **Connect** → **Connect your application**
2. Copier l'URI de connexion, ça ressemble à :
   ```
   mongodb+srv://elitebooking-app:<password>@elitebooking-prod.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. Remplacer `<password>` par votre mot de passe
4. Ajouter le nom de la base : `elitebooking`
   ```
   mongodb+srv://elitebooking-app:<password>@elitebooking-prod.xxxxx.mongodb.net/elitebooking?retryWrites=true&w=majority
   ```

---

## 2. Installation locale (développement)

```bash
# Cloner / extraire le projet
cd elitebooking

# Installer les dépendances
npm install

# Créer le fichier d'environnement
cp .env.example .env.local

# Éditer .env.local avec vos valeurs :
# MONGODB_URI=mongodb+srv://...
# NEXTAUTH_SECRET=générer avec: openssl rand -base64 32
# NEXTAUTH_URL=http://localhost:3000

# Lancer en développement
npm run dev
```

Ouvrir http://localhost:3000

---

## 3. Déploiement sur Vercel

### 3.1 Préparer le dépôt
```bash
git init
git add .
git commit -m "Initial commit"
# Pousser sur GitHub/GitLab
```

### 3.2 Déployer sur Vercel
1. Aller sur [vercel.com](https://vercel.com)
2. **New Project** → Importer depuis GitHub
3. Sélectionner le dépôt `elitebooking`
4. Framework : **Next.js** (détecté automatiquement)

### 3.3 Variables d'environnement sur Vercel
Dans **Settings → Environment Variables**, ajouter :

| Variable | Valeur |
|----------|--------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/elitebooking?...` |
| `NEXTAUTH_SECRET` | Chaîne aléatoire de 32+ caractères |
| `NEXTAUTH_URL` | `https://votre-domaine.vercel.app` |

### 3.4 Déployer
- Cliquer **Deploy**
- Vercel construit et déploie automatiquement
- Chaque `git push` sur `main` redéploie

---

## 4. Structure des API Routes

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/auth/register` | POST | Inscription client/pro |
| `/api/auth/[...nextauth]` | * | NextAuth (login, session) |
| `/api/users/me` | GET/PUT | Profil utilisateur |
| `/api/salons` | GET/POST | Liste / créer salon |
| `/api/salons/[id]` | GET/PUT | Détail / modifier salon |
| `/api/services/[salonId]` | GET/POST/PUT/DELETE | Prestations |
| `/api/staff/[salonId]` | GET/POST/PUT/DELETE | Employés |
| `/api/rdv` | GET/POST | RDV |
| `/api/rdv/[id]` | PATCH/DELETE | Modifier / annuler RDV |
| `/api/rdv/pro` | POST | Création RDV par le pro |
| `/api/availability` | GET | Créneaux disponibles |
| `/api/schedule/[salonId]` | GET/PUT | Horaires salon |
| `/api/blocks/[salonId]` | GET/POST/DELETE | Blocages agenda |

---

## 5. Données de test

Au premier lancement, créer manuellement via l'interface :

1. S'inscrire comme **professionnel** → votre salon est créé
2. Aller dans **Employés** → ajouter 2-3 employés
3. Aller dans **Prestations** → ajouter 3-5 prestations
4. S'inscrire comme **client** → tester la réservation

---

## 6. Domaine personnalisé

Dans Vercel → **Domains** → ajouter votre domaine (ex: `elitebooking.ma`)

Configurer le DNS chez votre registrar :
```
A     @    76.76.21.21
CNAME www  cname.vercel-dns.com
```

Mettre à jour `NEXTAUTH_URL=https://elitebooking.ma`

---

## 7. Performance & SEO

- Les pages salon (`/salon/[id]`) et recherche (`/search`) peuvent être converties en **Server Components** pour le SEO
- Ajouter des meta tags dans les pages importantes
- MongoDB Atlas permet l'auto-scaling si le trafic augmente

---

## 8. Coûts estimés

| Service | Plan | Coût mensuel |
|---------|------|-------------|
| Vercel | Hobby (1 projet) | Gratuit |
| MongoDB Atlas | M0 (512MB) | Gratuit |
| **Total démarrage** | | **0 € / mois** |
| Vercel Pro (production) | — | ~20 $/mois |
| MongoDB Atlas M10 | — | ~60 $/mois |

Le plan gratuit suffit pour tester et les premières centaines d'utilisateurs.
