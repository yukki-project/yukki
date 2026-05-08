// UI-015 — Tokens couleur LIGHT MODE dédiés au PDF.
//
// Le SpddEditor (UI yukki) est en dark mode → texte clair sur fond
// sombre. Un PDF se lit / s'imprime sur fond blanc → il faut INVERSER
// les contrastes. On reproduit la même structure que `ykTokens` mais
// avec une palette adaptée au print.
//
// Choix de design :
//   - Fond blanc strict (pas de gris page) — meilleur rendu à l'impression
//   - Texte primaire ~black (#1a1c25) plutôt que noir pur — moins
//     fatigant à l'écran
//   - Accent violet conservé (yk-primary #8b6cff) — fonctionne aussi
//     bien sur fond clair
//   - Surfaces subtiles (#f8f8fa, #eef0f4) pour les zones « code » et
//     « card » sans casser la lisibilité.

export const pdfTokens = {
  // Surfaces (light → claires)
  bgPage: '#ffffff',
  bg1: '#ffffff',
  bg2: '#fafafc',
  bg3: '#f0f1f4',
  bgSubtle: '#f8f8fa',
  bgCard: '#ffffff',
  bgCardElev: '#fafafc',

  // Lines (claires → mid-gray)
  line: '#dadde3',
  lineSubtle: '#e9ebef',
  lineStrong: '#b8bcc6',

  // Text (sombre sur fond clair)
  textPrimary: '#1a1c25',
  textSecondary: '#3f4252',
  textMuted: '#6b6e80',
  textFaint: '#8d909e',

  // Accent — conservé identique. NB: @react-pdf/renderer ne rend pas
  // toujours rgba() correctement sur les borderXxxColor (fallback vert
  // ou noir observé). On expose donc des variantes hex solides pour
  // les bordures.
  primary: '#8b6cff',
  primarySoft: 'rgba(139, 108, 255, 0.10)', // pour backgroundColor — OK
  primarySoftSolid: '#efeaff',                // pour borders — équivalent visuel sur fond blanc
  primaryRing: 'rgba(139, 108, 255, 0.25)',

  // Semantics (un peu plus saturés pour la lisibilité)
  success: '#1f9d5f',
  successSoft: '#e6f6ee',
  warning: '#b8741e',
  warningSoft: '#fdf2e0',
  danger: '#c53737',
  dangerSoft: '#fbe9e9',

  // Code colors — adaptés au fond clair (plus saturés que le dark)
  codeKey: '#7847d3',
  codeString: '#107a3e',
  codeHeading: '#9c5e0e',

  // Radii (en px — @react-pdf ne lit pas les rem)
  radiusSm: 4,
  radius: 6,
  radiusMd: 8,
  radiusLg: 10,
} as const;

export type PdfTokens = typeof pdfTokens;
