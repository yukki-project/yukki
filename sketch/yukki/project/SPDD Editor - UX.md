# yuki — éditeur guidé de stories SPDD

> Conception UX de l'éditeur structuré avec assistance IA (story FRONT-002).
> Document de design — pas de code, pas de copywriting final, pas de pixel-perfect.

---

## 1. Principes directeurs UX

L'éditeur n'est pas un Word stylé : c'est un **rail**. La structure SPDD est rendue visible et palpable, mais le rédacteur ne se cogne jamais contre elle. On adopte la posture du **bon stagiaire** : on rappelle la consigne, on signale ce qui manque, on explique pourquoi — sans bloquer la pensée. Trois trade-offs assumés :

- **Forcer la structure, pas le rythme.** Les sections sont fixes et ordonnées dans le DOM, mais l'utilisateur peut les remplir dans l'ordre qu'il veut, sauter, revenir. La validation est *passive* (sommaire qui se remplit) plutôt qu'*active* (modale qui hurle).
- **Markdown vérité, WYSIWYG cosmétique.** La source canonique est le markdown ; le WYSIWYG est une vue dérivée qu'on garde **isomorphe** (toute opération en WYSIWYG produit un markdown que la vue brute affiche tel quel). Conséquence : pas de rich-text propriétaire (pas d'underline, pas de couleurs).
- **L'IA propose, l'humain dispose, toujours.** Aucune mutation implicite du texte. Une suggestion = un panneau de comparaison + accept/reject. La transparence sur le prompt envoyé fait partie du livrable, pas un bonus.

Cibles : PO (rédacteur principal, peu familier de SPDD), Lead tech (challenge, finalise), Dev (stories de dette/bugs). On optimise d'abord pour le **PO en train d'apprendre SPDD**, le reste suit.

---

## 2. Information architecture

```
┌─ TopBar ─ titre · status pill · auto-save · export ──────────────┐
│                                                                   │
│ ┌─ Sommaire ─┐  ┌─ Édition principale ──────────┐  ┌─ Side ────┐ │
│ │            │  │                                │  │           │ │
│ │ Front-     │  │  Front-matter                  │  │ Inspector │ │
│ │ matter ●   │  │   (form auto-validée)          │  │ (selon    │ │
│ │ Background │  │                                │  │  contexte)│ │
│ │ Bus.Value  │  │  ## Background                 │  │           │ │
│ │ Scope In ● │  │   …prose…                      │  │ AI panel  │ │
│ │ Scope Out  │  │                                │  │ s'ouvre   │ │
│ │ AC ●       │  │  ## Acceptance Criteria        │  │ ici quand │ │
│ │ Open Q.    │  │   AC-1 [Given/When/Then]       │  │ suggestion│ │
│ │ Notes      │  │   AC-2 [Given/When/Then]       │  │           │ │
│ │            │  │                                │  │           │ │
│ └────────────┘  └────────────────────────────────┘  └───────────┘ │
│                                                                   │
│ ┌─ Footer ─ progrès ──────────── 5/6 sections obligatoires ─────┐│
└───────────────────────────────────────────────────────────────────┘
```

**Trois zones, trois rôles :**

| Zone | Rôle | Toujours visible ? |
|---|---|---|
| **Sommaire (gauche, 220px)** | Navigation + état d'avancement par section. Les `●` rouges = obligatoire vide ; `○` gris = optionnel. Click → scroll-to. Active section soulignée. | Oui (collapsible) |
| **Édition (centre, fluide)** | Document complet, scrollable. Sections ordonnées. WYSIWYG par défaut, bascule markdown brut via `⌘/`. Une seule sélection IA active à la fois. | Oui |
| **Inspector (droite, 360px)** | Polymorphe : (a) front-matter helper quand le caret est dedans, (b) AC inspector quand on édite un AC, (c) **diff IA** quand une suggestion est en cours de revue. | Oui pour suggestions IA, sinon collapsible |

**Actions** :
- **Toolbar inline** flottante (bold/italic/list/code/link) — apparaît au survol d'un paragraphe ou sur sélection. Pas de toolbar permanente en haut.
- **Menu contextuel IA** sur sélection (≥3 mots) — popover sous la sélection, 4 actions.
- **Footer d'export** sticky bas — bouton `Exporter .md` + checklist cliquable des manquants.
- **Palette ⌘K** pour tout (changer status, sauter section, basculer markdown, dupliquer AC…).

---

## 3. Wireframes ASCII

### 3.1 — Écran principal, édition d'une AC

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ FRONT-002 · Éditeur guidé SPDD                  draft  ·  saved 14:02   [⤓] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌── SECTIONS ────┐  ┌─ Acceptance Criteria ──────────────────────────────┐  │
│ │                │  │                                                    │  │
│ │ ▣ Front-matter │  │ ## AC-1 — Saisie d'un Given/When/Then valide      │  │
│ │ ▣ Background   │  │ ┌──────────────────────────────────────────────┐ │  │
│ │ ▣ Business Val │  │ │ Given     un nouveau formulaire d'AC vide    │ │  │
│ │ ▣ Scope In     │  │ ├──────────────────────────────────────────────┤ │  │
│ │ ○ Scope Out    │  │ │ When      le rédacteur saisit les 3 zones    │ │  │
│ │ ▶ Acceptance c.│  │ │           et clique "Ajouter"                │ │  │
│ │   AC-1  ✓      │  │ ├──────────────────────────────────────────────┤ │  │
│ │   AC-2  ▶      │  │ │ Then      l'AC s'ajoute en bas de la liste,  │ │  │
│ │   AC-3  ⚠      │  │ │           le compteur passe à n+1            │ │  │
│ │   + AC         │  │ └──────────────────────────────────────────────┘ │  │
│ │ ● Open Quest.  │  │                                                    │  │
│ │ ○ Notes        │  │ ## AC-2 — Réordonner deux AC ────────── ▶ ▼ ✕   │  │
│ │                │  │ Given      la story contient 2 AC                  │  │
│ │ ─────────────  │  │ When       …                                       │  │
│ │ 5/6 obligat.   │  │ ▕                                                  │  │
│ │                │  │                                                    │  │
│ └────────────────┘  │ + Ajouter un AC                                    │  │
│                     └────────────────────────────────────────────────────┘  │
│                                                                              │
│ ────────────────────────────────────────────────────────────────────────────│
│ ⚠ 1 manquant : "Open Questions" (obligatoire si la story est en draft)      │
│                                              [ Voir checklist ]  [ Exporter ]│
└──────────────────────────────────────────────────────────────────────────────┘
```

**Choix justifiés** :
- **Sommaire à gauche persistant** : la navigation est l'enjeu n°1 pour un rédacteur SPDD débutant. Un stepper horizontal tasserait à 7 étapes ; un sticky header se perdrait dans le scroll.
- **AC = bloc tabulaire 3 lignes** (Given/When/Then) plutôt que 3 inputs séparés : on lit l'AC d'un coup, l'œil suit la grammaire.
- **Compteur "5/6 obligatoires"** dans le sommaire ET dans le footer — feedback redondant exprès, le rédacteur le voit même quand il scrolle dans le document.
- **L'AC en cours d'édition** n'a pas de chrome supplémentaire (pas de "edit mode") : on tape, c'est tout.
- **Bouton Exporter actif visuellement mais bloqué fonctionnellement** tant que `manquants > 0` — le tooltip explique pourquoi (cf. §6).

---

### 3.2 — Mode markdown brut (toggle ⌘/)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ FRONT-002 · Éditeur guidé SPDD          draft  ·  saved 14:02     ⌘/ on  [⤓]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌── SECTIONS ────┐  ┌─ Document — markdown ──────────────────────────────┐  │
│ │                │  │                                                    │  │
│ │ ▣ Front-matter │  │   1 ┃ ---                                          │  │
│ │ ▣ Background   │  │   2 ┃ id: FRONT-002                                │  │
│ │ ▣ Business Val │  │   3 ┃ slug: spdd-editor                            │  │
│ │ ▣ Scope In     │  │   4 ┃ title: Éditeur guidé SPDD                    │  │
│ │ ○ Scope Out    │  │   5 ┃ status: draft                                │  │
│ │ ▶ Acceptance c.│  │   6 ┃ created: 2026-04-12                          │  │
│ │ ● Open Quest.  │  │   7 ┃ ---                                          │  │
│ │ ○ Notes        │  │   8 ┃                                              │  │
│ │                │  │   9 ┃ ## Background                                │  │
│ │ ─────────────  │  │  10 ┃                                              │  │
│ │ 5/6 obligat.   │  │  11 ┃ Aujourd'hui les stories se rédigent à la…    │  │
│ │                │  │  …                                                 │  │
│ └────────────────┘  │  42 ┃ ## Acceptance Criteria                       │  │
│                     │  43 ┃                                              │  │
│                     │  44 ┃ ### AC-1 — Saisie d'un Given/When/Then…      │  │
│                     │  45 ┃                                              │  │
│                     │  46 ┃ - **Given** un nouveau formulaire d'AC vide  │  │
│                     │  47 ┃ - **When** le rédacteur saisit les 3 zones   │  │
│                     │  48 ┃   et clique « Ajouter »                      │  │
│                     │  49 ┃ - **Then** l'AC s'ajoute…                    │  │
│                     │  …                                                 │  │
│                     └────────────────────────────────────────────────────┘  │
│                                                                              │
│ ⓘ Mode markdown — la mise en forme reste éditable. ⌘/ pour revenir au WYSIWYG│
└──────────────────────────────────────────────────────────────────────────────┘
```

**Choix justifiés** :
- **Numéros de ligne** + **fonte mono** : signaux visuels qui disent "tu es dans le code". Le sommaire reste utilisable (click → scroll vers la ligne du heading).
- **Pas de bascule par section** : c'est tout-ou-rien. Empêche les états mentaux schizophréniques ("où est-ce que je suis en WYSIWYG ?").
- **Round-trip garanti** : la conversion `wysiwyg ↔ md` est testée par un fuzzer. Si jamais une perte est détectée (ex: HTML injecté dans le markdown via paste), un bandeau jaune avertit avant la bascule. Cf. risque §7.
- **Indicateur `⌘/ on`** dans la topbar : on sait qu'on est en mode brut sans ambiguïté.

---

### 3.3 — Menu contextuel d'assistance IA sur sélection

```
                                                                              
        ┌─ Édition ──────────────────────────────────────────────┐            
        │                                                        │            
        │ ## Background                                          │            
        │                                                        │            
        │ Aujourd'hui les stories se rédigent à la main dans     │            
        │ ┌──────────────────────────────────────────────────┐  │            
        │ │ un éditeur markdown générique, c'est lent et     │  │  ← sélection
        │ │ sujet à oublis de sections, et la qualité dépend │  │     (3 lignes)
        │ │ de la rigueur du rédacteur.                      │  │            
        │ └──────────────────────────────────────────────────┘  │            
        │   ╔══════════════════════════════════════════════════╗│            
        │   ║  ✦ Améliorer la lisibilité                       ║│ ← popover  
        │   ║  ✦ Enrichir le contenu                           ║│   sous la  
        │   ║  ✦ Reformuler                                    ║│   sélection
        │   ║  ✦ Raccourcir                                    ║│            
        │   ║  ─────────────────────────────────────────────── ║│            
        │   ║  ⓘ Yuki sait que tu rédiges la section           ║│            
        │   ║    Background. Le contexte SPDD est inclus       ║│            
        │   ║    dans le prompt.                       Voir ▸  ║│            
        │   ╚══════════════════════════════════════════════════╝│            
        │                                                        │            
        │ Cette friction freine l'adoption de SPDD.              │            
        │                                                        │            
        └────────────────────────────────────────────────────────┘            
```

**Choix justifiés** :
- **Popover ancré sous la sélection**, pas une toolbar flottante — la sélection reste visible, l'utilisateur garde le contexte.
- **4 verbes courts**, ordonnés du plus *cosmétique* (lisibilité) au plus *transformateur* (raccourcir). Cf. microcopies §4 pour la justification du ton chaleureux.
- **Mention de transparence** intégrée au popover, pas masquée derrière une icône. Le `Voir ▸` ouvre le prompt complet dans une popover secondaire (lecture seule).
- **Aucun effet sur le texte tant qu'aucune action n'est cliquée.** Esc ferme. Click hors-popover ferme.
- **Sélection minimum : 3 mots**. En-deçà, le popover ne s'ouvre pas (signalé par un toast discret la première fois : *"Sélectionne un peu plus de texte pour activer Yuki."*).
- **Aria** : le popover est annoncé `aria-live="polite"` à l'ouverture, focus piégé dedans, Tab navigue les 4 actions.

---

### 3.4 — Panneau de comparaison avant/après

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ FRONT-002 · Éditeur guidé SPDD                  draft  ·  saved 14:02   [⤓] │
├────────────────────────────────────────────┬─────────────────────────────────┤
│                                            │  ✦ Suggestion de Yuki          │
│ ## Background                              │  ─────────────────────────────  │
│                                            │  Améliorer la lisibilité        │
│ Aujourd'hui les stories se rédigent à la   │                                 │
│ main dans                                  │  ┌─ Avant ───────────────────┐ │
│ ┌──────────────────────────────────────┐   │  │ un éditeur markdown       │ │
│ │ un éditeur markdown générique, c'est │   │  │ générique, c'est lent et  │ │
│ │ lent et sujet à oublis de sections,  │   │  │ sujet à oublis de         │ │
│ │ et la qualité dépend de la rigueur   │   │  │ sections, et la qualité   │ │
│ │ du rédacteur.                        │   │  │ dépend de la rigueur du   │ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │  │ rédacteur.                │ │
│ └──────────────────────────────────────┘   │  └───────────────────────────┘ │
│   (sélection grisée pendant la revue)      │                                 │
│                                            │  ┌─ Après ───────────────────┐ │
│ Cette friction freine l'adoption.          │  │ un éditeur markdown       │ │
│                                            │  │ générique. Cette          │ │
│                                            │  │ pratique est lente,       │ │
│                                            │  │ favorise les oublis et    │ │
│                                            │  │ rend la qualité           │ │
│                                            │  │ dépendante du rédacteur.  │ │
│                                            │  └───────────────────────────┘ │
│                                            │                                 │
│                                            │  ┌─ Diff ────────────────────┐ │
│                                            │  │ - …c'est lent et sujet à  │ │
│                                            │  │   oublis de sections, et  │ │
│                                            │  │   la qualité dépend…      │ │
│                                            │  │ + …Cette pratique est     │ │
│                                            │  │   lente, favorise les     │ │
│                                            │  │   oublis et rend la       │ │
│                                            │  │   qualité dépendante…     │ │
│                                            │  └───────────────────────────┘ │
│                                            │                                 │
│                                            │  ↻ Régénérer    ⓘ Voir prompt  │
│                                            │  ─────────────────────────────  │
│                                            │  [ Refuser ]  [ ✓ Accepter ]   │
└────────────────────────────────────────────┴─────────────────────────────────┘
```

**Choix justifiés** :
- **Split-view, pas modale** : on garde le contexte du document. La sélection reste visible (grisée à gauche) pendant la revue.
- **Trois vues du delta** : *Avant* / *Après* / *Diff* — chacune sert un cas d'usage. Le diff est primary pour les power-users, les deux blocs côte à côte pour les autres.
- **`Régénérer`** au-dessus des CTA : tentation de variation sans refaire la sélection.
- **Refuser / Accepter** : les deux verbes sont *symétriquement* mis en valeur (refuser n'est pas un "annuler" gris). Cf. §7 risque sur-confiance.
- **Aucune action automatique sur Esc** : Esc ferme le panneau et **rejette implicitement** la suggestion (avec toast `"Suggestion non appliquée."` pour confirmer).
- **`Voir prompt`** ouvre une popover lecture seule avec le prompt système + section SPDD injectée + sélection. Transparence.

---

## 4. Microcopies clés

### 4.1 — Actions génératives (FR, ton chaleureux/pédagogue)

| Action | Libellé | Pourquoi ce libellé |
|---|---|---|
| 1 | **Améliorer la lisibilité** | Verbe d'amélioration honnête, pas un ordre. Évite "Optimiser" (jargon). |
| 2 | **Enrichir le contenu** | "Enrichir" suppose qu'il y a déjà quelque chose — respect du travail du rédacteur. |
| 3 | **Reformuler** | Mot le plus neutre, le plus utilisé en français pédagogique. |
| 4 | **Raccourcir** | Direct, sans euphémisme. Mieux que "Synthétiser" (qui suggère un résumé hiérarchique). |

Posture choisie : **chaleureux mais professionnel**, pas familier. *"Yuki suggère…"*, pas *"Yuki pense que…"*. Pas de tutoiement de l'IA.

### 4.2 — Erreurs de validation du front-matter

| Champ | Règle | Message inline |
|---|---|---|
| `id` | Préfixe + numéro | *"L'identifiant doit suivre le format `PRÉFIXE-XXX` (ex. `FRONT-042`)."* |
| `slug` | kebab-case | *"Le slug n'accepte que des lettres minuscules, chiffres et tirets — pas d'espaces ni d'accents."* |
| `status` | enum | *"Le statut doit être l'un de : draft, reviewed, accepted, done, archived."* |
| `created` | ISO date | *"Format de date attendu : `AAAA-MM-JJ` (ex. `2026-04-12`)."* |
| `updated` | ISO date, ≥ created | *"La date de mise à jour doit être postérieure ou égale à la date de création."* |
| `owner` | non vide | *"Indique au moins un responsable — un email, un handle, ou ton équipe."* |
| `modules` | enum fermé | *"`{value}` n'est pas un module connu. Choisis dans la liste, ou demande à un lead d'en ajouter un."* |

Toutes les erreurs sont **inline sous le champ**, en rouge muted (pas écarlate), avec un picto `ⓘ`. Pas de modale, pas de toast.

### 4.3 — Empty states par section

Chaque empty state **enseigne SPDD** en 1-2 phrases. Couleur : muted, italique. Cliquer dedans place le caret.

| Section | Empty state |
|---|---|
| Background | *"Pose le décor : pourquoi cette story existe, dans quel projet, à quel moment. 2-4 phrases suffisent. (Background ≠ solution.)"* |
| Business Value | *"Quel utilisateur gagne quoi grâce à ça ? Format suggéré : « En tant que X, je veux Y, afin de Z. »"* |
| Scope In | *"Liste ce que cette story livre. Précis, observable, fini. Une puce = une chose."* |
| Scope Out | *"Liste ce qu'elle ne livre pas — pour fermer les portes. Optionnel mais recommandé."* |
| Acceptance Criteria | *"Décris un cas concret avec Given (état initial), When (action), Then (résultat observable). Yuki t'aidera à formuler."* + bouton `+ Ajouter un AC` |
| Open Questions | *"Une décision à trancher avant l'implémentation ? Note-la ici — c'est moins coûteux que de la découvrir en revue."* |
| Notes | *"Notes libres : décisions de design, refs vers d'autres stories, contexte qui ne rentre nulle part ailleurs."* |

### 4.4 — Confirmations et avertissements

| Situation | Texte | Type |
|---|---|---|
| Suggestion IA acceptée | *"Yuki a remplacé ta sélection. ⌘Z pour annuler."* | Toast 4s |
| Suggestion IA rejetée (Esc) | *"Suggestion non appliquée."* | Toast 2s |
| Bascule WYSIWYG → MD avec perte potentielle | *"⚠ Cette section contient du HTML qui ne sera pas converti proprement. Continuer en mode markdown ?"* | Modale, [Annuler] / [Continuer quand même] |
| Export bloqué | *"Il manque {n} sections obligatoires. Voici lesquelles :"* + checklist cliquable | Popover sous le bouton |
| Export réussi | *"FRONT-002.md téléchargé. 384 lignes, 7 sections."* | Toast 4s |
| Story non sauvée + tab close | *"Tes derniers changements ne sont pas synchronisés. Quitter quand même ?"* | Modale browser |
| Première sélection IA | *"Sélectionne un peu plus de texte (au moins 3 mots) pour activer les suggestions de Yuki."* | Toast 4s, une seule fois |

---

## 5. Design tokens

Repris du système yukki existant (Inter + JetBrains Mono, accent vert, neutres bleu-gris froids).

### 5.1 — Palette (rôles)

| Rôle | Light | Dark |
|---|---|---|
| `surface-0` (page) | `oklch(0.99 0.003 250)` | `oklch(0.165 0.012 250)` |
| `surface-1` (panel) | `oklch(0.975 0.005 250)` | `oklch(0.195 0.013 250)` |
| `surface-2` (card) | `oklch(1 0 0)` | `oklch(0.225 0.014 250)` |
| `text-primary` | `oklch(0.18 0.014 250)` | `oklch(0.96 0.010 250)` |
| `text-secondary` | `oklch(0.50 0.012 250)` | `oklch(0.66 0.011 250)` |
| `text-muted` | `oklch(0.62 0.011 250)` | `oklch(0.52 0.012 250)` |
| `line` | `oklch(0.88 0.010 250)` | `oklch(0.30 0.014 250)` |
| `primary` (actions, focus) | `oklch(0.55 0.17 150)` | `oklch(0.78 0.16 150)` |
| `success` (AC complète, saved) | `oklch(0.55 0.17 150)` | `oklch(0.78 0.16 150)` |
| `warning` (incomplet, manquant) | `oklch(0.62 0.16 70)` | `oklch(0.78 0.13 70)` |
| `danger` (validation error) | `oklch(0.55 0.18 18)` | `oklch(0.72 0.15 18)` |
| `info` (Yuki, suggestion IA) | `oklch(0.50 0.18 235)` | `oklch(0.74 0.13 235)` |

Contraste vérifié WCAG AA : `text-primary` sur `surface-0` ≥ 7:1 (AAA), `text-secondary` ≥ 4.5:1 (AA).

### 5.2 — Typographie

| Rôle | Famille | Taille | Poids | Line-height |
|---|---|---|---|---|
| display (titre story) | Inter | 22px | 600 | 1.25 |
| h2 (section heading) | Inter | 16px | 600 | 1.4 |
| h3 (AC title) | Inter | 14px | 600 | 1.4 |
| body | Inter | 14px | 400 | 1.55 |
| body-sm (sommaire, pills) | Inter | 12.5px | 500 | 1.4 |
| label / kicker | JetBrains Mono | 11px | 500 | 1.4 (uppercase, letter-spacing 0.06em) |
| code / markdown brut | JetBrains Mono | 13px | 400 | 1.55 |

Échelle d'espacement : `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`. Border-radius : `4 / 6 / 8` (panneaux). Pas plus.

### 5.3 — États interactifs

| État | Effet |
|---|---|
| `hover` | `surface +1 step` (ex: `surface-0` → `surface-1`), pas d'animation |
| `focus` | Ring 2px `primary` à 40% d'alpha, offset 2px. Toujours visible, jamais `outline: none`. |
| `active/pressed` | `surface +2 steps`, transform `scale(0.98)` 80ms |
| `disabled` | opacity 0.5, `cursor: not-allowed`, pas de hover |
| `error` | Bordure `danger`, label `danger`, picto `ⓘ`, message inline en `danger` |
| `loading` | Spinner monochromé (jamais une barre de progrès trompeuse) ; `aria-busy="true"` sur le conteneur |

---

## 6. Patterns d'interaction

### 6.1 — Navigation entre sections

| Méthode | Comportement |
|---|---|
| **Click sommaire** | `scrollIntoView({ behavior: 'smooth', block: 'start' })`, focus dans la première zone éditable de la section. |
| **`⌘↓` / `⌘↑`** | Section suivante / précédente. |
| **Scroll** | Le sommaire suit (active section mise en évidence) via IntersectionObserver. |
| **`⌘K` → tape un nom de section** | Saut direct (palette de commandes). |

Pas de scroll snap (trop rigide pour un éditeur). Pas de transitions verticales (juste un smooth-scroll de 200ms).

### 6.2 — Validation du front-matter

**Stratégie : on-blur + on-debounce.**

- À la frappe : *aucune* erreur affichée. On laisse écrire.
- Au blur du champ OU 800ms après la dernière frappe : validation, erreur inline si KO.
- Le sommaire indique l'état du front-matter en agrégé : `▣ Front-matter (2 erreurs)` en rouge si au moins une règle échoue.
- **Exception** : `slug` se valide *immédiatement* (chaque caractère invalide est strippé silencieusement, avec un tooltip qui s'affiche au premier strip : *"Le slug n'accepte que…"*).

### 6.3 — Réversibilité des actions IA

| Niveau | Geste | Effet |
|---|---|---|
| **L0** | Dans le panneau diff, clic `↻ Régénérer` | Nouvelle suggestion, l'ancienne est perdue (pas critique). |
| **L1** | Après acceptation, `⌘Z` | Annule la substitution. Toast confirme. |
| **L2** | Historique IA (popover dans `⌘K → "Historique IA"`) | Liste des 20 dernières suggestions de la session, avec horodatage et action prise. Permet de retrouver une suggestion refusée et de la ré-appliquer. |

L2 est une *garantie d'oubli zéro*. Sans ça, la peur de "perdre une bonne idée" pousse à accepter des suggestions tièdes.

### 6.4 — Persistance brouillon

- **Autosave silencieux** toutes les 2s d'inactivité (debounce). Sauvegarde en localStorage + tentative API.
- **Indicateur dans la topbar** : `saved 14:02` (gris) | `saving…` (gris animé) | `unsaved` (warning, jamais danger). Hover affiche `localStorage ✓ · server ✗` si désynchro.
- Pas de bouton "Sauvegarder" — la présence d'un bouton briserait la promesse implicite que c'est continu.

### 6.5 — Blocage d'export

**Choix : ne PAS désactiver visuellement le bouton.**

Le bouton `Exporter` reste cliquable. Si manquants > 0, le click ouvre une **popover checklist** ancrée sous le bouton :

```
┌─ Avant d'exporter, complète : ─────────┐
│  ✓ Front-matter                        │
│  ✓ Background                          │
│  ✗ Business Value         → Aller      │
│  ✓ Scope In                            │
│  ✗ Acceptance Criteria    → Aller      │
│  ─────────────────────────              │
│  Ferme cette popover et exporte quand   │
│  les 2 manquants sont remplis.          │
└─────────────────────────────────────────┘
```

Pourquoi pas désactivé : (a) un bouton désactivé n'explique pas son état, (b) la checklist est *actionnable* (chaque ligne navigue), (c) accessibilité — un bouton désactivé est souvent ignoré par les screen readers.

---

## 7. Risques UX et garde-fous

| # | Risque | Probabilité | Garde-fou designé |
|---|---|---|---|
| 1 | **Sur-confiance dans l'IA** : le rédacteur accepte sans relire. | Élevée | (a) Avant/Après *toujours* présentés côte à côte (jamais "appliquer en 1 clic"). (b) Toast post-acceptation rappelle `⌘Z`. (c) Métrique côté backend : si > 80% des suggestions sont acceptées sans modification, alerte produit. |
| 2 | **Fatigue de validation front-matter** : trop d'erreurs en même temps découragent. | Moyenne | Validation sur blur (pas en temps réel sauf slug). Erreurs *agrégées* dans le sommaire (`2 erreurs`) plutôt qu'à chaque champ. Possibilité de remplir dans le désordre. |
| 3 | **Conflit markdown/WYSIWYG** : paste depuis Word ou Confluence introduit du HTML qui se perd à la bascule. | Élevée | (a) Au paste, sanitization automatique vers markdown brut + toast `"Mise en forme nettoyée."`. (b) Si conversion lossy détectée, modale d'avertissement avant bascule. (c) Test de round-trip continu en CI sur un corpus de stories. |
| 4 | **Perte de travail** (crash navigateur, fermeture onglet). | Faible (avec autosave) | Autosave 2s + restauration au prochain chargement avec bandeau `"Brouillon récupéré du {timestamp}. [Continuer] [Repartir de zéro]"`. |
| 5 | **Courbe d'apprentissage SPDD** pour un PO qui ouvre l'éditeur sans formation. | Élevée | (a) Empty states qui *enseignent* (cf. §4.3). (b) Tooltip `?` sur chaque heading de section avec une définition courte + lien doc. (c) Premier lancement : tour guidé léger en 4 étapes (sommaire / sections / IA / export) — skip-able. |

---

## 8. Open questions design

| # | Question | Mon avis recommandé |
|---|---|---|
| 1 | **Faut-il permettre de réordonner les sections ?** Le format SPDD impose un ordre, mais certains rédacteurs voudront peut-être glisser "Open Questions" en haut pendant la rédaction. | **Non.** L'ordre fait partie du contrat SPDD. On peut autoriser à *replier* une section, pas à la déplacer. |
| 2 | **L'IA a-t-elle accès à la story entière ou seulement à la section courante ?** Question coût + qualité + privacy. | **Section courante + front-matter + signature des autres sections (titres seulement).** Donne du contexte sans tout envoyer. À reconfirmer avec un test utilisateur. |
| 3 | **Quel comportement si on supprime un AC qui a été référencé en commit message ?** | **Soft-delete** (AC marqué archivé, masqué par défaut, bouton `Voir 1 AC archivé`). Rétro-compat repos. Réversible. |
| 4 | **Le sommaire montre-t-il les AC un par un ou agrège-t-il ?** Trade-off : densité vs visibilité du nombre. | **Agrégé par défaut, expandable au click.** `Acceptance Criteria (3)` → click → liste `AC-1 ✓ / AC-2 ▶ / AC-3 ⚠`. Évite que le sommaire dépasse 12 items. |
| 5 | **Doit-on supporter le multi-utilisateur même non temps réel (= deux personnes ouvrent le même fichier) ?** | **MVP : single-user.** Un avertissement *"Cette story est ouverte par {user} depuis 14:02"* via lock léger côté API, sinon dernière sauvegarde gagne avec confirmation. Hors-périmètre détaillé. |

---

## Résumé — 5 lignes

1. **Trois zones persistantes** : sommaire (gauche, état d'avancement), document (centre, structure forcée par sections fixes), inspector polymorphe (droite, devient panneau diff IA pendant une suggestion).
2. **Markdown source de vérité, WYSIWYG dérivé**, bascule `⌘/` totale, round-trip garanti par fuzzer + bandeau d'avertissement si lossy.
3. **IA = popover sur sélection** (4 verbes courts, transparence du prompt visible) + **panneau split-view diff** Avant/Après/Diff avec acceptation explicite et `⌘Z` réversible.
4. **Validation passive** : sommaire qui se remplit, footer compteur 5/6, erreurs front-matter on-blur + agrégées. Export jamais désactivé visuellement — checklist cliquable en popover.
5. **Empty states qui enseignent SPDD** + tour guidé optionnel : on optimise pour le PO qui apprend, pas pour l'expert.

---

> *Voir aussi `yukki ui hifi.html` — wireframes low-fi visuels des 4 écrans critiques.*
