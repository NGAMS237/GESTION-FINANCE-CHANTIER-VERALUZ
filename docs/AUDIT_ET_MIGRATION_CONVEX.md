# Audit et plan de migration vers Convex — Gestion Finance Chantier

Audit statique du dépôt (commit `98f421b`), sans connexion à la base de production.

## 1. État actuel

| Élément | Constat |
|---|---|
| Application | Un seul fichier HTML/JS vanilla de 4 051 lignes (232 Ko), publié sur GitHub Pages |
| Doublon | `index.html` et `chantier-finance-demo.html` sont **identiques** octet pour octet |
| Backend | Supabase, projet `dfdmasejsoibxrvubegu` (le **même projet** que `mako-city_suivis_ok`), client `supabase-js` avec la clé `anon` |
| Données | 7 tables : `projects` → `project_categories` → `project_phases` → `project_quotes` → `project_payments`, plus `project_suppliers` et `project_documents` |
| Fichiers | Bucket Storage `chantier-docs`, URLs **publiques** (`getPublicUrl`) |
| Librairies (CDN) | Chart.js 4.4.3, jsPDF 2.5.1 + AutoTable 3.8.2, PDF.js 3.11.174, Tesseract.js 5, supabase-js 2 (version non figée) |
| CI | Un workflow `supabase-keepalive.yml` qui interroge la base tous les 5 jours pour empêcher la mise en veille |
| Tests | Aucun |

## 2. Constats

### 🔴 Critique

**C1. Aucune authentification.** L'application n'a ni écran de connexion ni contrôle d'accès.
Toute lecture et toute écriture passent par la clé `anon`, publique puisqu'elle est dans la page.
Sauf RLS restrictive côté base (à vérifier, pas visible dans le dépôt), n'importe qui peut lire,
modifier ou supprimer les budgets, devis, paiements et fournisseurs avec un simple `curl`.

**C2. Documents publics.** Les devis et factures du bucket `chantier-docs` sont servis par URL
publique : toute personne qui obtient le lien (ou devine le chemin `projectId/devis-ocr/…`) peut
les télécharger.

**C3. Base partagée avec `mako-city_suivis_ok`.** Le même projet Supabase héberge les données RH et
les PIN de l'autre application, dont la fonction `reset-employee-pin` n'est pas protégée.
Une faille de l'une expose l'autre.

### 🟠 Bug

**B1. Le versement saisi depuis la fiche d'un devis n'est jamais enregistré.**
`saveQuote()` (ligne 3263) insère le champ `notes` dans `project_payments`, alors que la colonne
est `note` (ligne 3315 et toutes les lectures). PostgREST rejette l'insertion et l'utilisateur
voit « ⚠ versement non enregistré ». Le paiement saisi par `savePay()` fonctionne.

### 🟡 Moyen

- **M1.** Pas de transaction : supprimer un projet ou une catégorie repose sur les cascades SQL non versionnées ; le schéma n'existe nulle part dans le dépôt.
- **M2.** Montants stockés en `Number` JavaScript : correct pour des FCFA entiers, à garder entiers dans Convex.
- **M3.** `supabase-js@2` non figé sur le CDN : une nouvelle version peut casser la page sans changement de code.
- **M4.** 54 `innerHTML`, mais les valeurs utilisateur passent par `esc()` : risque XSS faible.

## 3. Correspondance Supabase → Convex

| Aujourd'hui | Cible Convex |
|---|---|
| 7 tables Postgres | 7 tables dans `convex/schema.ts`, relations par `v.id("…")`, index `by_project`, `by_category`, `by_phase`, `by_quote` |
| Requête imbriquée `categories → phases → quotes → payments` | Une `query` `projects.getTree` qui renvoie l'arbre complet du projet actif, réactive |
| `insert` / `update` / `delete` directs | `mutation` par action métier, validant les arguments ; suppression en cascade dans la même transaction |
| Aucune auth | Convex Auth (e-mail + mot de passe), accès limité à une liste d'utilisateurs autorisés |
| Bucket public `chantier-docs` | Convex File Storage : `generateUploadUrl` + URLs servies seulement aux utilisateurs connectés |
| Workflow keep-alive | Supprimé : un déploiement Convex ne se met pas en veille |

Le frontend reste un fichier HTML vanilla : seul le client change (`ConvexClient` au lieu de
`supabase-js`). Graphiques, PDF et OCR ne bougent pas.

## 4. Étapes

1. **Socle** : `package.json`, `convex/schema.ts`, fonctions `query`/`mutation`, tests `convex-test` + Vitest.
2. **Auth** : Convex Auth, écran de connexion, liste blanche d'e-mails.
3. **Frontend** : remplacer les ~35 appels `sb.from(...)` et `sb.storage` par le client Convex ; suppression du doublon `chantier-finance-demo.html`.
4. **Données** : export JSONL des 7 tables Supabase, script de conversion (UUID → `legacyId`, résolution des clés étrangères), `npx convex import`, téléversement des fichiers du bucket vers Convex Storage.
5. **Bascule** : publication, vérification des totaux (budget, engagé, payé) avant/après, puis Supabase en lecture seule.

## 5. Prérequis

- Un projet Convex et une **deploy key** de développement, stockée dans l'environnement de la session (`CONVEX_DEPLOY_KEY`), jamais dans la conversation ni dans le dépôt.
- Un export des 7 tables et du bucket `chantier-docs`, ou un accès en lecture seule, pour l'étape 4.
