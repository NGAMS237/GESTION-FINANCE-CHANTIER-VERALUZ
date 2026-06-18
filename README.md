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
- **Backend** : Supabase (PostgreSQL + Storage + RLS)
- **Librairies** : Chart.js 4, jsPDF 2.5, PDF.js 3.11, Tesseract.js 5

## Utilisation

Ouvrir `chantier-finance-demo.html` dans un navigateur moderne.  
Configurer les credentials Supabase dans les variables `SUPABASE_URL` et `SUPABASE_ANON_KEY`.
