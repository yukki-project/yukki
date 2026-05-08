# Fonts pour l'export PDF (UI-015)

`@react-pdf/renderer` ne connaît que Helvetica/Times/Courier par défaut.
Pour reproduire la typographie du SpddEditor (Inter + JetBrains Mono),
les fichiers `.ttf` ci-dessous doivent être présents :

- `Inter-Regular.ttf`
- `Inter-Bold.ttf`
- `Inter-Italic.ttf`
- `JetBrainsMono-Regular.ttf`
- `JetBrainsMono-Bold.ttf`

## Sources (OFL — gratuites)

- **Inter** : <https://github.com/rsms/inter/releases> (`Inter-3.x.zip` →
  `Inter Desktop/`).
- **JetBrains Mono** : <https://github.com/JetBrains/JetBrainsMono/releases>
  (`JetBrainsMono-2.x.zip` → `fonts/ttf/`).

Placer les fichiers directement à la racine de ce dossier (pas de
sous-dossier supplémentaire). Vite les sert sous `/fonts/<name>.ttf`,
chemin attendu par
[`PdfMarkdown.tsx`](../../src/components/spdd/pdf/PdfMarkdown.tsx).

## Comportement si les fichiers sont absents

`@react-pdf/renderer` retombe sur la police par défaut (Helvetica) avec
un warning console. Le PDF reste lisible, juste avec une typographie
plus terne. Pas de crash.

## Licence

Inter et JetBrains Mono sont distribuées sous **SIL Open Font License
1.1** (OFL). Les `.ttf` peuvent être commitées dans le repo sans
contrainte d'attribution dans le binaire.
