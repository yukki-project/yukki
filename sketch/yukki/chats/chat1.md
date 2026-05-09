# Yukki UI Frontend

_Started 2026-04-30 21:39 UTC_

---

## User



## Assistant

I'll help design something for yukki. Let me ask a few quick questions to understand what you'd like to create — the doc you pasted is a vision spec, but it could become many things.

_[tool: questions_v2]_

## User

Questions answered:
- deliverable: ui et design pour avoir un mode visuel de la cli yukki c'est la main feature
- audience: dev / tech lead / vide codeur...
- tone: ui type web regarde style vscode / kiro 
- variations: Just one strong option
- assets: Nothing yet — invent something
- logo_explore: je voudrai un lappin
- code_blocks: je ne veux pas une ui cli mais frontend
- tweaks: Yes please
- extras: le but est de pouvoir faire la même chose que en cli via un serveur web lancé par yukki ui

## Assistant

Got it — designing a web UI for `yukki ui` that mirrors the 7-command CLI workflow as a graphical app. Style: VS Code/Kiro-like editor, with a rabbit logo, full Tweaks support.

Let me set the project up and start building.

_[tool: update_todos]_

_[tool: copy_starter_component]_

_[tool: read_file]_

I have what I need from the tweaks panel reference. Let me build this now.

_[tool: set_project_title]_

_[tool: snip]_

Now let me design the visual system and build the app. I'll go with a Kiro/VS Code-inspired editor aesthetic, but with its own personality — warmer, more document-feel, with a rabbit mark.

**System I'll commit to:**
- **Type**: JetBrains Mono for code/labels, Inter for UI body, a subtle serif (Newsreader) for section headers and the methodology refs (the "document" feel).
- **Palette**: dark neutral `oklch(0.18 0.01 80)` background, warm off-white text, single accent `oklch(0.78 0.14 65)` — a soft amber/peach (rabbit-warm). Optional secondary muted teal for status accents.
- **Layout**: 3-pane editor — left: artefact tree (stories / analysis / prompts / tests), center: tabbed workspace with the active artefact, right: Provider panel (live agent stream + status). Top: command palette + run bar showing the 7 SPDD commands as a stepper. Bottom: status bar.
- **Centerpiece**: the REASONS canvas as a structured form with R-E-A-S-O-N-S as collapsible columns/sections, each with diff status vs. last accepted version.
- **Rabbit mark**: simple geometric — two ovals/arcs as ears + dot, monospace wordmark `yukki`.

Let me build it.

_[tool: write_file]_

Now let me build the React components — splitting into separate files for manageability.

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: show_html]_

_[tool: snip]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

**yukki ui** — a VS Code/Kiro-inspired visual workspace for the SPDD CLI.

What's in there:
- **3-pane editor shell** with activity bar, artefact tree (`spdd/stories`, `analysis`, `prompts`, `tests`), tabbed workspace, and a live provider stream on the right.
- **7-step command bar** at the top — story → analysis → reasons-canvas → generate → api-test → prompt-update → sync — with state (done / active / pending) and a big run button.
- **REASONS canvas as the centerpiece** — 7 columns (R-E-A-S-O-N-S) showing additions/modifications vs. the last accepted version, plus an Operations table with signatures + test status, STRIDE risk grid, Given/When/Then ACs, Norms & Safeguards, and open questions.
- **Story / Analysis / Tests views** — INVEST + SPIDR for stories, Y-Statement + STRIDE + BVA/EP for analyses, test pyramid for tests.
- **Right panel** with three tabs: live provider Stream, Inspector (lifecycle + front-matter + validation checklist + linked artefacts), and Diff vs. previous canvas version.
- **Bottom panel** (Output / Problems / Terminal) and a status bar in the accent color.
- **Rabbit wordmark** — geometric two-ear mark next to "yukki" in the title bar.
- **Cmd+K palette** to jump between commands and artefacts.

**Tweaks** (toolbar toggle): theme (dark/light), density, accent hue (oklch slider), language FR/EN, show/hide right + bottom panels, and a Canvas mode switch (rendered ↔ raw markdown with front-matter).

Next steps if you want them: a real generate-progress view, a graphical canvas editor mode (drag chips between R/E/A/S/O/N/S columns), and a methodology-refs reader pane.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

Fixed — the duplicate `safeguards` key in `data.js` was shadowing the count number with the array of objects, which then crashed `ArtefactHeader`. Renamed to `safeguards_count` for the chip and updated the reference in `canvas-view.jsx`. Page renders cleanly now.

_[tool: fork_verifier_agent]_

_[tool: snip]_

_[tool: snip]_

Fix is shipped — yukki ui renders cleanly with the rabbit mark, 7-step command bar, REASONS canvas, provider stream, and full Tweaks support (theme, density, accent hue, language, layout toggles, canvas mode).

## User

je voulais plutot des sketch car ça va encore bcp changé (tu peux quand meem garder  ça)

## Assistant

_[tool: snip]_

_[tool: invoke_skill]_

Got it — let me make low-fi sketches exploring the design space for `yukki ui`. Many directions, sketchy vibe, room to iterate.

_[tool: copy_starter_component]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: read_file]_

I have enough understanding of the design canvas API. Let me build the sketches.

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

**yukki ui · sketches.html** — 13 wireframe boards on a paper-grid canvas, organized in 3 sections:

- **A · structures** (7) — 3-pane editor (current hi-fi), notebook scroll, pipeline graph, kanban lifecycle, REASONS post-it wall, split-markdown editor, live run console
- **B · moments** (5) — project home, methodology browser, canvas diff, ⌘K palette, mobile triage
- **C · identité** (1) — six rabbit wordmark variations

Each board is a hand-drawn wireframe (Kalam/Caveat type, paper texture, scribbles + callouts) so you can judge structure without getting distracted by polish. Pan/zoom the canvas, drag boards to reorder, click any one to focus fullscreen.

Tell me which structures and moments resonate (e.g. *"A1 + B1 + B4, drop A4"*) and I'll fold the winners into the hi-fi.

## User

gene une ui jolie a partir de ça

## Assistant

_[tool: snip]_

_[tool: list_files]_

I'll create a beautiful new hi-fi UI synthesizing the strongest sketches: 3-pane editor (A1) + REASONS canvas centerpiece + post-it wall (A5) + run console (A7) + project home (B1) + diff (B3) + ⌘K palette (B4), with a refined visual identity.

Let me first peek at the existing hi-fi to keep style continuity, then build a new polished version.

_[tool: read_file]_

_[tool: read_file]_

I'll build a polished new hi-fi synthesizing the strongest sketches into one cohesive UI. Given the existing `yukki ui.html` already does a 3-pane editor well, I'll create a richer, more visually striking variant — a single beautiful page with the dashboard moment, the run console, palette, and canvas as its hero — to live alongside.

_[tool: snip]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: snip]_

_[tool: read_file]_

I have what I need. I'll build a fresh, polished single-page hi-fi that fuses the strongest sketches: dashboard hero + 3-pane editor + REASONS canvas + run console drawer + ⌘K palette, with refined typography and a more confident visual identity.

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

**`yukki ui pretty.html`** — a polished synthesis of the strongest sketches into one cohesive hi-fi:

- **Brand** — refined rabbit mark in a soft amber-gradient tile + Instrument Serif italic wordmark
- **Three-pane editor** with activity rail, scoped sidebar (Stories / Analysis / Canvas / Tests), tabs, and right rail (Stream · Inspector · Diff)
- **REASONS canvas centerpiece** — serif headline, lifecycle pill flow, 7-column grid with diff highlights (`+` adds, `~` mods), Operations table with test status, ACs as Given/When/Then cards, STRIDE risk grid, Norms + Safeguards, Open questions
- **⌘K palette** with blurred backdrop
- **Run drawer** (floating amber FAB, bottom-right) — live progress, shimmering bar, per-operation status
- **Tweaks** — theme (dark/light), accent hue slider (recolours the whole UI live), provider-stream toggle

Geist UI / Geist Mono / Instrument Serif, oklch palette, dotted background grid behind the editor. The original `yukki ui.html` and the sketch board are still intact alongside.

## User

mais je ne veux pas une ui html mais une ui qui reprendre le sketch comme figma

## Assistant

_[tool: snip]_

Compris — tu veux les sketches **présentés comme dans Figma** : un canvas pan/zoom avec des frames d'écrans hi-fi nommées posées dessus, pas une appli HTML. Je vais reprendre la même structure que `yukki ui sketches.html` mais avec des **maquettes hi-fi** (couleur, vraie typo, polish) au lieu du wireframe griffonné.

_[tool: list_files]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

Now let me check what data file the frames depend on, and create the canvas-style host file.

_[tool: list_files]_

_[tool: read_file]_

Good — data.js exists and exports `window.YUKKI_DATA`. Let me check pretty.css to reuse it, then build the host HTML using the design_canvas starter so all 9 hi-fi frames are presented side-by-side.

_[tool: read_file]_

_[tool: snip]_

_[tool: copy_starter_component]_

Now I need a small CSS for the frames + the host HTML. Let me write a focused stylesheet that the frames pull from (using the same vars as pretty.css), and the host file.

_[tool: write_file]_

_[tool: write_file]_

_[tool: snip]_

_[tool: done]_

_[tool: fork_verifier_agent]_

**`yukki ui hifi.html`** — 9 polished hi-fi frames on a pannable Figma-style canvas, organized in 3 sections:

- **A · Workspace principal** (3) — A1 the full 3-pane editor with the REASONS canvas centerpiece, A2 a project home with stat tiles + activity feed, A3 a live `generate` run console with shimmering progress and streaming claude output
- **B · Moments forts** (4) — ⌘K palette over the dimmed editor, side-by-side canvas diff (v0.3 → v0.4 with adds/mods/dels), REASONS as a post-it wall (alt visual), and a methodology reader pane (DDD-tactical, etc.)
- **C · Variantes & identité** (2) — light-theme variant of the editor, plus a brand sheet with the rabbit mark in 6 treatments, type scale, and the full oklch palette

All frames share the same design system (Geist + Instrument Serif, ambre accent, oklch tokens). Click any artboard label to focus fullscreen.

Tell me which frames you want to keep, and I'll fold the winners back into the working `yukki ui pretty.html` as the source of truth.

## User

je n'aime pas les couleur du mode dark (le maron)

## Assistant

Compris — on remplace l'ambre/marron du dark par quelque chose de plus net. Je te propose 3 directions (toutes accessibles via Tweaks, mais je vais d'abord changer le **défaut**).

Laquelle préfères-tu ?

_[tool: questions_v2]_

## User

Questions answered:
- accent_direction: 1
- neutral_temp: Froid (bleu-gris, type GitHub dark / Linear)
- scope: mettre aussi une version lighth dans le design

## Assistant

Compris — accent **vert** sur **neutres bleu-gris froids** (style GitHub dark / Linear), et j'ajoute une version **light** dans la design canvas. Je mets à jour les variables CSS partagées.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Maintenant je dois aussi remplacer les couleurs **codées en dur** dans `hifi-frames.jsx` (oklch(...) hard-codé qui pointaient vers l'ancien ambre/marron). Laisse-moi vérifier et nettoyer.

_[tool: grep]_

_[tool: snip]_

_[tool: run_script]_

Tous les remplacements appliqués. Je dois aussi corriger la référence post-it `amber` → `green` dans les boucles, et ajouter la version **light** dans le canvas comme demandé.

_[tool: grep]_

_[tool: snip]_

_[tool: run_script]_

Now let me add the **light-theme variants** to the canvas as the user asked. Let me update F_Light to be more developed (not just one frame), and add a light Home + light Run frame, and reorder the canvas.

_[tool: read_file]_

I'll add proper light variants by creating wrapper components that wrap the existing frames in `.frame.light`. Simpler than duplicating each one.

_[tool: str_replace_edit]_

Now update the host HTML to: (1) reorganize sections into **dark** + **light** + **brand**, (2) include the new light variants.

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Mis à jour :

- **Accent vert frais** (`oklch(0.80 0.16 150)` en dark, plus saturé/foncé en light) remplace l'ambre/marron partout.
- **Neutres bleu-gris froids** (hue 250°) — fond, lignes, texte — façon GitHub dark / Linear.
- **Section L · Light** ajoutée au canvas avec 5 frames (éditeur, home, run, post-it, methodology) en thème clair.

Le canvas est désormais organisé en 4 sections : `A · Dark workspace` · `B · Dark moments` · `L · Light` · `C · Identité`. Le verifier vérifie le rendu en arrière-plan.

## User

Verifier agent check completed

## Assistant

The verifier is right — let me check what `hifi-frames.css` actually contains right now.

_[tool: grep]_

The CSS file is correct — the verifier likely cached the old version. The most likely cause: the `pretty.css` import or another stylesheet is loaded after `hifi-frames.css` and overrides the vars. Let me check the host HTML and see what's leaking warm tokens through.

_[tool: snip]_

_[tool: grep]_

_[tool: grep]_

The CSS file has the right tokens — but the verifier read `--bg: oklch(0.145 0.012 75)`. Something is winning the cascade. Let me check if `design-canvas.jsx` injects its own `:root` or if the `<style>` block is the culprit. The body bg color uses hue 75 but that wouldn't cascade into `.frame`. Let me probe directly.

_[tool: show_html]_

_[tool: eval_js]_

So `hifi-frames.css :root` rule **as parsed by the browser** is still serving hue 75. The file on disk has hue 250. This is a stale cache from the CDN serve URL. Let me bust it by adding a cache buster.

_[tool: str_replace_edit]_

_[tool: eval_js]_

Wait — the iframe shouldn't be cached if I edited it. Let me actually look at what is being served:

_[tool: sleep]_

_[tool: eval_js]_

The `eval_js` returned a Promise. Let me await it properly:

_[tool: eval_js]_

The fresh fetch returns the new (correct, hue 250) CSS. The browser had a stale-cached copy. Now let me verify the live styles are using the new tokens:

_[tool: eval_js]_

Tokens are correct now: cool blue-grey neutrals (hue 250) and green accent (hue 150). The cache buster fixed it. Let me re-verify and ship.

_[tool: done]_

Cache résolu — les frames dark sont maintenant rendues avec les bons tokens : neutres bleu-gris froids (hue 250) + accent vert (hue 150). Le cache du navigateur servait l'ancien CSS ; un cache-buster `?v=2` a forcé le rechargement.

La section L · Light est aussi visible avec les mêmes proportions et le vert plus profond/saturé pour la lisibilité sur fond clair.

## User

c'est un peu surchargé. je trouve le design un peu baqulé avec des police qu'on ne trouve jamais dans es logicielle

## Assistant

Tu as raison — l'Instrument Serif italique partout est trop "magazine", pas assez "outil de dev". Aucun éditeur sérieux (VS Code, Linear, Zed, Cursor, GitHub) n'utilise de serif italique.

Je propose de partir sur quelque chose de beaucoup plus sobre. Choisis la direction :

_[tool: questions_v2]_

## User

Questions answered:
- type_direction: Inter partout (le standard, GitHub / Linear / Notion)
- density: Decide for me
- decoration: Garder essentiel (chips de status, mais pas de gradients/glows)
- headers: Decide for me
- scope: Refaire l'éditeur principal (A1) en priorité

## Assistant

Compris. Je refais **A1 (l'éditeur)** en mode sobre :

- **Inter** (UI) + **JetBrains Mono** (code/IDs) — plus de serif italique
- **Densité Linear-like** : plus de signal par écran, padding réduit
- **Décor essentiel** : on garde les chips de statut, on retire les gradients, glows, pulses, dégradés sur le mark, ombres colorées
- **Hierarchie sobre** : titres plats avec poids différents, micro-headers en mono uppercase pour les sections — comme Linear

Je crée un fichier séparé pour ne pas casser l'existant, je te montre, tu valides, et on réplique sur le reste.

_[tool: write_file]_

## Assistant

Compris. Je refais **A1 (l'éditeur)** propre :

- **Inter** + **JetBrains Mono** uniquement (zéro serif)
- Densité **Linear-like** (mid-dense, lignes fines, padding réduit)
- Headers : titres sobres, chiffres en mono, libellés de section en uppercase mono très petits
- Suppression des gradients, glows colorés, pulse, shadows ambrées
- Garder : status dots, chips d'état, et la diff add/mod (mais en couleurs neutres)

Je laisse le canvas + autres frames intacts pour comparaison.

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

_[tool: snip]_

_[tool: snip]_

J'ai ajouté une nouvelle section **V2 · Sobre** tout en haut du canvas avec :

- **V2A — éditeur sobre (dark)** : refait depuis zéro avec Inter + JetBrains Mono uniquement, densité Linear-like, plus aucun gradient ni glow ambré, indicateurs neutres.
- **V2L — éditeur sobre (light)** : même frame en thème clair.

Les anciennes sections A/B/L/C restent dessous pour comparaison. Dis-moi si la direction te plaît, je propagerai le style aux autres frames.

## User

Verifier agent check completed

## Assistant

Je corrige.

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: done]_

Corrigé : `C2.ac` → `C2.acs`. La section V2 s'affiche maintenant.

_[tool: fork_verifier_agent]_

<fin du tour>

## User

review il y a plein de merde

## Assistant

Je vais regarder ce qui ne va pas dans la V2.

_[tool: save_screenshot]_

_[tool: show_html]_

Je vais ouvrir directement la frame V2 en plein écran via une URL avec hash, pour la regarder vraiment.

_[tool: read_file]_

Je vais regarder la frame V2 directement avec un focus URL.

_[tool: grep]_

Je vais ouvrir directement la frame V2 sans passer par le canvas pour la voir clairement.

_[tool: read_file]_

Je vais créer une page solo qui affiche juste la frame V2 plein écran, pour pouvoir la screenshoter proprement.

_[tool: write_file]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: view_image]_

Je vois plusieurs problèmes :

1. **Search/run/story manquent** dans la titlebar (overflow → écrasés)
2. **Chevrons de groupes énormes** dans la sidebar (le SVG s'étire)
3. **Right rail (stream) absent** à droite — l'éditeur déborde
4. **Status bar coupée** en bas
5. **Tabs déborde** — pas assez compactes
6. **REASONS columns trop étroites** → texte tronqué

Le viewport iframe est probablement < 1440px. Je vais checker, et corriger les bugs structurels (chevrons, right rail manquant) qui ne dépendent pas de la taille.

_[tool: eval_js]_

OK donc le root fait bien 1440×900 mais l'iframe fait 924px → screenshot rogné. Le rail droit existe peut-être hors champ. Laisse-moi forcer le scaling et re-screenshoter.

_[tool: str_replace_edit]_

_[tool: show_html]_

Hmm avec scale ça va mal screenshoter. Je vais plutôt dimensionner le iframe en CSS variables… non, plus simple : capturer en taille réelle via DOM-to-image qui ignore le viewport.

_[tool: save_screenshot]_

_[tool: view_image]_

Le scale ne s'applique pas (screenshot pris à 1440 brut). Le problème de la capture est que l'outil screenshote la viewport du iframe (924px), pas le DOM en entier. Je vais utiliser `multi_screenshot` qui utilise html-to-image et capture le DOM natif.

Mais d'abord — les vrais bugs visibles :

1. **Chevrons SVG énormes** dans sidebar (`STORIES`, `ANALYSIS`) — le SVG flex-grow
2. La titlebar : search/buttons absents → flex shrink

Je corrige ça d'abord.

_[tool: eval_js]_

OK donc :

- Titlebar : tout est là (search 280, buttons), juste rogné par le screenshot iframe
- Right rail : présent à x=1120, w=320 — ok
- **Bug réel : `tg-head svg` fait 137×137px** !! Le chevron est devenu géant.

Le SVG s'étire parce que `.v2-tg-head` est en flex et `<svg>` n'a pas de width fixe en CSS — il prend `width="9"` attribut, mais `flex` peut l'étirer. Je corrige + je fais un vrai screenshot via multi_screenshot.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: multi_screenshot]_

Le screenshot montre toujours le bug du chevron énorme — la page n'a pas reload. Mais aussi : `multi_screenshot` ne fait que 924×540, pas la taille DOM. Je vois que **multi_screenshot capture le viewport iframe**, pas le DOM 1440. Il faut redimensionner le iframe interne via les attrs ou faire le screenshot avec `eval_js` qui rendre html-to-image en taille forcée.

Plus simple : redimensionner #root à la taille viewport (responsive) et regarder ainsi.

_[tool: str_replace_edit]_

_[tool: show_html]_

Mais 924×540 est trop petit pour un éditeur 4-pane (44+240+rail+1fr). Je vais tout simplement screenshoter la page principale via le canvas qui scale le contenu pour fit.

_[tool: save_screenshot]_

_[tool: view_image]_

Bon maintenant je vois TOUT clairement. Liste des problèmes :

1. **Sidebar : énormes flèches géantes** au-dessus de "STORIES" et autres groupes — le SVG chevron explose en taille (mon fix CSS n'a pas pris, peut-être cache)
2. **Search bar** : le texte wrappe sur 2 lignes (`Rechercher artefact, commande` + `⌘K`). Search trop étroite.
3. **Cercles vides** dans la titlebar (avant search) → c'est l'icône loupe `.v2-search-ic` qui est devenue énorme
4. **Tabs : "CORE-002b" wrappe** sur 2 lignes — pas en `nowrap`
5. **REASONS canvas hyper étroit** → 7 colonnes squeezées
6. **L'éditeur scroll horizontal** (scrollbars en bas) parce que largeur insuffisante

Tout vient du même problème racine : **les SVG s'étirent**. Mon fix CSS a été appliqué mais peut-être pas chargé. Et la search bar ne shrink pas. Je refais ça proprement.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: show_html]_

Pour vraiment screenshoter en taille réelle (1440×900) je vais resize l'iframe via le canvas qui scale.

_[tool: save_screenshot]_

_[tool: view_image]_

Bien, gros progrès ! Plus de chevrons géants, sidebar lisible, REASONS lignes propres. Reste :

1. **Filter input invisible** dans la sidebar (juste une loupe centrée → le `gap` ou flex foire)
2. **Tabs scroll horizontal visible** (scrollbar sous "story" tab) — c'est un peu moche mais OK puisque l'éditeur est trop étroit (924px vs 1440 designé)
3. **REASONS columns wrap "v0.3 → v0.4" sur 2 lignes** — manque de place horizontalement
4. **Editor pane scroll horizontal** au-dessus de la titlebar (flèches bleues en haut)
5. **REASONS card content invisible** (cartes vides en bas) — masquées par overflow

Les bugs réels (à 924px viewport) :
- **(1)** filter
- **(4)** scroll H parasite

Le reste sera correct à 1440 (le canvas le scale). Mais je veux quand même vérifier le rendu canonique. Je fais le filter d'abord.

_[tool: eval_js]_

SVG fait 201×24 → toujours étiré. Mon `.v2-app svg { flex-shrink: 0 }` n'est pas appliqué (cache navigateur). Je vais ajouter !important + width/height direct sur le svg du filter.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: show_html]_

Maintenant je veux voir la frame en taille réelle 1440×900. Je vais rendre v2-solo en transform: scale pour fitter à 924, et le screenshot capturera le rendu visuel correct.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: view_image]_

Beaucoup mieux ! La frame est maintenant lisible en entier. Bilan :

✅ **Bons points**
- Sidebar propre, chevrons OK, status dots discrets
- 7 colonnes REASONS bien rangées avec content visible
- Stream lisible à droite
- Lifecycle, tags, pills cohérents
- Densité Linear-like atteinte
- Typo Inter + JetBrains Mono partout

⚠️ **Petits soucis qui restent**
1. **Tabs** : "CORE-002b · canvas •" déborde encore légèrement, scrollbar parasite visible sous l'éditeur
2. **REASONS** : le titre `R · E · A · S · O · N · S` a perdu son visuel en haut (bouts de header collés "v0.3 → v0.4 +6 ~3" sans hiérarchie)
3. **Operations table** scroll horizontal — colonnes trop larges pour 1fr du milieu
4. **Indicateurs `~3` `+6`** assez discrets, perdus à côté du h2
5. **Filter input** mieux mais pas de cursor blinking — ce n'est qu'un placeholder visuel, OK
6. **Status bar** un peu vide

Veux-tu que je :
- (a) **propage ce style sobre** aux autres frames (Home, Run, Palette, Diff, Postit, Method, Brand) ?
- (b) **peaufine encore A1** (tabs, REASONS header, Operations table) avant de propager ?
- (c) **autre direction** ?

Dis-moi.

## User

style plus épuré

## Assistant

Compris — la référence Kiro est claire :

- **Énormément d'air**, padding généreux
- **Pas de tabs visuels persistants** sauf l'onglet actif (et même là, pas de bordures)
- **Pas de lifecycle / pills colorées en bas du header** — juste : titre, sous-titre, point.
- **Cards à fond légèrement plus clair** (pas de bordures), texte sobre
- **Sidebar : sections en uppercase, items SEUL au-dessus** sans icônes ni dots
- **Activity rail discret** (icônes outline, sans fond actif coloré)
- **Pas de status bar** en bas
- **Header gauche très simple** : "KIRO" en uppercase + ⋯, c'est tout. Pas de breadcrumb branche etc.
- **Onglet actif** : juste un trait de couleur en haut, fond du même bg que l'éditeur, X discret

Je refais l'éditeur dans ce style — beaucoup plus épuré.

_[tool: write_file]_

_[tool: write_file]_

## Assistant

## User



## Assistant

_[tool: snip]_

Tu m'as collé un nouveau prompt — un brief UX complet pour un **éditeur guidé de stories SPDD avec assistance IA** (la story FRONT-002 de yukki). C'est une nouvelle mission, distincte du `yukki ui` (CLI visualizer) qu'on avait commencé.

Avant de partir, je veux bien cadrer :

_[tool: update_todos]_

_[tool: questions_v2]_

## User

Questions answered:
- output_format: Doc markdown + wireframes visuels low-fi
- reuse_yukki: Oui, c'est le même produit (yuki = yukki)
- screens_priority: Menu contextuel d'assistance IA, Panneau diff avant/après suggestion, Front-matter avec validation inline, Export modal + checklist des manquants, Mode markdown brut (toggle), Édition AC (Given/When/Then) avec navigation sections
- ai_panel_position: Decide for me
- nav_style: Decide for me
- density: VS Code (dense, technique)
- variations: 2-3 directions à comparer
- audience_tone: Chaleureux et pédagogue (enseigne SPDD)

## Assistant

_[tool: snip]_

_[tool: update_todos]_

_[tool: snip]_

Je commence par le doc markdown structuré (livrable principal) puis les wireframes visuels low-fi en complément. Style sketchy/papier comme on avait fait avant pour yukki.

_[tool: write_file]_

_[tool: update_todos]_

Maintenant les wireframes low-fi visuels. Je vais utiliser le `design_canvas` pour mettre les 4 écrans côte à côte avec un style sketchy/papier (low-fi, pas hi-fi — c'est explicite dans la demande).

_[tool: copy_starter_component]_

_[tool: write_file]_

Now the four wireframe screens as React components:

_[tool: write_file]_

Now the 4 wireframe screens.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

Now the bonus wireframes (front-matter validation + export checklist) and the host HTML:

_[tool: write_file]_

_[tool: write_file]_

Now the host HTML with design canvas + intro section linking the markdown doc:

_[tool: write_file]_

_[tool: update_todos]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Livré — deux artefacts qui se complètent :

**📄 [SPDD Editor — UX.md](SPDD%20Editor%20—%20UX.md)** — le livrable principal demandé par le brief. 8 sections numérotées (principes, IA, wireframes ASCII, microcopies, tokens, patterns, risques, open questions) + résumé 5 lignes.

**✏️ SPDD Editor — Wireframes.html** — 6 écrans low-fi en style sketch/papier sur un canvas pannable :
- **01** Édition AC (Given/When/Then, section active, sommaire d'avancement)
- **02** Mode markdown brut (toggle ⌘/)
- **03** Menu contextuel IA sur sélection (4 verbes + transparence du prompt)
- **04** Panneau diff Avant/Après/Diff (split-view, accept/reject symétriques)
- **05** Front-matter avec validation inline (3 erreurs typiques)
- **06** Export bloqué + checklist cliquable

Les annotations orange à côté de chaque écran justifient les choix majeurs (sommaire passif, sélection grisée pendant la revue, etc.).

**Choix structurants à débattre :**
1. Sommaire latéral (vs stepper) — j'assume que la nav est l'enjeu n°1 pour les PO qui apprennent SPDD
2. Markdown comme source de vérité, WYSIWYG dérivé — pas de rich-text propriétaire
3. IA = popover sur sélection + diff explicite, jamais d'auto-apply
4. Export jamais désactivé visuellement — checklist actionnable à la place
5. Empty states qui *enseignent* SPDD plutôt qu'un onboarding lourd

Tu peux commenter directement sur les écrans dans le canvas, ou pointer une section du doc à creuser.

## User

Verifier agent check completed

## Assistant

Bug légitime — JSX n'autorise pas `\'` dans les attributs single-quoted. Fix:

_[tool: str_replace_edit]_

Let me also check wireframe-6 just in case, and verify nothing else has the same pattern:

_[tool: grep]_

_[tool: grep]_

Clean. Re-deliver:

_[tool: done]_

_[tool: fork_verifier_agent]_

Fix appliqué — les apostrophes dans les `errMsg` du wireframe front-matter sont maintenant en JSX expressions (`{"…n'accepte…"}`) au lieu de strings échappées. Les 6 artboards rendent.

## User

fait moi l'ui relatif à ça

## Assistant

Tu veux que je passe les wireframes low-fi en **UI hi-fi** — vrai design final, pas du sketch papier. Je vais reprendre le système visuel yukki (Inter + JetBrains Mono, neutres bleu-gris, accent vert) et faire 4-6 écrans propres. Quelques cadrages rapides :

_[tool: questions_v2]_

## User

voici l'appli actuel

## Assistant

Ah, super contexte — c'est une **app desktop** (Electron/Tauri vu la title bar), thème **dark**, avec un Workflow Kanban en colonnes (Story / Analysis / Canvas / Implementation / Tests), un activity bar à gauche avec icônes, des onglets de fichiers/projets en haut, et un accent **violet** (le bouton "+ New Story").

Donc l'éditeur SPDD doit s'intégrer dans cette coquille — c'est pas une web app standalone, c'est une vue qui s'ouvre quand on clique une story dans le Kanban.

_[tool: view_image]_

Système visuel observé :

- **Background** : très sombre (`#0d0d12` ish, presque noir bleu-violet)
- **Activity bar gauche** (~50px) : icônes outline, pictos lucide-style
- **File menu** + **window controls** + onglets de projets en haut
- **Workflow panel** : sub-header avec close button, sub-tabs, "+ New Story" en violet (`#7c5cff` ish)
- **Cards** : `STORY-002` en mono uppercase muted + titre + date + pill `draft`
- **Colonnes Kanban** : header `STORY 2` mono uppercase, count à droite, séparateur vertical fin
- **Pas de borders sur cards** — juste un hover state

Donc l'éditeur SPDD = ce qui s'ouvre quand on **clique une story card**. Je vais faire ça.

_[tool: questions_v2]_

Reçu — décisions :

- **Dark théme**, intégré dans la coquille yukki existante (activity bar, onglets, accent violet `#7c5cff`)
- **Les 6 écrans** sur design canvas
- **Cliquable complet** : vraie édition, vraie nav, vrai diff
- **IA discrète** — même violet primary, juste l'icône ✨

J'attaque. Je vais faire un éditeur fonctionnel partagé, et chaque artboard montre l'app dans un état différent (section AC active / mode MD / popover IA ouvert / diff visible / front-matter avec erreurs / popover export).

_[tool: update_todos]_

_[tool: write_file]_

_[tool: snip]_

Now icons + chrome (the shared shell), then the editor logic.

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: write_file]_

I'll keep building. Let me write the TOC, the editor body, the AI popover and diff panel, then assemble everything into the canvas. I'll keep things tight.

_[tool: write_file]_

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

Now let me write the main editor file that ties everything together, then assemble the 6 artboards on the canvas.

_[tool: read_file]_

Let me check what we have and create the data file with sample SPDD content + the main canvas.

_[tool: list_files]_

Let me check what's already there in spdd files:

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

Good — I have all the building blocks. Let me check the CSS and the existing main HTML, then write the editor body and assemble the canvas.

_[tool: read_file]_

_[tool: snip]_

Now I have everything I need. Let me write the editor body (the Doc renderer that puts it all together) and the markdown view, then assemble the canvas.

_[tool: write_file]_

Now let me build the design canvas HTML that assembles all 6 artboards with their initial states.

_[tool: list_files]_

_[tool: snip]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: snip]_

Good — I have what I need. Let me build the canvas HTML with 6 artboards, each showing a different state of the editor.

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: done]_

_[tool: update_todos]_

_[tool: fork_verifier_agent]_

Le canvas avec les 6 artboards (en réalité 7, l'export ayant un toast en plus) est en place :

- **01–02** · État par défaut (WYSIWYG) et bascule Markdown
- **03–04** · Popover IA sur sélection, puis panneau diff Avant/Après
- **05** · Erreurs front-matter avec messages explicites
- **06** · AC partiellement rempli, inspector guide ce qui manque
- **07** · Export prêt avec checklist verte

Tout est sur un seul `DesignCanvas` zoomable. Dis-moi ce qu'il faut ajuster.

## User

écris un prompt détaillé sur tout ça

## Assistant

_[tool: snip]_

# Prompt — Éditeur guidé SPDD pour Yuki

> Un prompt complet pour reconstruire (ou regénérer) l'éditeur SPDD vu sur le canvas. À coller tel quel dans une nouvelle conversation.

---

## Contexte produit

**Yuki** est une IDE-like pour la rédaction de specs produit. Le format **SPDD** (Spec-Per-Design-Document) impose une structure stricte : front-matter + sections obligatoires (Background, Business Value, Scope In, Acceptance Criteria) + sections optionnelles (Scope Out, Open Questions, Notes).

Aujourd'hui les Product Owners rédigent leurs stories dans un éditeur markdown générique. Conséquences : sections oubliées, formats inconsistants, qualité dépendante de la rigueur du rédacteur, friction à l'embarquement. **Cette story livre un éditeur SPDD guidé qui rend la conformité au template évidente plutôt qu'imposée.**

L'app cible un public de PO et tech leads francophones. Toute la copy est en français, le code reste en anglais.

---

## Identité visuelle

Yuki est une app **dark, ultra-minimale, IDE-like**. Inspiration : VSCode + Linear + Things 3.

**Tokens** (à réutiliser, pas à réinventer) :

- Surfaces, du plus sombre au plus clair : `#0c0d12` (page) → `#131419` (1) → `#181a21` (2) → `#1f2129` (3) → `#232631` (élevé). Input : `#16171d`.
- Lignes très subtiles : `#23252e`, `#1c1e25`, `#2e3140`.
- Texte : `#e6e7ee` (primary) → `#9ea1b3` (secondary) → `#6b6e80` (muted) → `#4b4d5a` (faint).
- Accent unique : violet **#8b6cff** (Yuki + actions IA + focus). Soft : `rgba(139,108,255,0.14)`. Ring : `rgba(139,108,255,0.32)`.
- Sémantiques : success `#4ec38a`, warning `#e8a657`, danger `#e76d6d` — chacun avec une variante "soft" (~13% alpha).
- Diff : add = `#4ec38a` sur soft-green ; del = `#e76d6d` sur soft-red.
- Polices : `Inter` pour l'UI (400/500/600), `JetBrains Mono` pour l'identifiant, le front-matter, le footer, les pills et tout ce qui sent le code.
- Radii 4 / 6 / 8 / 10. Pas de gros radius. Pas de gradients. Pas d'ombres flashy — juste des `0 8px 24px rgba(0,0,0,0.4)` sur les popovers.

**Tropes à éviter** : emojis, gradients de marketing, illustrations IA, accent borders sur cards, container queries de wellness app. Yuki = outil de pro.

---

## Layout général

App grid sur 3 lignes : **title bar (32px) · tabs (34px) · main (1fr)**.

```
┌─────────────────────────────────────────────────────────┐
│ 🐰  File              ─ ☐ ✕                              │ titlebar
├─────────────────────────────────────────────────────────┤
│ yukki │ k8s-portal │ init │ ● FRONT-002 ✕ │ +           │ tabs
├──┬──────────────────────────────────────────────────────┤
│📥│ FRONT-002  Éditeur guidé SPDD  draft  ●sauvé 14:02   │ header (40px)
│📚│                                  [WYSIWYG│Markdown]   │
│⊟ ├──────────┬───────────────────────────┬──────────────┤
│💡│ Sections │                           │              │
│📄│  ✓ FM    │      DOCUMENT            │  INSPECTOR   │
│✓ │  ✓ Bg    │                           │              │
│🗺│  ○ Bv    │                           │              │
│⫘│  …       │                           │              │
│  │ 4/5 ▓▓▓▓░│                           │              │
│⚙│          │                           │              │
├──┴──────────┴───────────────────────────┴──────────────┤
│ 4/5 obligatoires │ ⌘K palette │ FRONT-002.md UTF-8 LF   │ footer (28px)
└─────────────────────────────────────────────────────────┘
```

- **Activity bar** (gauche, 48px) : 8 icônes (inbox, book, layers, bulb, doc, check, map, workflow) + settings en bas. Indicateur actif : barre violette de 2px à gauche de l'item.
- **Tabs** : onglet actif souligné par une barre violette (2px), pastille violette si dirty, croix de fermeture au hover.
- **Header de story** : ID monospace + titre + pill de statut + indicateur de save (●vert sauvé / ●orange en cours) + segmented WYSIWYG/Markdown + bouton Exporter.
- **Body** : grid `240px 1fr 360px` (sommaire, doc, inspector). Aucune bordure visible entre panneaux — juste un changement subtil de surface.
- **Footer** : statut compact monospace, 11px, raccourcis clavier en clair, encoding/EOL à droite.

---

## Sommaire (240px)

Un par section dans l'ordre du template SPDD :

| Key | Label | Required |
|---|---|---|
| fm | Front-matter | ✓ |
| bg | Background | ✓ |
| bv | Business Value | ✓ |
| si | Scope In | ✓ |
| so | Scope Out | — |
| ac | Acceptance Criteria | ✓ |
| oq | Open Questions | — |
| no | Notes | — |

**Pastilles** à gauche du label, 12px :
- ● vert avec ✓ = `done`
- ● orange = `todo` (obligatoire non-rempli)
- ● rouge = `error` (validation échoue, ex. front-matter invalide) + nombre d'erreurs en suffixe (`2 err`)
- ○ pointillé = `optional`
- ⊙ violet = section active

**AC** affiche un compteur (3) à droite ; la sous-liste `AC-1, AC-2, AC-3` est expandée par défaut, chaque AC montre un mini-dot coloré selon son état (vert si Given/When/Then remplis, orange si partiel).

**Pied du sommaire** : "Progression — 4/5" + barre 3px (orange→verte si tout est rempli) + "obligatoires remplies".

---

## Document (centre)

Padding `28px 56px 80px`. Largeur max 720px. Font-size 14px, line-height 1.62. Scroll-margin-top 80px sur les sections.

**Pour chaque section** :

```
┌─────────────────────────────────────────────────┐
│ ## Background    [obligatoire]              [?] │ header (border-bottom subtle)
│                                                  │
│  Aujourd'hui les stories se rédigent à la       │ prose
│  main dans un éditeur markdown générique…       │
│                                                  │
└─────────────────────────────────────────────────┘
```

- Titre en 17px / weight 600 / letter-spacing -0.01em.
- Pills à droite du titre : `obligatoire` (warning soft, mono 9.5px) ou `optionnel` (gris).
- Bouton `?` rond à droite (18px) qui révèle un tooltip avec le hint SPDD officiel de la section.
- **Sections vides** = un placeholder en pointillé : `1px dashed var(--line-strong)` + bg `--bg-2` + texte muted en italique ("Pose le décor : pourquoi cette story existe…"). Hover → border violette + bg violet-soft.
- **Prose remplie** : paragraphes 14px, **gras** sur les rôles ("En tant que **Product Owner**"), `code` violet clair `#c8b6ff` sur fond `--bg-3`, listes à puces avec mini-dot 4px gris.

### Front-matter (cas spécial)

Pas de prose. **Une grille clé/valeur** dans une card `--bg-2` :

```
┌──────────┬──────────────────────────────────┐
│ id       │ FRONT-002                         │
│ slug     │ spdd-editor                       │
│ title    │ Éditeur guidé SPDD                │
│ status   │ draft                             │
│          │   ↳ draft · reviewed · accepted…  │ hint
│ created  │ 2026-04-12                        │
│ updated  │ 2026-05-07                        │
│ owner    │ po-front@yuki                     │
│ modules  │ [frontend] [docs]                 │ chips
└──────────┴──────────────────────────────────┘
```

- Colonne gauche `110px`, label monospace 11.5px en `--text-muted`.
- Inputs sans bordure, monospace 13px, fond transparent, `--text-primary`.
- **Validation au blur** : si erreur, la row se teinte rouge-soft, l'input devient rouge, et un message apparaît sous l'input avec une icône triangle warning :
  > « L'identifiant doit suivre le format PRÉFIXE-XXX (ex. FRONT-042). »

  Les messages doivent être **utiles, pas génériques**. Pas de "champ invalide".

- **Modules** : chips monospace. Si un module n'est pas dans la liste connue (`frontend, backend, controller, extensions/auth, extensions/billing, helm, docs, cli`), il s'affiche en chip rouge avec `box-shadow: inset 0 0 0 1px var(--danger)`.

### Acceptance Criteria

Chaque AC = une **card** `--bg-2`, border `--line`, radius 6px. Header :

```
┌──────────────────────────────────────────────────────┐
│ [✓] AC-1   Saisie d'un Given/When/Then valide  ⋮ ⎘ 🗑 │
├──────────┬───────────────────────────────────────────┤
│ GIVEN    │ un nouveau formulaire d'AC vide          │
├──────────┼───────────────────────────────────────────┤
│ WHEN     │ le rédacteur saisit les 3 zones et clique │
├──────────┼───────────────────────────────────────────┤
│ THEN     │ l'AC s'ajoute en bas, le compteur n+1     │
└──────────┴───────────────────────────────────────────┘
```

- État à gauche : disque 14px avec `✓` (vert, complet), `!` (orange, partiel), numéro (violet, actif).
- Titre = input transparent, weight 500.
- Controls : drag-handle, dupliquer, supprimer (ghost icons, 22px, hover `--bg-3`).
- Grille Given/When/Then : colonne label 70px sur `--bg-1`, label monospace `--text-muted`, monte en `--warning` si la zone est vide. Inputs auto-resize.
- Card active : border violette + ring violet-soft + ombre violette douce.
- Footer = bouton dashed "+ Ajouter un AC".

---

## Inspector contextuel (droite, 360px)

Le panneau droit **change de contenu selon la section active**. Toujours :
1. Kicker monospace 10px uppercase ("INSPECTOR")
2. Titre 13.5px de la section
3. Sections empilées avec label monospace + card

**Contenus selon contexte** :

- **Section prose (Background, BV, etc.)** : "Définition SPDD" (le hint), "Recommandations" (4 puces : 2-4 phrases, mentionne le module, évite l'impératif, pas de solution technique), "IA" (rappel : sélectionne ≥3 mots pour ouvrir le menu).
- **Front-matter** : "Modules connus" (chips), "Statuts SPDD" (liste avec définition de chaque statut), "Validation" (explication du timing : blur pour la plupart, temps réel pour le slug).
- **AC** : "Définition SPDD" (Given/When/Then), "Bonnes pratiques" (1 AC = 1 comportement, Given = état pas pourquoi, Then au présent, évite les "et" multiples), "**Yuki suggère**" (card violet-soft avec une suggestion contextuelle : "AC-2 — le Then est encore vide. Décris ce qu'on observe à l'écran après le drag." + bouton "Pré-remplir").

---

## Assistance IA contextuelle

**Déclencheur** : sélection de ≥3 mots dans une section prose. La sélection se highlight avec `bg: primary-soft` + `box-shadow: inset 0 0 0 1px var(--primary)`.

**Popover** apparaît sous la sélection, ancré sur l'élément :

```
       ◇
┌──────────────────────────────────┐
│ ✦ Améliorer la lisibilité   ⌘1   │ ← hot par défaut
│ ✦ Enrichir le contenu        ⌘2  │
│ ✦ Reformuler                 ⌘3  │
│ ✦ Raccourcir                 ⌘4  │
│ ──────────────────────────────── │
│ ⓘ Yuki sait que tu rédiges la   │
│   section Background. Le contexte│
│   SPDD est inclus dans le prompt.│
│   Voir le prompt                  │
└──────────────────────────────────┘
```

- Min-width 240px, fond `--bg-elev`, ombre `0 8px 24px rgba(0,0,0,0.4)`, animation pop-in (12ms).
- Icône violette ✦ devant chaque action. Kbd shortcut à droite (`⌘1` style code-pill).
- L'item "hot" = celui qui s'exécute sur Enter, surligné violet-soft.
- Footer "trans" en `--text-muted` 11.5px : **explique au PO ce que Yuki sait du contexte**. C'est le différenciateur — pas de prompt magique caché.

**Après acceptation** : le panneau droit (Inspector) est remplacé par un **Diff Panel** qui occupe les 360px :

```
┌──────────────────────────────────┐
│ ✦ SUGGESTION DE YUKI             │
│ Reformuler            2.1s        │
├──────────────────────────────────┤
│ ┌────────────────────────────┐  │
│ │ AVANT                       │  │
│ │ la qualité dépend de la     │  │
│ │ rigueur du rédacteur        │  │
│ └────────────────────────────┘  │
│ ┌────────────────────────────┐  │
│ │ ✓ APRÈS                     │  │
│ │ la qualité varie selon la   │  │
│ │ rigueur et l'expérience     │  │
│ │ SPDD du rédacteur           │  │
│ └────────────────────────────┘  │
│ ┌────────────────────────────┐  │
│ │ DIFF                        │  │
│ │ − la qualité dépend de la…  │ rouge
│ │ + la qualité varie selon…   │ vert
│ └────────────────────────────┘  │
│  ↻ Régénérer    ⓘ Voir le prompt│
├──────────────────────────────────┤
│         [Refuser] [✓ Accepter]   │
└──────────────────────────────────┘
```

Pendant que le diff panel est ouvert, **la sélection dans le doc devient muted** (opacity 0.4, grayscale) pour indiquer qu'elle est en attente d'arbitrage.

---

## Bascule WYSIWYG ↔ Markdown

Segmented control dans le header. Le mode Markdown rend la story comme un **fichier .md syntaxe-coloré** :

- Numéros de ligne en gutter 50px à droite-aligné, `--text-faint`.
- Front-matter en YAML : `---`, clé `#c8b6ff`, valeur string `#9be3a8`, ponctuation `--text-muted`.
- `## Titres` en `#ffd089`, `### Sous-titres` en `#ffb3c1`.
- `**gras**` en `#f5f6fa` weight 600.
- Listes en `--text-secondary`.
- La ligne correspondant à la section active a un fond violet-soft, et son numéro de ligne devient violet.

Pas de perte au switch : on régénère le markdown depuis le state.

---

## Export

Le bouton "Exporter" du header est :
- **Primary (violet plein)** si toutes les sections obligatoires sont vertes.
- **Secondary (outlined)** sinon.

**Au clic, si erreurs**, popover qui descend depuis le bouton :

```
                          ◇
┌──────────────────────────────────┐
│ ⚠ Avant d'exporter, complète :   │
│ L'export `.md` exige les sections│
│ obligatoires.                    │
│                                  │
│ ✗ Front-matter complet      Aller→│
│ ✓ Background non-vide            │
│ ✓ Business Value non-vide        │
│ ✗ Au moins 1 Scope In       Aller→│
│ ✗ Tous les AC ont G/W/T     Aller→│
│                                  │
│            [Plus tard] [✦ Export]│ ← disabled
└──────────────────────────────────┘
```

Si tout est vert, le bouton "Exporter .md" est primary et un toast monte en bas-droite : "Story sauvée — front-matter valide  ⌘S".

---

## Footer (status bar)

Tout en monospace 11px `--text-muted`. Items :
- Pastille + `4/5 obligatoires` (vert si complet, orange sinon).
- Si manque : `manque : Background, Business Value` en orange (font-family UI ici exceptionnellement).
- Spacer.
- Raccourcis : `⌘K palette`, `⌘/ markdown`, `⌘↑↓ section`.
- `FRONT-002.md · UTF-8 · LF`.

---

## Story d'exemple à utiliser

Tous les artboards rendent **la même story** (FRONT-002 — l'éditeur SPDD se documente lui-même, méta-cool) :

```yaml
id: FRONT-002
slug: spdd-editor
title: "Éditeur guidé SPDD"
status: draft
created: 2026-04-12
updated: 2026-05-07
owner: po-front@yuki
modules: [frontend, docs]
```

- **Background** : "Aujourd'hui les stories se rédigent à la main dans un éditeur markdown générique, c'est lent et sujet à oublis de sections, et la qualité dépend de la rigueur du rédacteur. Cette friction freine l'adoption de SPDD chez les nouveaux PO."
- **Business Value** : "En tant que **Product Owner**, je veux rédiger des stories SPDD sans oublier de sections, afin de raccourcir les cycles de revue et faciliter l'embarquement des nouveaux rédacteurs."
- **Scope In** (5 puces) : édition guidée, bascule WYSIWYG/MD, IA contextuelle 4 actions, validation FM inline, export `.md`.
- **AC** :
  - AC-1 (complet) : Saisie d'un Given/When/Then valide.
  - AC-2 (Then vide) : Réordonner deux AC par drag.
  - AC-3 (Given vide) : Suppression d'un AC.

---

## Artboards à livrer

Sur un **DesignCanvas** unique (pan/zoom, sections + artboards reorderables), 1400×900 par artboard :

1. **01 — État par défaut.** Mode WYSIWYG, section Background active. Inspector affiche la définition SPDD + recommandations.
2. **02 — Bascule Markdown.** Mode `.md`, AC active, ligne ## Acceptance Criteria surlignée.
3. **03 — Popover IA sur sélection.** Sélection de "la qualité dépend… rédacteur" dans Background, popover ouvert avec les 4 actions et la transparence sur le contexte.
4. **04 — Panneau diff Avant/Après.** Suite de l'écran 3 après clic sur "Reformuler" : sélection muted dans le doc, panneau Avant/Après/Diff dans la colonne droite avec boutons Refuser/Accepter.
5. **05 — Erreurs front-matter.** ID mal formaté, slug avec espaces et casse, module inconnu, date invalide. Tous les messages d'erreur visibles. Inspector affiche le contexte FM (modules connus, statuts, règles de validation).
6. **06 — AC partiel + inspector qui guide.** AC-2 actif, son Then vide, l'inspector "Yuki suggère" pointe précisément ce qu'il manque + bouton "Pré-remplir".
7. **07 — Export prêt.** Story complète, popover export avec checklist 100% verte, bouton primary actif, toast confirmation visible en bas-droite.

Chaque artboard est un **vrai composant React fonctionnel**, pas un mock plat — on doit pouvoir taper dans les inputs, switcher de mode, etc.

---

## Tons rédactionnels

- **Toutes les copies en français.** Variables/code en anglais.
- **Hints et erreurs sont des phrases complètes**, jamais "champ requis" ou "format invalide". Toujours dire **pourquoi** et **comment réparer** : "L'identifiant doit suivre le format PRÉFIXE-XXX (ex. FRONT-042)."
- **Yuki ne tutoie pas le PO comme un copain.** Tutoiement sobre, neutre, factuel. Jamais d'enthousiasme forcé, jamais d'émojis dans la copy.
- **Vocabulaire SPDD** : story, section, AC (Acceptance Criteria), front-matter, Given/When/Then. Pas de "user story", pas de "ticket", pas de "tâche".

---

## Architecture technique attendue

- React 18.3.1 via UMD + Babel standalone (pas de bundler). 
- Modules JSX séparés par responsabilité : `spdd-data.js` (model), `spdd-icons.jsx`, `spdd-shell.jsx` (chrome), `spdd-toc.jsx`, `spdd-sections.jsx` (FM/AC/prose), `spdd-ai.jsx` (popover/diff/inspector/export/toast), `spdd-editor.jsx` (body + markdown render), `spdd-app.jsx` (composition + canvas).
- Toutes les exportations passent par `Object.assign(window, {...})` ou `window.X = X` (les babel scripts ne partagent pas leur scope).
- **Aucun assets externe** sauf Google Fonts (Inter + JetBrains Mono).
- CSS dans un fichier unique `spdd-editor.css`, scopé sous `.yk` pour ne pas bleed sur le canvas.
- Le canvas utilise le starter `design_canvas.jsx`.

---

Voilà. Tu peux donner ce prompt à Claude Code, à un nouveau projet Omelette, ou à un designer qui prend la suite — l'éditeur doit pouvoir être reconstruit à l'identique à partir de ce document seul.

