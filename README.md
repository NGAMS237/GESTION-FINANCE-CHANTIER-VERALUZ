# Gestion Finance Chantier — Résidence Veraluz

Application web standalone de gestion financière du chantier de construction  
**Résidence Veraluz — Mako City, Kribi, Cameroun**

## Fonctionnalités

- Gestion multi-projets avec hiérarchie Projet → Catégorie → Phase → Devis → Paiements
- Tableau de bord financier avec graphiques (Chart.js)
- Gestion des devis avec édition inline des montants
- Suivi des paiements/versements groupés par catégorie
- Génération de rapports PDF (jsPDF + AutoTable)
- OCR automatique pour analyse des devis PDF (PDF.js + Tesseract.js)
- Gestion documentaire avec upload Supabase Storage

## Stack technique

- **Frontend** : HTML5 / CSS3 / JavaScript vanilla (single-file)
- **Backend** : Convex (base de données, stockage de fichiers, authentification e-mail + mot de passe)
- **Librairies** : Chart.js 4, jsPDF 2.5, PDF.js 3.11, Tesseract.js 5

## Mise en service (Convex)

1. Installer les dépendances : `npm ci`
2. Déployer le backend : `npx convex deploy` (ou `npx convex dev` pour un déploiement de développement).
   Cette commande régénère aussi `convex/_generated/`.
3. Configurer l'authentification une fois par déploiement : `npx @convex-dev/auth`
   (génère `JWT_PRIVATE_KEY`, `JWKS` et `SITE_URL` dans les variables d'environnement Convex).
4. Autoriser chaque utilisateur :
   `npx convex run users:allowEmail '{"email":"nom@exemple.com"}'`
   (`users:revokeEmail` retire l'accès immédiatement).
5. Renseigner `CONVEX_URL` dans `index.html` (URL publique du déploiement, ce n'est pas un secret).
6. Importer les données Supabase : voir `scripts/import-supabase.mjs`.

À la première connexion, chaque utilisateur choisit « Créer mon mot de passe » (10 caractères minimum).

## Développement

- `npm run validate` : typecheck + tests (`convex-test`, sans déploiement).
- Le plan et l'audit de la migration sont dans `docs/AUDIT_ET_MIGRATION_CONVEX.md`.
