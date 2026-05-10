// UI-014d — Adds AiPopover (global floating) and AiDiffPanel (replaces
// inspector during generating/diff phases).
// UI-014f — O6: Instancie useSpddSuggest, passe en props AiDiffPanel/AiPopover.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Sparkles, X } from 'lucide-react';
import { SpddHeader } from './SpddHeader';
import { SpddFooter } from './SpddFooter';
import { SpddTOC } from './SpddTOC';
import { SpddDocument } from './SpddDocument';
import { SpddInspector } from './SpddInspector';
import { GenericInspector } from './GenericInspector';
import { SpddMarkdownView } from './SpddMarkdownView';
import { AiPopover } from './AiPopover';
import { AiDiffPanel } from './AiDiffPanel';
import { RestructureInspector } from './RestructureInspector';
import { useSpddEditorStore } from '@/stores/spdd';
import { useArtifactsStore } from '@/stores/artifacts';
import { useClaudeStore } from '@/stores/claude';
import { useRestructureStore } from '@/stores/restructure';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useSpddSuggest } from '@/hooks/useSpddSuggest';
import { useRestructureSession } from '@/hooks/useRestructureSession';
import { markdownToDraft } from './parser';
import { draftToMarkdown } from './serializer';
import {
  AcquireEditLock,
  ReadArtifact,
  ReleaseEditLock,
  WriteArtifact,
} from '../../../wailsjs/go/main/App';
import { parseTemplate, detectArtifactTypeFromPath, templatePathFor } from '@/lib/templateParser';
import { parseArtifactContent, serializeArtifact } from '@/lib/genericSerializer';
import { computeDivergence, divergenceWarnings } from '@/lib/templateDivergence';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import type { SectionKey } from './types';
import type { SuggestionRequest } from '@/hooks/useSpddSuggest';
import type { EditState } from '@/lib/genericSerializer';
import type { ParsedTemplate } from '@/lib/templateParser';

// ─── Warnings banner ──────────────────────────────────────────────────────

// Limite défensive UI-019 D2 (alignée avec uiapp.MaxRestructureBytes côté Go).
const RESTRUCTURE_MAX_BYTES = 30_000;

// UI-023 — banner affiché quand le watcher détecte une modification
// disque sur l'artefact ouvert pendant que l'utilisateur l'édite
// (isDirty=true). Choix explicite reload / keep-mine.
function ConflictWarningBanner({
  onReload,
  onKeepLocal,
}: {
  onReload: () => void;
  onKeepLocal: () => void;
}): JSX.Element {
  return (
    <div
      role="alert"
      className={cn(
        'col-span-3 flex items-start gap-3 border-b border-yk-warning bg-[color:var(--yk-warning-soft)]',
        'px-4 py-2',
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yk-warning" />
      <div className="flex-1 text-[13px] text-yk-text-primary">
        <p className="font-medium">
          Modifications externes détectées sur disque
        </p>
        <p className="mt-1 text-[12px] text-yk-text-secondary">
          Ce fichier a été modifié hors de yukki alors que tu as des
          modifications locales non sauvegardées.
        </p>
      </div>
      <button
        type="button"
        onClick={onReload}
        title="Recharger depuis le disque (perdre mes modifs locales)"
        className="flex shrink-0 items-center gap-1.5 self-start rounded-yk-sm border border-yk-primary px-3 py-1 font-inter text-[12px] text-yk-primary hover:bg-[color:var(--yk-primary-soft)]"
      >
        Recharger depuis le disque
      </button>
      <button
        type="button"
        onClick={onKeepLocal}
        title="Garder mes modifs (le prochain Save écrasera le disque)"
        className="flex shrink-0 items-center gap-1.5 self-start rounded-yk-sm border border-yk-line px-3 py-1 font-inter text-[12px] text-yk-text-secondary hover:bg-yk-bg-2"
      >
        Garder mes modifs
      </button>
    </div>
  );
}

// UI-023 — état affiché à la place du SpddDocument quand le fichier
// ouvert a été supprimé hors de yukki. L'utilisateur peut Fermer
// pour décrocher la sélection.
function DeletedArtifactState({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <div
      role="alert"
      className="flex flex-1 flex-col items-center justify-center gap-3 bg-yk-bg-1 px-6 text-center"
    >
      <AlertTriangle className="h-8 w-8 text-yk-warning" />
      <p className="font-inter text-[14px] font-medium text-yk-text-primary">
        Cet artefact n'existe plus
      </p>
      <p className="max-w-md font-inter text-[12.5px] text-yk-text-secondary">
        Le fichier a été supprimé hors de yukki (commande externe, git
        checkout, etc.). Le contenu chargé en mémoire ne reflète plus
        rien sur disque.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="rounded-yk-sm border border-yk-line bg-yk-bg-2 px-4 py-1.5 font-inter text-[12px] text-yk-text-primary hover:bg-yk-bg-3"
      >
        Fermer
      </button>
    </div>
  );
}

function WarningsBanner({
  warnings,
  onDismiss,
  onRestructure,
  restructureDisabledReason,
}: {
  warnings: string[];
  onDismiss: () => void;
  /** Click handler du bouton « Restructurer avec l'IA ». null →
   * bouton non rendu (pas de désync template, AC5). */
  onRestructure: (() => void) | null;
  /** Quand non-null, le bouton est rendu mais désactivé avec ce
   * tooltip (AC4 Claude indispo, D2 trop volumineux). */
  restructureDisabledReason: string | null;
}): JSX.Element | null {
  if (warnings.length === 0) return null;
  return (
    <div
      role="alert"
      className={cn(
        'col-span-3 flex items-start gap-3 border-b border-yk-warning bg-[color:var(--yk-warning-soft)]',
        'px-4 py-2',
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yk-warning" />
      <div className="flex-1 text-[13px] text-yk-text-primary">
        <p className="font-medium">
          Le format ne correspond plus au template SPDD — passer en WYSIWYG va appliquer la structure attendue.
        </p>
        <ul className="mt-1 list-disc pl-4 text-[12px] text-yk-text-secondary">
          {warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      </div>
      {onRestructure && (
        <button
          type="button"
          onClick={onRestructure}
          disabled={restructureDisabledReason !== null}
          title={restructureDisabledReason ?? 'Demander à l\'IA de remapper le contenu vers la structure attendue'}
          className={cn(
            'flex shrink-0 items-center gap-1.5 self-start rounded-yk-sm px-3 py-1 font-inter text-[12px]',
            restructureDisabledReason
              ? 'cursor-not-allowed border border-yk-line bg-yk-bg-2 text-yk-text-muted opacity-60'
              : 'border border-yk-primary text-yk-primary hover:bg-[color:var(--yk-primary-soft)]',
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Restructurer avec l'IA
        </button>
      )}
      <button
        type="button"
        aria-label="Fermer l'avertissement"
        onClick={onDismiss}
        className="text-yk-text-muted hover:text-yk-text-primary"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────

export function SpddEditor(): JSX.Element {
  const draft = useSpddEditorStore((s) => s.draft);
  const viewMode = useSpddEditorStore((s) => s.viewMode);
  const markdownSource = useSpddEditorStore((s) => s.markdownSource);
  const markdownWarnings = useSpddEditorStore((s) => s.markdownWarnings);
  const scrollToSection = useSpddEditorStore((s) => s.scrollToSection);
  const activeSection = useSpddEditorStore((s) => s.activeSection);
  const setActiveSection = useSpddEditorStore((s) => s.setActiveSection);
  const setMarkdownSource = useSpddEditorStore((s) => s.setMarkdownSource);
  const clearScrollToSection = useSpddEditorStore((s) => s.clearScrollToSection);
  const resetDraft = useSpddEditorStore((s) => s.resetDraft);
  const aiPhase = useSpddEditorStore((s) => s.aiPhase);
  const aiSelection = useSpddEditorStore((s) => s.aiSelection);
  const setDirty = useSpddEditorStore((s) => s.setDirty);

  const selectedPath = useArtifactsStore((s) => s.selectedPath);

  // UI-014h: state local pour le rendu piloté par template
  const [editState, setEditState] = useState<EditState | null>(null);
  // UI-019 D1 — wrapper qui marque le draft dirty quand SpddDocument
  // remonte une modification user. Le chemin de chargement initial
  // utilise setEditState() directement (pas via ce wrapper) pour ne
  // pas marquer dirty à l'ouverture d'un fichier.
  const setEditStateDirty = useCallback((next: EditState | null) => {
    setEditState(next);
    setDirty(true);
  }, [setDirty]);
  const [parsedTemplate, setParsedTemplate] = useState<ParsedTemplate | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  // UI-014h O12: section active dans le chemin générique (pour TOC + Inspector)
  const [activeGenericIndex, setActiveGenericIndex] = useState<number>(0);
  // UI-014h O13: dismissal local du banner de divergence (par fichier ouvert)
  const [divergenceDismissed, setDivergenceDismissed] = useState(false);
  // UI-014h — saved indicator local pour le chemin générique (Ctrl+S → WriteArtifact OK)
  const [genericSavedAt, setGenericSavedAt] = useState<string | null>(null);
  const { toast } = useToast();

  // Charger l'artefact sélectionné depuis le hub
  useEffect(() => {
    if (!selectedPath) return;
    let aborted = false;
    const currentDraft = useSpddEditorStore.getState().draft;

    // Reset propre de l'overlay restructure IA + de la session
    // streaming en cours quand l'utilisateur change d'artefact.
    // Sans ce reset, l'Inspector du nouvel artefact garderait la
    // bulle "RESTRUCTURATION IA" de la session précédente
    // (useRestructureStore.open est sticky par défaut).
    useRestructureStore.getState().closeOverlay();
    void restructureSession.cancel();

    ReadArtifact(selectedPath)
      .then(async (raw) => {
        if (aborted) return;

        // Charger story dans le store story-draft (pour AI assist)
        const { draft: loaded, warnings } = markdownToDraft(raw, currentDraft);
        resetDraft(loaded);
        useSpddEditorStore.setState({ markdownWarnings: warnings });

        // UI-014h: charger le template pour piloter le rendu et les annotations.
        // Story garde le rendu legacy (editState === null) mais on charge tout
        // de même `parsedTemplate` pour accéder aux `required`/`help` annotés
        // dans story.md (au lieu de hardcoder dans sections.ts).
        const type = detectArtifactTypeFromPath(selectedPath);
        const tmplPath = templatePathFor(selectedPath, type);
        if (tmplPath) {
          try {
            const tmplRaw = await ReadArtifact(tmplPath);
            if (aborted) return;
            const tmpl = parseTemplate(tmplRaw);
            setParsedTemplate(tmpl);
            if (type !== 'story') {
              const es = parseArtifactContent(raw, tmpl);
              setEditState(es);
              // Effacer les warnings story — l'artefact est piloté par son propre template
              useSpddEditorStore.setState({ markdownWarnings: [] });
            } else {
              setEditState(null);
            }
            setIsEditMode(false);
            setDivergenceDismissed(false);
            setGenericSavedAt(null);
          } catch {
            // Template absent ou erreur de lecture → fallback complet
            if (!aborted) {
              setParsedTemplate(null);
              setEditState(null);
              setIsEditMode(false);
            }
          }
        } else {
          setParsedTemplate(null);
          setEditState(null);
          setIsEditMode(false);
        }
      })
      .catch(() => {
        // En cas d'erreur on garde le draft courant
      });

    return () => { aborted = true; };
  }, [selectedPath, resetDraft]);

  // UI-014h: sauvegarde via WriteArtifact + serializeArtifact.
  // Helper utilisé par Ctrl+S et par le bouton « Terminer » (toggle
  // isEditMode → false). Sans cette écriture, basculer en view-only
  // ne persiste rien sur disque et l'utilisateur perd ses modifs au
  // prochain démarrage de yukki.
  const saveCurrentEditState = useCallback((): Promise<void> => {
    if (!editState || !parsedTemplate) return Promise.resolve();
    const path = selectedPath;
    if (!path) return Promise.resolve();
    const content = serializeArtifact(editState, parsedTemplate);
    return WriteArtifact(path, content)
      .then(() => {
        setGenericSavedAt(new Date().toISOString());
        useSpddEditorStore.getState().setDirty(false);
        toast({ title: 'Sauvegardé ✓', duration: 3000 });
      })
      .catch((err: unknown) => {
        toast({
          title: "Erreur d'enregistrement",
          description: String(err),
          duration: 5000,
          variant: 'destructive',
        });
      });
  }, [editState, parsedTemplate, selectedPath, toast]);

  useEffect(() => {
    if (!editState || !parsedTemplate) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void saveCurrentEditState();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editState, parsedTemplate, saveCurrentEditState]);

  // « Terminer » (passage edit → view-only) sauvegarde implicitement.
  // L'utilisateur a vécu ce bouton comme un commit (cf. retour user
  // « entre deux redémarrages je perds ce qui a été fait ») ; le
  // forcer à Ctrl+S après chaque session d'édition est une friction
  // sans valeur. « Modifier » (view-only → edit) reste un toggle pur.
  const handleToggleEditMode = useCallback(() => {
    if (isEditMode) {
      void saveCurrentEditState();
    }
    setIsEditMode((v) => !v);
  }, [isEditMode, saveCurrentEditState]);

  // UI-023 — edit-lock lifecycle. Acquire le lock côté Go quand on
  // entre en édition sur un path donné, release quand on en sort
  // (toggle, navigation, unmount). Sans ça, le watcher fsnotify
  // re-firerait un event sur chaque WriteArtifact (Ctrl+S, Accept
  // restructure, Terminer) → reset de l'editState, perte de saisie.
  useEffect(() => {
    if (!isEditMode || !selectedPath) return;
    void AcquireEditLock(selectedPath).catch((err: unknown) => {
      logger.warn('AcquireEditLock failed', {
        path: selectedPath,
        err: err instanceof Error ? err.message : String(err),
      });
    });
    return () => {
      void ReleaseEditLock(selectedPath).catch(() => {});
    };
  }, [isEditMode, selectedPath]);

  // UI-023 — reset des états réactifs au changement d'artefact :
  // le banner conflit et l'état "supprimé" sont liés au path
  // courant, donc invalidés dès qu'on passe à un autre fichier.
  const clearConflictWarning = useSpddEditorStore((s) => s.clearConflictWarning);
  const setDeleted = useSpddEditorStore((s) => s.setDeleted);
  useEffect(() => {
    clearConflictWarning();
    setDeleted(false);
  }, [selectedPath, clearConflictWarning, setDeleted]);

  // UI-023 — re-load live quand le watcher signale une modif disque
  // sur le fichier ouvert (sans modifs locales). Le hook
  // useFsWatchSubscriber bump le counter, on observe et relit
  // l'artefact pour refléter le contenu disque sans intervention
  // utilisateur. Pas de toast — le refresh est silencieux par
  // contrat (cf. story Scope Out).
  const externalReloadCounter = useSpddEditorStore((s) => s.externalReloadCounter);
  useEffect(() => {
    if (externalReloadCounter === 0) return;
    if (!selectedPath || !parsedTemplate) return;
    let aborted = false;
    void ReadArtifact(selectedPath)
      .then((raw) => {
        if (aborted) return;
        const reparsed = parseArtifactContent(raw, parsedTemplate);
        setEditState(reparsed);
        // Reload externe = état clean côté disque.
        useSpddEditorStore.getState().setDirty(false);
      })
      .catch((err: unknown) => {
        logger.warn('external reload failed', {
          path: selectedPath,
          err: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      aborted = true;
    };
  }, [externalReloadCounter, selectedPath, parsedTemplate]);

  // CORE-007: auto-save to backend every 2s of inactivity.
  // Désactivé quand editState est non-null (évite conflit DraftSave vs WriteArtifact).
  useAutoSave(draft, editState === null);

  // UI-014f: real streaming suggestion hook.
  const suggestResult = useSpddSuggest();

  // Build the current request from the store selection when streaming starts.
  const currentRequest: SuggestionRequest | null =
    aiSelection
      ? { section: aiSelection.sectionKey, action: '', selectedText: aiSelection.text }
      : null;

  // Sync suggestResult.state → store aiPhase so SpddEditor can show DiffPanel.
  useEffect(() => {
    if (suggestResult.state === 'done') {
      useSpddEditorStore.setState({ aiPhase: 'diff' });
    } else if (suggestResult.state === 'error') {
      // Keep the panel open so the error message is visible — the user can
      // retry or close by clicking Refuser.
      useSpddEditorStore.setState({ aiPhase: 'diff' });
    }
  }, [suggestResult.state]);

  const dismissWarnings = useCallback(() => {
    if (editState && parsedTemplate) {
      // UI-014h O13: dismiss du banner de divergence (local, par fichier)
      setDivergenceDismissed(true);
    } else {
      useSpddEditorStore.setState({ markdownWarnings: [] });
    }
  }, [editState, parsedTemplate]);

  // UI-014h O13: warnings affichés = divergence (chemin générique) ou markdownWarnings (story)
  const warningsToShow: string[] = (() => {
    if (editState && parsedTemplate && !divergenceDismissed) {
      return divergenceWarnings(computeDivergence(editState, parsedTemplate));
    }
    return markdownWarnings;
  })();

  // UI-019 — restructuration IA + overlay Inspector.
  const restructureSession = useRestructureSession();
  const restructureOpen = useRestructureStore((s) => s.open);
  const claudeAvailable = useClaudeStore((s) => s.status.Available);
  // Le bouton « Restructurer avec l'IA » s'enclenche dans deux cas :
  //   - chemin générique (editState !== null) → on lit directement
  //     editState + parsedTemplate.
  //   - chemin story-legacy (editState === null) → on sérialise le
  //     draft courant ou le markdownSource selon viewMode, puis on
  //     re-parse via parseArtifactContent pour calculer la divergence
  //     comme si on était en générique. Le `restructureCurrentMarkdown`
  //     représente l'état utilisateur courant dans les deux cas.
  const restructureCurrentMarkdown: string | null = (() => {
    if (editState && parsedTemplate) {
      return serializeArtifact(editState, parsedTemplate);
    }
    if (parsedTemplate) {
      return viewMode === 'markdown' ? markdownSource : draftToMarkdown(draft);
    }
    return null;
  })();
  const restructureDivergence = (() => {
    if (!parsedTemplate || !restructureCurrentMarkdown) return null;
    if (editState) return computeDivergence(editState, parsedTemplate);
    // Story-legacy : reconstruire un EditState éphémère ne suffit pas
    // (`draftToMarkdown` re-émet les headings même quand les sections
    // sont vides — divergence calculée à 0). On bascule sur les
    // `markdownWarnings` produits par le parser story qui ont déjà la
    // bonne sémantique « section absente ». On extrait le heading
    // depuis le format de chaîne `La section X est absente.`.
    if (markdownWarnings.length === 0) return null;
    const missingRequired = markdownWarnings
      .map((w) => {
        const m = w.match(/^La section (.+?) est absente\./);
        return m ? `## ${m[1]}` : null;
      })
      .filter((s): s is string => s !== null);
    return { missingRequired, orphanSections: [] };
  })();
  const restructureEligible =
    parsedTemplate !== null
    && restructureCurrentMarkdown !== null
    && restructureDivergence !== null
    && (restructureDivergence.missingRequired.length > 0
        || restructureDivergence.orphanSections.length > 0);
  const restructureDisabledReason: string | null = (() => {
    if (!claudeAvailable) return 'Claude CLI indisponible';
    if (restructureCurrentMarkdown && restructureCurrentMarkdown.length > RESTRUCTURE_MAX_BYTES) {
      const kb = Math.round(restructureCurrentMarkdown.length / 1000);
      return `Document trop volumineux (${kb} KB / 30 KB max)`;
    }
    return null;
  })();
  const handleRestructureClick = useCallback(() => {
    if (!restructureEligible || !restructureCurrentMarkdown || !restructureDivergence) return;
    if (restructureDisabledReason) return;
    const templateName = selectedPath ? detectArtifactTypeFromPath(selectedPath) : 'story';
    // Bascule l'éditeur en mode édition au moment du clic — la
    // restructuration produit un diff que l'utilisateur acceptera ;
    // sans ce switch il atterrirait en read-only et devrait
    // re-cliquer Modifier pour toucher au résultat. Le bouton
    // Modifier/Terminer du header reste l'override manuel après.
    setIsEditMode(true);
    useRestructureStore.getState().openOverlay(restructureCurrentMarkdown);
    void restructureSession.start({
      fullMarkdown: restructureCurrentMarkdown,
      templateName,
      divergence: {
        missingRequired: restructureDivergence.missingRequired,
        orphanSections: restructureDivergence.orphanSections,
      },
    });
  }, [
    restructureEligible,
    restructureCurrentMarkdown,
    restructureDivergence,
    restructureDisabledReason,
    restructureSession,
    selectedPath,
  ]);
  const handleRestructureAccept = useCallback((after: string, before: string) => {
    // Réinjecter le front-matter intact (si présent) ; le LLM n'a vu
    // que le body (cf. uiapp.splitFrontMatter). On reconstitue
    // frontMatter + after avant d'appliquer.
    // `before` est passé en argument par RestructureInspector parce
    // que le store a été reset synchroniquement par accept() avant
    // que ce callback ne s'exécute (lire le store ici renverrait null).
    if (!parsedTemplate || !selectedPath) return;
    const fmEnd = findFrontMatterEnd(before);
    const frontMatter = fmEnd > 0 ? before.slice(0, fmEnd) : '';
    const reassembled = frontMatter + after;

    if (editState) {
      // Generic path : re-parser puis serialize → écriture disque
      // immédiate. UX : Accept = "j'ai vu le diff, applique +
      // sauvegarde". Sans cet auto-save, isDirty reste true et le
      // navGuard re-déclenche la pop-up à chaque clic dans la
      // sidebar — vécu comme un bug.
      const reparsed = parseArtifactContent(reassembled, parsedTemplate);
      setEditState(reparsed);
      const content = serializeArtifact(reparsed, parsedTemplate);
      WriteArtifact(selectedPath, content)
        .then(() => {
          setGenericSavedAt(new Date().toISOString());
          useSpddEditorStore.getState().setDirty(false);
          toast({ title: 'Restructuration sauvegardée ✓', duration: 3000 });
        })
        .catch((err: unknown) => {
          // Échec disque → on garde dirty=true pour que l'utilisateur
          // puisse retenter via Ctrl+S.
          setDirty(true);
          toast({
            title: "Erreur d'enregistrement après restructuration",
            description: String(err),
            duration: 5000,
            variant: 'destructive',
          });
        });
    } else {
      // Story-legacy path : forcer le mode markdown avec le résultat
      // puis sauvegarder. L'auto-save backend pickup le markdownSource
      // au prochain tick (cf. useAutoSave + DraftSave côté Go).
      useSpddEditorStore.setState({
        markdownSource: reassembled,
        viewMode: 'markdown',
        isDirty: true,
      });
      WriteArtifact(selectedPath, reassembled)
        .then(() => {
          useSpddEditorStore.getState().setDirty(false);
          toast({ title: 'Restructuration sauvegardée ✓', duration: 3000 });
        })
        .catch((err: unknown) => toast({
          title: "Erreur d'enregistrement après restructuration",
          description: String(err),
          duration: 5000,
          variant: 'destructive',
        }));
    }
  }, [editState, parsedTemplate, selectedPath, setDirty, toast]);

  // UI-019 — validation Accept : on lit le markdown `after` calculé par
  // l'IA et on vérifie que toutes les sections obligatoires du template
  // sont présentes (et non vides). Si elles manquent, le bouton
  // Accepter du Inspector est désactivé avec la liste en tooltip et
  // banner d'avertissement. Dérivation pure → pas de useMemo nécessaire.
  const restructureAfter = useRestructureStore((s) => s.after);
  const restructureAcceptValidation: { allowed: boolean; reason: string } | null = (() => {
    if (!restructureAfter || !parsedTemplate) return null;
    const before = useRestructureStore.getState().before ?? '';
    const fmEnd = findFrontMatterEnd(before);
    const frontMatter = fmEnd > 0 ? before.slice(0, fmEnd) : '';
    const reassembled = frontMatter + restructureAfter;
    const ephemeral = parseArtifactContent(reassembled, parsedTemplate);
    const div = computeDivergence(ephemeral, parsedTemplate);
    if (div.missingRequired.length === 0) {
      return { allowed: true, reason: '' };
    }
    return {
      allowed: false,
      reason: `Sections obligatoires encore manquantes : ${div.missingRequired.join(', ')}. Refuse pour relancer ou modifie le résultat avant d'accepter.`,
    };
  })();

  // Debounce IntersectionObserver-driven activeSection updates so they don't
  // jitter while a smooth-scroll is still resolving.
  const scrollDebounceRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);

  const handleTocClick = useCallback(
    (key: SectionKey) => {
      isProgrammaticScrollRef.current = true;
      setActiveSection(key);
      if (viewMode === 'wysiwyg') {
        const el = document.getElementById(`spdd-section-${key}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 600);
    },
    [setActiveSection, viewMode],
  );

  const handleScrollSection = useCallback(
    (key: SectionKey) => {
      if (isProgrammaticScrollRef.current) return;
      if (scrollDebounceRef.current) window.clearTimeout(scrollDebounceRef.current);
      scrollDebounceRef.current = window.setTimeout(() => {
        // UI-014h O12: les keys génériques ont le format `spdd-section-generic-<idx>`
        const genericMatch = (key as string).match(/^spdd-section-generic-(\d+)$/);
        if (genericMatch) {
          setActiveGenericIndex(parseInt(genericMatch[1], 10));
          return;
        }
        setActiveSection(key);
      }, 80);
    },
    [setActiveSection],
  );

  useEffect(() => {
    return () => {
      if (scrollDebounceRef.current) window.clearTimeout(scrollDebounceRef.current);
    };
  }, []);

  const isMarkdown = viewMode === 'markdown';
  // UI-014h — layout piloté par editState. Symétrie story/inbox : Inspector
  // toujours visible (sauf markdown ou diff panel). Le mode lecture seule
  // affecte les inputs, pas la visibilité de l'Inspector.
  const hasEditState = editState !== null;
  const showDiffPanel = !isMarkdown && !hasEditState && (aiPhase === 'generating' || aiPhase === 'diff');
  const showInspector = !isMarkdown && !showDiffPanel;
  const gridCols = isMarkdown
    ? 'grid-cols-[240px_1fr]'
    : 'grid-cols-[240px_1fr_360px]';

  // UI-023 — états réactifs au watcher disque
  const conflictWarning = useSpddEditorStore((s) => s.conflictWarning);
  const deleted = useSpddEditorStore((s) => s.deleted);

  const handleReloadFromDisk = useCallback((): void => {
    if (!selectedPath || !parsedTemplate) return;
    void ReadArtifact(selectedPath)
      .then((raw) => {
        const reparsed = parseArtifactContent(raw, parsedTemplate);
        setEditState(reparsed);
        setDirty(false);
        clearConflictWarning();
        toast({ title: 'Rechargé depuis le disque ✓', duration: 3000 });
      })
      .catch((err: unknown) => {
        toast({
          title: 'Erreur de rechargement',
          description: String(err),
          duration: 5000,
          variant: 'destructive',
        });
      });
  }, [selectedPath, parsedTemplate, setDirty, clearConflictWarning, toast]);

  const handleKeepLocal = useCallback((): void => {
    clearConflictWarning();
  }, [clearConflictWarning]);

  const handleCloseDeleted = useCallback((): void => {
    setDeleted(false);
    useArtifactsStore.setState({ selectedPath: '' });
  }, [setDeleted]);

  return (
    <div
      className="yk grid h-full w-full min-h-0 grid-rows-[40px_1fr_28px] bg-yk-bg-page font-inter text-yk-text-primary"
      data-testid="spdd-editor"
    >
      <SpddHeader
        editState={editState}
        isEditMode={isEditMode}
        onToggleEditMode={handleToggleEditMode}
        genericSavedAt={genericSavedAt}
        parsedTemplate={parsedTemplate}
      />

      <div
        className={cn('grid min-h-0 overflow-hidden', gridCols)}
      >
        {/* UI-023 — conflit disque détecté pendant l'édition */}
        {conflictWarning && (
          <ConflictWarningBanner
            onReload={handleReloadFromDisk}
            onKeepLocal={handleKeepLocal}
          />
        )}

        {/* Warnings banner spans all columns — UI-014h O13: divergence template ou markdown */}
        {warningsToShow.length > 0 && (
          <WarningsBanner
            warnings={warningsToShow}
            onDismiss={dismissWarnings}
            onRestructure={restructureEligible ? handleRestructureClick : null}
            restructureDisabledReason={restructureEligible ? restructureDisabledReason : null}
          />
        )}

        {/* TOC — always visible */}
        <aside
          aria-label="Sommaire"
          className="overflow-y-auto border-r border-yk-line bg-yk-bg-1"
          style={{ gridRow: warningsToShow.length > 0 ? '2' : '1' }}
        >
          <SpddTOC
            onSectionClick={handleTocClick}
            editState={editState}
            parsedTemplate={parsedTemplate}
            activeGenericIndex={activeGenericIndex}
            onGenericSectionClick={setActiveGenericIndex}
          />
        </aside>

        {/* Center: Markdown ou WYSIWYG ou empty state si artefact supprimé */}
        {deleted ? (
          <DeletedArtifactState onClose={handleCloseDeleted} />
        ) : isMarkdown ? (
          <SpddMarkdownView
            source={markdownSource}
            onChange={setMarkdownSource}
            activeSection={activeSection}
            scrollToSection={scrollToSection}
            onScrollHandled={clearScrollToSection}
          />
        ) : (
          <SpddDocument
            onActiveSectionFromScroll={handleScrollSection}
            editState={editState}
            parsedTemplate={parsedTemplate}
            onEditStateChange={setEditStateDirty}
            readOnly={!isEditMode}
          />
        )}

        {/* Inspector — story ou générique selon le mode */}
        {showInspector && (
          <aside
            aria-label={showDiffPanel
              ? 'Panneau de diff IA'
              : restructureOpen
                ? 'Restructuration IA'
                : 'Inspector'}
            className="overflow-y-auto border-l border-yk-line bg-yk-bg-1"
          >
            {restructureOpen
              ? <RestructureInspector
                  session={restructureSession}
                  onAccept={handleRestructureAccept}
                  acceptValidation={restructureAcceptValidation}
                />
              : showDiffPanel
                ? <AiDiffPanel suggestResult={suggestResult} currentRequest={currentRequest} />
                : hasEditState
                  ? (
                    <GenericInspector
                      editState={editState!}
                      parsedTemplate={parsedTemplate}
                      activeIndex={activeGenericIndex}
                    />
                  )
                  : <SpddInspector />}
          </aside>
        )}
      </div>

      <SpddFooter editState={editState} parsedTemplate={parsedTemplate} />

      {/* Global floating AI popover */}
      <AiPopover suggestResult={suggestResult} />
    </div>
  );
}

// findFrontMatterEnd retourne l'index byte juste après le `\n---\n`
// fermant du front-matter, ou 0 si l'artefact n'a pas de front-matter.
// Tolère CRLF (cohérent avec parseArtifactContent + uiapp.splitFrontMatter).
function findFrontMatterEnd(content: string): number {
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
    return 0;
  }
  const skip = content.startsWith('---\r\n') ? 5 : 4;
  const rest = content.slice(skip);
  const close1 = rest.indexOf('\n---\n');
  if (close1 >= 0) return skip + close1 + 5;
  const close2 = rest.indexOf('\r\n---\r\n');
  if (close2 >= 0) return skip + close2 + 7;
  return 0;
}
