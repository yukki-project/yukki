// UI-021 O5 — Hook qui binde une touche clavier au niveau document
// avec une garde « cible ∉ input/textarea/contenteditable » pour ne
// pas voler les frappes dans les formulaires.
//
// Utilisation prévue : `F1` au niveau App.tsx pour ouvrir / fermer
// l'AboutDialog. Le hook reste générique (n'importe quelle key) et
// peut être consommé par d'autres raccourcis si besoin.

import { useEffect } from 'react';

/**
 * Binde `key` au keydown du document. Le handler n'est PAS appelé
 * si l'event est dispatché depuis un input / textarea / élément
 * contenteditable. Le handler est cleaned up au démount.
 *
 * @param key Valeur de `KeyboardEvent.key` à intercepter
 *   (par exemple `'F1'`, `'Escape'`, `'?'`).
 * @param handler Callback exécuté sur match.
 */
export function useKeyboardShortcut(
  key: string,
  handler: (event: KeyboardEvent) => void,
): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== key) return;

      const target = event.target;
      if (target instanceof HTMLInputElement) return;
      if (target instanceof HTMLTextAreaElement) return;
      if (target instanceof HTMLElement && target.isContentEditable) return;

      event.preventDefault();
      handler(event);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [key, handler]);
}
