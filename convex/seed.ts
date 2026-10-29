import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Run once to import all Supabase data into Convex
// Call via: npx convex run seed:importAll
export const importAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("projects").first();
    if (existing) {
      return { message: "Already seeded — skipping", project_id: existing._id };
    }

    // ── 1. PROJECT ──────────────────────────────────────────────────────────
    const projectId = await ctx.db.insert("projects", {
      name: "Résidence Veraluz",
      description: "Immeuble R+3 en construction. Maître d'ouvrage : Nganbou Zimba Blaise",
      location: "Marco City, Kribi-Lobé, Cameroun",
      budget: 15000000,
      currency: "FCFA",
      start_date: "2026-01-01",
      status: "active",
      color: "#6366f1",
      owner_name: "Nganbou Zimba Blaise",
      position: 0,
    });

    // ── 2. SUPPLIERS ────────────────────────────────────────────────────────
    const sup: Record<string, Id<"suppliers">> = {};

    sup["plombier"] = await ctx.db.insert("suppliers", {
      project_id: projectId,
      name: "Plombier Mako City",
      phone: "—",
      address: "Kribi, Cameroun",
      speciality: "Plomberie",
    });
    sup["hdtelecom"] = await ctx.db.insert("suppliers", {
      project_id: projectId,
      name: "HD Telecom — Ngakam Billy",
      phone: "679 38 14 37",
      address: "Bonamoussadi, Douala",
      speciality: "Caméras, WiFi, Téléphonie",
    });
    sup["fiscalid"] = await ctx.db.insert("suppliers", {
      project_id: projectId,
      name: "FiscaLid — Lindjeck Kack Daniel",
      phone: "+32 465 286 748",
      address: "Molenbeek-Saint-Jean, Bruxelles",
      speciality: "Conseil fiscal, Création SARL",
    });
    sup["augustin"] = await ctx.db.insert("suppliers", {
      project_id: projectId,
      name: "Augustin Tonga",
      address: "Kribi",
      speciality: "Maitre d ouvrage",
    });
    sup["ecgi"] = await ctx.db.insert("suppliers", {
      project_id: projectId,
      name: "ECGI SARL",
      phone: "+237 656720404",
      email: "ntongalogane@gmail.com",
      address: "Kribi, Cameroun",
      speciality: "Gros oeuvre BTP — Réalisation ouvrages",
    });
    sup["willy"] = await ctx.db.insert("suppliers", {
      project_id: projectId,
      name: "Willy Enam",
      address: "Kribi, Cameroun",
      speciality: "Fabrication parpaings",
    });
    sup["elec"] = await ctx.db.insert("suppliers", {
      project_id: projectId,
      name: "Electricien",
      address: "Kribi",
      speciality: "Electricien",
    });
    sup["chicdesign"] = await ctx.db.insert("suppliers", {
      project_id: projectId,
      name: "Chic design",
      phone: "656214595",
      address: "Yaounde",
      speciality: "Deco interieur",
    });
    sup["genesis"] = await ctx.db.insert("suppliers", {
      project_id: projectId,
      name: "Genesis Digital Agency",
      phone: "657285219 / 652164313",
      email: "genesisdigital237@gmail.com",
      address: "Kribi",
      speciality: "Community Management",
    });

    // ── 3. CATEGORIES ───────────────────────────────────────────────────────
    const cat: Record<string, Id<"categories">> = {};

    cat["plomberie"] = await ctx.db.insert("categories", {
      project_id: projectId, name: "Plomberie",
      description: "Alimentation eau chaude/froide et évacuation",
      color: "#64748b", icon: "ti-droplet", position: 1,
    });
    cat["telecom"] = await ctx.db.insert("categories", {
      project_id: projectId, name: "Telecom & Réseaux",
      description: "Câblage électrique, caméras, WiFi, téléphonie",
      color: "#f59e0b", icon: "ti-bolt", position: 2,
    });
    cat["fiscal"] = await ctx.db.insert("categories", {
      project_id: projectId, name: "Fiscaliste",
      description: "Création SARL et immatriculation fiscale",
      color: "#10b981", icon: "ti-file-certificate", position: 3,
    });
    cat["grosoeuvre"] = await ctx.db.insert("categories", {
      project_id: projectId, name: "Gros Oeuvre",
      description: "Fondations, maçonnerie, béton armé",
      color: "#ef4444", icon: "ti-building", position: 4,
    });
    cat["deco"] = await ctx.db.insert("categories", {
      project_id: projectId, name: "Decoration Interieur",
      description: "Carrelage, faïence, parquet",
      color: "#8b5cf6", icon: "ti-layout-grid", position: 5,
    });
    cat["peinture"] = await ctx.db.insert("categories", {
      project_id: projectId, name: "Peinture",
      description: "Peinture intérieure et extérieure",
      color: "#ec4899", icon: "ti-paint", position: 6,
    });
    cat["elec"] = await ctx.db.insert("categories", {
      project_id: projectId, name: "Electricite",
      description: "electricite du batiment",
      color: "#3b82f6", icon: "ti-tag", position: 7,
    });
    cat["commu"] = await ctx.db.insert("categories", {
      project_id: projectId, name: "Community Management",
      description: "Com social media",
      color: "#f97316", icon: "ti-tag", position: 8,
    });

    // ── 4. PHASES ───────────────────────────────────────────────────────────
    const ph: Record<string, Id<"phases">> = {};

    // Plomberie
    ph["p1"] = await ctx.db.insert("phases", { category_id: cat["plomberie"], name: "Alimentation eau (EF + EC)", description: "2 salles de bain + 1 cuisine", position: 1, status: "in_progress" });
    ph["p2"] = await ctx.db.insert("phases", { category_id: cat["plomberie"], name: "Évacuation et drainage", description: "Drainage vers les fosses", position: 2, status: "pending" });
    // Telecom
    ph["t1"] = await ctx.db.insert("phases", { category_id: cat["telecom"], name: "Gaines avant coulage dalle RDC", description: "Electricité, réseau, caméras, téléphone + piquet de terre", position: 1, status: "completed" });
    ph["t2"] = await ctx.db.insert("phases", { category_id: cat["telecom"], name: "Caméras vidéosurveillance R+3", description: "10 caméras IP 5Mp du RDC au niveau 3", position: 2, status: "in_progress" });
    ph["t3"] = await ctx.db.insert("phases", { category_id: cat["telecom"], name: "Téléphonie IP Grandstream", description: "Installation téléphones IP R+3", position: 3, status: "pending" });
    ph["t4"] = await ctx.db.insert("phases", { category_id: cat["telecom"], name: "Connexion WiFi RDC - Niveau 3", description: "5 access points TP-Link, switches POE", position: 4, status: "pending" });
    // Fiscal
    ph["f1"] = await ctx.db.insert("phases", { category_id: cat["fiscal"], name: "Création SARL Cameroun", description: "Statuts OHADA, CFCE, immatriculation fiscale", position: 1, status: "in_progress" });
    // Gros Oeuvre
    ph["g0"] = await ctx.db.insert("phases", { category_id: cat["grosoeuvre"], name: "PARP — Fabrication Parpaings", description: "Pré-phase : fabrication de 25 000 parpaings", position: 0, status: "in_progress" });
    ph["gA"] = await ctx.db.insert("phases", { category_id: cat["grosoeuvre"], name: "A — Déblayage + Alimentation eau", description: "Chaise implantation, fouilles linéaires (20m³), fouilles profondes (40m³)", position: 1, status: "pending" });
    ph["gB"] = await ctx.db.insert("phases", { category_id: cat["grosoeuvre"], name: "B — Fondation", description: "Radier + semelles filantes + poteaux RDC", position: 2, status: "completed" });
    ph["gC"] = await ctx.db.insert("phases", { category_id: cat["grosoeuvre"], name: "C — Élévation Rez-de-chaussée", description: "Montage parpaings + chaîneaux + poteaux RDC", position: 3, status: "completed" });
    ph["gD"] = await ctx.db.insert("phases", { category_id: cat["grosoeuvre"], name: "D — Dallage 1", description: "Dalle portée RDC — oudis + ferraillage + coulage", position: 4, status: "pending" });
    ph["gE"] = await ctx.db.insert("phases", { category_id: cat["grosoeuvre"], name: "E — Élévation R+1", description: "Montage parpaings + chaîneaux R+1", position: 5, status: "pending" });
    ph["gF"] = await ctx.db.insert("phases", { category_id: cat["grosoeuvre"], name: "F — Dallage 2", description: "Dalle portée R+1 — oudis + ferraillage + coulage", position: 6, status: "pending" });
    ph["gG"] = await ctx.db.insert("phases", { category_id: cat["grosoeuvre"], name: "G — Élévation R+2", description: "Montage parpaings + chaîneaux R+2", position: 7, status: "pending" });
    ph["gH"] = await ctx.db.insert("phases", { category_id: cat["grosoeuvre"], name: "H — Dallage 3", description: "Dalle portée R+2 — oudis + ferraillage + coulage", position: 8, status: "pending" });
    ph["gI"] = await ctx.db.insert("phases", { category_id: cat["grosoeuvre"], name: "I — Élévation R+3", description: "Montage parpaings + chaîneaux R+3", position: 9, status: "pending" });
    ph["gDiv"] = await ctx.db.insert("phases", { category_id: cat["grosoeuvre"], name: "Divers / Travaux annexes", description: "Poteaux regard Eboné, électricien, réalisation des plans", position: 10, status: "in_progress" });
    // Elec
    ph["e1"] = await ctx.db.insert("phases", { category_id: cat["elec"], name: "Electricite RC", description: "", position: 1, status: "pending" });
    // Deco
    ph["d1"] = await ctx.db.insert("phases", { category_id: cat["deco"], name: "Plan 2D", description: "Design d interieur", position: 1, status: "in_progress" });
    // Community
    ph["cm1"] = await ctx.db.insert("phases", { category_id: cat["commu"], name: "com social media", description: "tiktok/facebook/insta/youtube", position: 1, status: "pending" });

    // ── 5. QUOTES ───────────────────────────────────────────────────────────
    const q: Record<string, Id<"quotes">> = {};

    q["parp"] = await ctx.db.insert("quotes", { phase_id: ph["g0"], supplier_id: sup["willy"], number: "DV-PARP", description: "Fabrication 25 000 parpaings — charge Mr Blaise (7 000 cmd Willy Enam)", date: "2026-03-01", amount: 8300000, currency: "FCFA", status: "partial" });
    q["qA"] = await ctx.db.insert("quotes", { phase_id: ph["gA"], supplier_id: sup["ecgi"], number: "DV-A", description: "Phase A — Déblayage + alimentation eau", date: "2026-03-01", amount: 200000, currency: "FCFA", status: "pending" });
    q["qB"] = await ctx.db.insert("quotes", { phase_id: ph["gB"], supplier_id: sup["ecgi"], number: "DV-B", description: "Phase B — Fondation (matériaux + MO) — ECGI SARL", date: "2026-03-01", amount: 6853375, currency: "FCFA", status: "paid" });
    q["qC"] = await ctx.db.insert("quotes", { phase_id: ph["gC"], supplier_id: sup["ecgi"], number: "DV-C", description: "Phase C — Élévation Rez-de-chaussée (matériaux + MO) — ECGI SARL", date: "2026-05-01", amount: 5440000, currency: "FCFA", status: "paid" });
    q["qD"] = await ctx.db.insert("quotes", { phase_id: ph["gD"], supplier_id: sup["ecgi"], number: "DV-D", description: "Phase D — Dallage 1 (oudis, ferraillage, coulage)", date: "2026-01-01", amount: 5769375, currency: "FCFA", status: "partial" });
    q["qE"] = await ctx.db.insert("quotes", { phase_id: ph["gE"], supplier_id: sup["ecgi"], number: "DV-E", description: "Phase E — Élévation R+1 (parpaings, ciment, fer)", date: "2026-01-01", amount: 4552500, currency: "FCFA", status: "pending" });
    q["qF"] = await ctx.db.insert("quotes", { phase_id: ph["gF"], supplier_id: sup["ecgi"], number: "DV-F", description: "Phase F — Dallage 2 (oudis, ferraillage, coulage)", date: "2026-01-01", amount: 6506875, currency: "FCFA", status: "pending" });
    q["qG"] = await ctx.db.insert("quotes", { phase_id: ph["gG"], supplier_id: sup["ecgi"], number: "DV-G", description: "Phase G — Élévation R+2 (parpaings, ciment, fer)", date: "2026-01-01", amount: 4902500, currency: "FCFA", status: "pending" });
    q["qH"] = await ctx.db.insert("quotes", { phase_id: ph["gH"], supplier_id: sup["ecgi"], number: "DV-H", description: "Phase H — Dallage 3 (oudis, ferraillage, coulage)", date: "2026-01-01", amount: 6506875, currency: "FCFA", status: "pending" });
    q["qI"] = await ctx.db.insert("quotes", { phase_id: ph["gI"], supplier_id: sup["ecgi"], number: "DV-I", description: "Phase I — Élévation R+3 (parpaings, ciment, fer)", date: "2026-01-01", amount: 4675000, currency: "FCFA", status: "pending" });
    q["qDiv"] = await ctx.db.insert("quotes", { phase_id: ph["gDiv"], number: "DV-DIV", description: "Travaux annexes divers (poteaux regard Eboné, électricien, plans)", date: "2026-03-12", amount: 1265000, currency: "FCFA", status: "paid" });
    q["cam"] = await ctx.db.insert("quotes", { phase_id: ph["t2"], supplier_id: sup["hdtelecom"], number: "DEV-004", description: "Caméras IP 5Mp — installation RDC au niveau 3 (matériel + MO 500 000)", date: "2026-06-16", amount: 1152000, currency: "FCFA", status: "approved" });
    q["mo"] = await ctx.db.insert("quotes", { phase_id: ph["t1"], supplier_id: sup["hdtelecom"], number: "DEV-003", description: "MAIN D'ŒUVRE GENERALE", date: "2026-02-01", amount: 500000, currency: "FCFA", status: "approved" });
    q["tel"] = await ctx.db.insert("quotes", { phase_id: ph["t3"], supplier_id: sup["hdtelecom"], number: "DEV-005", description: "Téléphonie IP Grandstream — R+3", date: "2026-06-16", amount: 470000, currency: "FCFA", status: "approved" });
    q["wifi"] = await ctx.db.insert("quotes", { phase_id: ph["t4"], supplier_id: sup["hdtelecom"], number: "DEV-006", description: "Connexion WiFi RDC au niveau 3 — 5 access points TP-Link", date: "2026-06-16", amount: 655000, currency: "FCFA", status: "approved" });
    q["elec"] = await ctx.db.insert("quotes", { phase_id: ph["e1"], supplier_id: sup["elec"], number: "DEV-007", description: "Electricite", date: "2026-06-18", amount: 823500, currency: "FCFA", status: "paid" });
    q["deco"] = await ctx.db.insert("quotes", { phase_id: ph["d1"], supplier_id: sup["chicdesign"], number: "Dev-008", description: "Conception des plan 2D deco", date: "2026-06-18", amount: 390000, currency: "FCFA", status: "partial" });
    q["com"] = await ctx.db.insert("quotes", { phase_id: ph["cm1"], supplier_id: sup["genesis"], number: "DEV--008", description: "Com teasing", date: "2026-06-19", amount: 150000, currency: "FCFA", status: "partial" });
    q["evac"] = await ctx.db.insert("quotes", { phase_id: ph["p2"], supplier_id: sup["plombier"], number: "DEV-002", description: "Évacuation et drainage — 2 SdB + cuisine", date: "2026-01-15", amount: 319900, currency: "FCFA", status: "paid" });
    q["sarl"] = await ctx.db.insert("quotes", { phase_id: ph["f1"], supplier_id: sup["fiscalid"], number: "DEV-007", description: "Création SARL Cameroun — statuts OHADA + CFCE + immatriculation fiscale (306 EUR)", date: "2026-06-17", amount: 487977, currency: "FCFA", status: "partial", notes: "306 EURO" });
    q["alim"] = await ctx.db.insert("quotes", { phase_id: ph["p1"], supplier_id: sup["plombier"], number: "DEV-001", description: "Alimentation eau EF+EC — 2 SdB + 1 cuisine (matériel + MO)", date: "2026-01-15", amount: 450700, currency: "FCFA", status: "paid" });

    // ── 6. PAYMENTS ─────────────────────────────────────────────────────────
    await ctx.db.insert("payments", { quote_id: q["parp"], date: "2026-04-19", amount: 150000, method: "virement", note: "Paiement parpaings PARP" });
    await ctx.db.insert("payments", { quote_id: q["parp"], date: "2026-04-17", amount: 160000, method: "virement", note: "Paiement parpaings PARP" });
    await ctx.db.insert("payments", { quote_id: q["parp"], date: "2026-03-30", amount: 150000, method: "virement", note: "Paiement parpaings PARP" });
    await ctx.db.insert("payments", { quote_id: q["qB"], date: "2026-05-14", amount: 4158000, method: "virement", note: "Paiement fondation Phase B" });
    await ctx.db.insert("payments", { quote_id: q["qB"], date: "2026-04-29", amount: 2090000, method: "virement", note: "Paiement fondation Phase B" });
    await ctx.db.insert("payments", { quote_id: q["qB"], date: "2026-04-23", amount: 1200000, method: "virement", note: "Paiement fondation Phase B" });
    await ctx.db.insert("payments", { quote_id: q["qC"], date: "2026-06-13", amount: 1500000, method: "virement", note: "Paiement élévation RDC Phase C" });
    await ctx.db.insert("payments", { quote_id: q["qC"], date: "2026-06-05", amount: 2440000, method: "virement", note: "Paiement élévation RDC Phase C" });
    await ctx.db.insert("payments", { quote_id: q["qC"], date: "2026-05-29", amount: 3000000, method: "virement", note: "Paiement élévation RDC Phase C" });
    await ctx.db.insert("payments", { quote_id: q["qDiv"], date: "2026-05-29", amount: 265000, method: "virement", note: "Poteaux regard Eboné" });
    await ctx.db.insert("payments", { quote_id: q["qDiv"], date: "2026-05-05", amount: 920000, method: "virement", note: "Électricien + divers" });
    await ctx.db.insert("payments", { quote_id: q["qDiv"], date: "2026-03-12", amount: 80000, method: "virement", note: "Plans architecte" });
    await ctx.db.insert("payments", { quote_id: q["mo"], date: "2026-06-18", amount: 100000, method: "mobile" });
    await ctx.db.insert("payments", { quote_id: q["alim"], date: "2026-06-18", amount: 450700, method: "mobile" });
    await ctx.db.insert("payments", { quote_id: q["evac"], date: "2026-06-18", amount: 319900, method: "mobile" });
    await ctx.db.insert("payments", { quote_id: q["elec"], date: "2026-06-18", amount: 823500, method: "mobile" });
    await ctx.db.insert("payments", { quote_id: q["qD"], date: "2026-06-18", amount: 1815000, method: "mobile" });
    await ctx.db.insert("payments", { quote_id: q["deco"], date: "2026-06-13", amount: 150000, method: "mobile" });
    await ctx.db.insert("payments", { quote_id: q["com"], date: "2026-06-03", amount: 15000, method: "mobile" });
    await ctx.db.insert("payments", { quote_id: q["com"], date: "2026-06-19", amount: 15000, method: "mobile" });
    await ctx.db.insert("payments", { quote_id: q["qD"], date: "2026-06-25", amount: 1250000, method: "mobile", note: "Willy enam/ntonga Augustin" });
    await ctx.db.insert("payments", { quote_id: q["qD"], date: "2026-06-26", amount: 800000, method: "mobile", note: "Willy enam/ntonga Augustin" });
    await ctx.db.insert("payments", { quote_id: q["sarl"], date: "2026-06-26", amount: 103000, method: "virement" });
    await ctx.db.insert("payments", { quote_id: q["sarl"], date: "2026-06-26", amount: 180000, method: "mobile", reference: "Avance constitution sarl", note: "Avance sarl" });
    await ctx.db.insert("payments", { quote_id: q["qD"], date: "2026-07-21", amount: 2200000, method: "mobile" });
    await ctx.db.insert("payments", { quote_id: q["sarl"], date: "2026-07-17", amount: 205000, method: "virement", note: "solde lindjeck" });

    return { message: "Import réussi ✅", project_id: projectId };
  },
});
