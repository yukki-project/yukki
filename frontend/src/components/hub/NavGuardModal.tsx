// NavGuardModal — modal de confirmation affiché quand l'utilisateur
// tente une navigation (changement d'artefact, switch de mode
// activity bar, etc.) alors que l'éditeur a des modifs non
// sauvegardées (`isDirty === true`).
//
// Câblé via useNavGuardStore : tant que `pendingAction` est non
// null, le modal s'affiche. Sur "Quitter sans sauver" → reset
// isDirty + exécute l'action ; le SpddEditor se rechargera sur
// le nouveau selectedPath et repassera en view-only via son
// useEffect existant. Sur "Annuler" → drop l'action, on reste où
// on est.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavGuardStore } from '@/stores/navGuard';
import { useSpddEditorStore } from '@/stores/spdd';

export function NavGuardModal(): JSX.Element {
  const pending = useNavGuardStore((s) => s.pendingAction);
  const confirm = useNavGuardStore((s) => s.confirm);
  const cancel = useNavGuardStore((s) => s.cancel);
  const setDirty = useSpddEditorStore((s) => s.setDirty);

  const handleConfirm = () => {
    // Reset isDirty avant d'exécuter l'action — le SpddEditor
    // verra le nouveau selectedPath / mode et rechargera en
    // view-only (son useEffect appelle setIsEditMode(false)).
    setDirty(false);
    confirm();
  };

  return (
    <Dialog open={pending !== null} onOpenChange={(open) => !open && cancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifications non sauvegardées</DialogTitle>
          <DialogDescription>
            Tu as des modifications dans l'éditeur qui ne sont pas
            sauvegardées sur disque. Si tu quittes maintenant, tu
            les perdras.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={cancel}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Quitter sans sauver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
