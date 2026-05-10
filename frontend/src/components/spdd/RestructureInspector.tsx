// UI-019 O9 — Inspector overlay pendant la restructuration IA.
//
// Remplace temporairement le rendu standard de SpddInspector quand
// useRestructureStore.open === true. Affiche selon le mode de la
// state machine (useRestructureSession) :
//   - streaming / chatStreaming : spinner + texte partiel + Annuler
//   - preview                   : AiDiffPanel + Accepter / Refuser
//   - chatAwaitingUser          : questions LLM + textarea + envoyer
//   - exhausted                 : message + Recommencer
//   - error                     : message + Fermer
//
// Le composant est volontairement compact : la largeur de l'Inspector
// (~320px) impose un rendu stacked (avant/après empilés via
// AiDiffPanel), pas de side-by-side.

import { useEffect, useRef, useState } from 'react';
import { Check, X, Sparkles } from 'lucide-react';
import { useRestructureStore } from '@/stores/restructure';
import type { RestructureSession } from '@/hooks/useRestructureSession';

interface Props {
  session: RestructureSession;
  /** Called when the user accepts the diff. The parent (SpddEditor)
   * is responsible for applying the markdown to the artefact draft
   * and flipping isDirty. Receives both `after` (LLM body) and the
   * `before` snapshot (full markdown incl. front-matter) — needed
   * because the store is reset synchronously by `accept()` and the
   * parent loses access to `before` otherwise. */
  onAccept: (after: string, before: string) => void;
  /**
   * Validation du bouton Accepter calculée par le parent à partir
   * du markdown `after` et de la définition de template. null =
   * pas de validation (Accept toujours autorisé). Sinon si
   * `allowed === false`, le bouton est disabled avec `reason` en
   * tooltip.
   */
  acceptValidation?: { allowed: boolean; reason: string } | null;
}

export function RestructureInspector({ session, onAccept, acceptValidation }: Props): JSX.Element {
  const before = useRestructureStore((s) => s.before);
  const after = useRestructureStore((s) => s.after);
  const refuse = useRestructureStore((s) => s.refuse);

  const [chatInput, setChatInput] = useState('');

  const handleAccept = (): void => {
    // Snapshot `before` AVANT que `accept()` ne reset le store,
    // sinon le parent (SpddEditor.handleRestructureAccept) lit
    // `before === null` et perd le front-matter du document
    // d'origine — bug observé dans yukki-2026-05-10.log
    // (`beforeLen=0`) avant ce fix.
    const beforeSnapshot = useRestructureStore.getState().before ?? '';
    const accepted = useRestructureStore.getState().accept();
    if (accepted) onAccept(accepted, beforeSnapshot);
    session.reset();
  };

  const handleRefuse = (): void => {
    refuse();
    session.reset();
  };

  const handleCancel = (): void => {
    void session.cancel();
    refuse();
  };

  const handleSendChat = (): void => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    void session.answerChat(text);
  };

  const handleRestart = (): void => {
    session.reset();
    refuse();
  };

  return (
    <div
      role="region"
      aria-label="Restructuration IA"
      className="flex h-full flex-col gap-3 overflow-y-auto bg-yk-bg-1 px-3 py-3 font-inter text-[12.5px] text-yk-text-primary"
    >
      <header>
        <p className="font-jbmono text-[10px] uppercase tracking-[0.12em] text-yk-text-muted">
          Restructuration IA
        </p>
      </header>

      {(session.mode === 'streaming' || session.mode === 'chatStreaming') && (
        <ChatLayout
          mode={session.mode}
          chatTurnCount={session.chatTurnCount}
          history={session.history}
          streamText={session.streamText}
          thinkingText={session.thinkingText}
          questions={[]}
          onCancel={handleCancel}
          onRefuse={handleRefuse}
          chatInput={chatInput}
          setChatInput={setChatInput}
          onSend={handleSendChat}
        />
      )}

      {session.mode === 'preview' && before !== null && after !== null && (
        <div className="flex flex-col gap-3">
          <p className="text-yk-text-secondary">
            L'IA propose la restructuration ci-dessous. Vérifie le résultat
            avant d'accepter.
          </p>
          <DiffStacked before={before} after={after} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={acceptValidation?.allowed === false}
              title={acceptValidation?.reason ?? 'Appliquer la restructuration au draft (Ctrl+S pour sauver)'}
              className="flex items-center gap-1.5 rounded-yk-sm bg-yk-primary px-3 py-1 font-inter text-[12px] text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
            >
              <Check className="h-3.5 w-3.5" />
              Accepter
            </button>
            <button
              type="button"
              onClick={handleRefuse}
              className="flex items-center gap-1.5 rounded-yk-sm border border-yk-line px-3 py-1 font-inter text-[12px] text-yk-text-secondary hover:bg-yk-bg-2"
            >
              <X className="h-3.5 w-3.5" />
              Refuser
            </button>
          </div>
          {acceptValidation?.allowed === false && (
            <p className="rounded-yk-sm border border-yk-warning bg-[color:var(--yk-warning-soft)] px-2 py-1.5 text-[11.5px] text-yk-warning">
              {acceptValidation.reason}
            </p>
          )}
        </div>
      )}

      {session.mode === 'chatAwaitingUser' && (
        <ChatLayout
          mode={session.mode}
          chatTurnCount={session.chatTurnCount}
          history={session.history}
          streamText=""
          thinkingText={session.thinkingText}
          questions={session.questions}
          onCancel={handleCancel}
          onRefuse={handleRefuse}
          chatInput={chatInput}
          setChatInput={setChatInput}
          onSend={handleSendChat}
        />
      )}

      {session.mode === 'error' && (
        <div className="flex flex-col gap-3">
          <p className="text-yk-danger">
            Erreur : {session.error ?? 'inconnue'}
          </p>
          <button
            type="button"
            onClick={handleRestart}
            className="self-start rounded-yk-sm border border-yk-line px-3 py-1 font-inter text-[12px] text-yk-text-secondary hover:bg-yk-bg-2"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}

// ChatLayout rend la conversation IA ↔ utilisateur en bulles
// (assistant à gauche avec avatar Sparkles, user à droite en violet).
// Les modes `streaming` (1er tour) / `chatStreaming` (tours suivants)
// affichent une bulle assistant qui s'écrit en live ; `chatAwaitingUser`
// affiche la dernière question puis l'input. L'input bar reste
// toujours visible (désactivée pendant le streaming) pour que
// l'utilisateur ait l'impression d'une vraie messagerie.

interface ChatLayoutProps {
  mode: 'streaming' | 'chatStreaming' | 'chatAwaitingUser';
  chatTurnCount: number;
  history: Array<{ question: string; answer: string }>;
  streamText: string;
  /** Chain-of-thought de Claude rendu dans une bulle séparée
   * (italique gris, repliable). Vide pour les modèles sans thinking. */
  thinkingText: string;
  questions: string[];
  onCancel: () => void;
  onRefuse: () => void;
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend: () => void;
}

function ChatLayout({
  mode,
  chatTurnCount,
  history,
  streamText,
  thinkingText,
  questions,
  onCancel,
  onRefuse,
  chatInput,
  setChatInput,
  onSend,
}: ChatLayoutProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll au dernier message à chaque mise à jour.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, streamText, questions]);

  // En `chatAwaitingUser`, history.length > 0 et la dernière entrée
  // a `answer === ""` (en attente). On affiche toutes les Q/R des
  // tours déjà bouclés (history.slice(0, -1)) puis on ajoute la
  // question courante (`questions`) sous forme de bulle assistant.
  // En `chatStreaming`, history.length > 0 et la dernière entrée a
  // un `answer` rempli (la réponse user en cours de traitement).
  const previousTurns = mode === 'chatAwaitingUser' ? history.slice(0, -1) : history;
  const pendingUserAnswer = mode === 'chatAwaitingUser' && history.length > 0
    ? history[history.length - 1].answer
    : '';

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Header — turn counter compact */}
      {chatTurnCount > 0 && (
        <div className="flex items-center justify-between text-[10.5px] text-yk-text-muted">
          <span className="font-jbmono uppercase tracking-wider">
            Tour {chatTurnCount}{mode === 'chatAwaitingUser' ? ' (réponse attendue)' : ''}
          </span>
          <button
            type="button"
            onClick={onRefuse}
            className="rounded-yk-sm px-2 py-0.5 hover:bg-yk-bg-2"
            title="Abandonner la restructuration"
          >
            Abandonner
          </button>
        </div>
      )}

      {/* Messages scroll area */}
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-yk-sm bg-yk-bg-2 p-2"
      >
        {/* Chain-of-thought Claude — bulle italique repliable rendue
            avant la réponse, mise à jour live pendant le streaming. */}
        {thinkingText && <ThinkingBubble text={thinkingText} streaming={mode === 'streaming' || mode === 'chatStreaming'} />}

        {/* Premier tour streaming sans history : une bulle assistant
            placeholder qui s'écrit. */}
        {mode === 'streaming' && history.length === 0 && (
          <AssistantBubble streaming text={streamText} />
        )}

        {/* Tours déjà bouclés */}
        {previousTurns.map((turn, i) => (
          <div key={i} className="flex flex-col gap-2">
            <AssistantBubble text={turn.question} />
            {turn.answer && <UserBubble text={turn.answer} />}
          </div>
        ))}

        {/* Question courante en attente de réponse */}
        {mode === 'chatAwaitingUser' && questions.length > 0 && (
          <AssistantBubble text={questions.join('\n')} />
        )}

        {/* Tour utilisateur déjà envoyé en streaming, IA en train
            de répondre */}
        {mode === 'chatStreaming' && (
          <>
            {pendingUserAnswer && <UserBubble text={pendingUserAnswer} />}
            <AssistantBubble streaming text={streamText} />
          </>
        )}
      </div>

      {/* Status footer + cancel — pas d'input chat car l'utilisateur
          n'intervient pas dans la conversation (yukki dialogue
          automatiquement avec Claude). */}
      <div className="flex items-center justify-between gap-2 rounded-yk-sm border border-yk-line-subtle bg-yk-bg-2 px-3 py-2">
        <span className="flex items-center gap-2 text-[11.5px] text-yk-text-secondary">
          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-yk-primary" aria-hidden />
          {mode === 'streaming' && history.length === 0
            ? "Yukki demande à Claude de restructurer…"
            : `Yukki dialogue avec Claude — tour ${chatTurnCount}`}
        </span>
        <button
          type="button"
          onClick={onCancel}
          title="Annuler la requête en cours"
          className="flex items-center gap-1 rounded-yk-sm border border-yk-line px-2 py-0.5 text-[11px] text-yk-text-secondary hover:bg-yk-bg-3"
        >
          <X className="h-3 w-3" />
          Annuler
        </button>
      </div>
      {/* chatInput / onSend / setChatInput conservés en props pour
          compatibilité de signature mais inutilisés en mode auto. */}
      <input type="hidden" value={chatInput} readOnly aria-hidden />
      <span className="hidden" aria-hidden onClick={() => { onSend(); setChatInput(''); }} />
    </div>
  );
}

// AssistantBubble — bulle gauche avec avatar Sparkles violet.
// Trois états visuels :
//   - text vide + streaming : indicateur "typing" 3 points qui
//     rebondissent en décalé (pendant la TTFB Claude, avant le
//     1er chunk — donne le feedback "il réfléchit")
//   - text non vide + streaming : texte + curseur clignotant en fin
//   - text non vide, non streaming : texte seul (état final)
function AssistantBubble({ text, streaming }: { text: string; streaming?: boolean }): JSX.Element {
  return (
    <div className="flex items-start gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--yk-primary-soft)]">
        <Sparkles className="h-3.5 w-3.5 text-yk-primary" />
      </div>
      <div className="max-w-[85%] rounded-yk rounded-tl-none bg-yk-bg-3 px-3 py-2 text-[12.5px] leading-[1.5] text-yk-text-primary whitespace-pre-wrap break-words">
        {text ? (
          <>
            {text}
            {streaming && <BlinkingCursor />}
          </>
        ) : streaming ? (
          <TypingIndicator />
        ) : null}
      </div>
    </div>
  );
}

// TypingIndicator — 3 points qui rebondissent en décalé pour
// signaler que Claude réfléchit avant d'avoir envoyé son premier
// chunk. Pattern UX standard (iMessage, WhatsApp, ChatGPT…).
// `animate-bounce` est une keyframe Tailwind built-in.
function TypingIndicator(): JSX.Element {
  return (
    <span aria-label="L'IA réfléchit" className="inline-flex items-center gap-1 py-1">
      <span
        className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-yk-text-muted"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-yk-text-muted"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-yk-text-muted"
        style={{ animationDelay: '300ms' }}
      />
    </span>
  );
}

// ThinkingBubble — bulle « raisonnement » de Claude (extended
// thinking). Italique gris sur fond très discret, repliable via
// <details> pour ne pas saturer la vue quand le thinking est long.
// Rendue avant la bulle de réponse pour suivre l'ordre temporel
// (Claude pense, puis répond).
function ThinkingBubble({ text, streaming }: { text: string; streaming?: boolean }): JSX.Element {
  return (
    <div className="flex items-start gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yk-bg-3">
        <Sparkles className="h-3 w-3 text-yk-text-muted" />
      </div>
      <details
        open
        className="max-w-[85%] rounded-yk rounded-tl-none border border-yk-line-subtle bg-yk-bg-2 px-3 py-2 text-[11.5px] leading-[1.5] text-yk-text-muted"
      >
        <summary className="cursor-pointer font-jbmono text-[10px] uppercase tracking-wider">
          Raisonnement{streaming && ' (en cours…)'}
        </summary>
        <pre className="mt-1.5 whitespace-pre-wrap break-words italic">
          {text}
          {streaming && <BlinkingCursor />}
        </pre>
      </details>
    </div>
  );
}

// UserBubble — bulle droite violette, alignée à droite.
function UserBubble({ text }: { text: string }): JSX.Element {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-yk rounded-tr-none bg-yk-primary px-3 py-2 text-[12.5px] leading-[1.5] text-white whitespace-pre-wrap break-words">
        {text}
      </div>
    </div>
  );
}

function BlinkingCursor(): JSX.Element {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-3 w-[1.5px] animate-pulse bg-yk-text-muted align-middle"
    />
  );
}

// DiffStacked rend un diff vertical par section markdown : chaque
// titre `## ` reçoit un bloc avant / après si le contenu diffère.
// Implémentation minimaliste qui rentre dans la largeur Inspector
// (~320px) — pas de lib npm (cohérent canvas D1).
//
// Le front-matter YAML de `before` est stripé avant comparaison :
// l'IA ne le voit pas (cf. uiapp.splitFrontMatter côté Go) et il
// est réinjecté tel quel à l'acceptation, donc l'afficher comme
// "RETIRÉ" est trompeur.
function DiffStacked({ before, after }: { before: string; after: string }): JSX.Element {
  const beforeSections = splitByHeading(stripFrontMatter(before));
  const afterSections = splitByHeading(after);
  const headings = uniqueOrdered([
    ...beforeSections.map((s) => s.heading),
    ...afterSections.map((s) => s.heading),
  ]);

  return (
    <div className="flex flex-col gap-2">
      {headings.map((h, i) => {
        const a = beforeSections.find((s) => s.heading === h)?.body ?? '';
        const b = afterSections.find((s) => s.heading === h)?.body ?? '';
        const status: 'added' | 'removed' | 'modified' | 'unchanged' =
          a === b ? 'unchanged' : a === '' ? 'added' : b === '' ? 'removed' : 'modified';

        return (
          <div key={i} className="rounded-yk-sm border border-yk-line-subtle">
            <div className="flex items-center justify-between border-b border-yk-line-subtle bg-yk-bg-2 px-2 py-1 font-jbmono text-[10.5px] text-yk-text-muted">
              <span className="truncate">{h || '(no heading)'}</span>
              <StatusPill status={status} />
            </div>
            {status !== 'unchanged' && (
              <div className="grid grid-cols-1 divide-y divide-yk-line-subtle">
                {a && (
                  <pre className="bg-[color:var(--yk-danger-soft)] px-2 py-1.5 font-jbmono text-[10.5px] text-yk-text-secondary whitespace-pre-wrap break-words">
                    {truncate(a, 320)}
                  </pre>
                )}
                {b && (
                  <pre className="bg-[color:var(--yk-success-soft)] px-2 py-1.5 font-jbmono text-[10.5px] text-yk-text-secondary whitespace-pre-wrap break-words">
                    {truncate(b, 320)}
                  </pre>
                )}
              </div>
            )}
            {status === 'unchanged' && a && (
              <pre className="px-2 py-1.5 font-jbmono text-[10.5px] text-yk-text-muted whitespace-pre-wrap break-words">
                {truncate(a, 200)}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status: 'added' | 'removed' | 'modified' | 'unchanged' }): JSX.Element {
  const map: Record<typeof status, { label: string; cls: string }> = {
    added: { label: 'ajout', cls: 'bg-[color:var(--yk-success-soft)] text-yk-success' },
    removed: { label: 'retiré', cls: 'bg-[color:var(--yk-danger-soft)] text-yk-danger' },
    modified: { label: 'modifié', cls: 'bg-[color:var(--yk-warning-soft)] text-yk-warning' },
    unchanged: { label: 'inchangé', cls: 'bg-yk-bg-3 text-yk-text-muted' },
  };
  const s = map[status];
  return (
    <span className={`rounded-yk-sm px-1.5 py-0.5 font-jbmono text-[9.5px] uppercase tracking-wider ${s.cls}`}>
      {s.label}
    </span>
  );
}

interface Section {
  heading: string;
  body: string;
}

// stripFrontMatter retire le bloc `---\n...\n---\n` en tête s'il
// existe. Tolère CRLF. Renvoie l'input inchangé sinon (front-matter
// absent ou malformé).
function stripFrontMatter(markdown: string): string {
  if (!markdown.startsWith('---\n') && !markdown.startsWith('---\r\n')) {
    return markdown;
  }
  const skip = markdown.startsWith('---\r\n') ? 5 : 4;
  const rest = markdown.slice(skip);
  const close1 = rest.indexOf('\n---\n');
  if (close1 >= 0) return rest.slice(close1 + 5);
  const close2 = rest.indexOf('\r\n---\r\n');
  if (close2 >= 0) return rest.slice(close2 + 7);
  return markdown;
}

function splitByHeading(markdown: string): Section[] {
  if (!markdown) return [];
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of lines) {
    if (line.startsWith('## ') || line.startsWith('# ')) {
      if (current) sections.push(current);
      current = { heading: line.trim(), body: '' };
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line;
    } else {
      // Pre-heading content goes into a synthetic section.
      current = { heading: '', body: line };
    }
  }
  if (current) sections.push(current);
  return sections.map((s) => ({ heading: s.heading, body: s.body.trim() }));
}

function uniqueOrdered<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const it of items) {
    if (!seen.has(it)) {
      seen.add(it);
      out.push(it);
    }
  }
  return out;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '… (tronqué)';
}

export type { RestructureSession };
