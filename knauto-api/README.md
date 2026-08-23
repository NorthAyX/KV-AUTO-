# KNAUTO — Plateforme automobile premium

Site de vente / publication de véhicules avec :
- Frontend moderne (Lavender + Periwinkle)
- Backend Flask + JWT
- Rôles **Admin** et **User**
- Vérification email via **Resend**
- Publication, achat / essai, gestion des annonces

## Prérequis

- Python 3.10+
- Compte [Resend](https://resend.com) (pour les emails)

## Installation

```bash
# 1. Cloner le repo
git clone https://github.com/TON_USERNAME/knauto.git
cd knauto

# 2. Installer les dépendances
pip install flask flask-cors PyJWT bcrypt requests

# 3. Configurer l'environnement
cp .env.example .env
# Édite .env et mets ta clé Resend + un JWT_SECRET
```

### Charger les variables d'environnement

**Linux / macOS :**
```bash
export $(grep -v '^#' .env | xargs)
python3 server.py
```

**Ou avec python-dotenv** (optionnel) :
```bash
pip install python-dotenv
# puis le serveur peut charger .env automatiquement
```

## Lancer

```bash
python3 server.py
```

Ouvre : **http://localhost:3000**

## Comptes de démo

| Rôle  | Email             | Mot de passe |
|-------|-------------------|--------------|
| Admin | admin@knauto.fr   | admin123     |
| User  | user@knauto.fr    | user123      |

Ces comptes sont déjà **vérifiés**.

## Fonctionnalités

### Public
- Catalogue de véhicules
- Filtres (Sport / Luxe / SUV)

### User (après inscription + vérification email)
- Publier une annonce
- Demande d'achat / essai
- Gérer ses propres annonces

### Admin
- CRUD complet des véhicules
- Gestion des utilisateurs
- Statistiques

## Structure

```
knauto-api/
├── server.py          # Backend Flask
├── public/            # Frontend
│   ├── index.html
│   ├── css/style.css
│   └── js/main.js
├── data/              # Base JSON (générée au 1er lancement)
├── .env.example
└── README.md
```

## API (aperçu)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion |
| GET  | `/api/auth/verify/<token>` | Vérifier email |
| GET  | `/api/cars` | Liste des véhicules |
| POST | `/api/cars` | Publier (auth) |
| DELETE | `/api/cars/:id` | Supprimer (auth) |
| GET  | `/api/stats` | Stats (admin) |

## Emails (Resend)

1. Crée une API Key sur [resend.com/api-keys](https://resend.com/api-keys)
2. Pour envoyer à n'importe qui : vérifie un domaine dans **Domains**
3. Mets la clé dans `.env` → `RESEND_API_KEY=...`

Sans domaine vérifié, Resend n'accepte que certaines adresses de test.

## Licence

Projet démo / éducatif.
