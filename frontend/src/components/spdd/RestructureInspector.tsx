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
import { Check, X, RefreshCw, Send, Sparkles } from 'lucide-react';
import { useRestructureStore } from '@/stores/restructure';
import type { RestructureSession } from '@/hooks/useRestructureSession';

interface Props {
  session: RestructureSession;
  /** Called when the user accepts the diff. The parent (SpddEditor)
   * is responsible for applying the markdown to the artefact draft
   * and flipping isDirty. */
  onAccept: (after: string) => void;
}

export function RestructureInspector({ session, onAccept }: Props): JSX.Element {
  const before = useRestructureStore((s) => s.before);
  const after = useRestructureStore((s) => s.after);
  const refuse = useRestructureStore((s) => s.refuse);

  const [chatInput, setChatInput] = useState('');

  const handleAccept = (): void => {
    const accepted = useRestructureStore.getState().accept();
    if (accepted) onAccept(accepted);
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
              className="flex items-center gap-1.5 rounded-yk-sm bg-yk-primary px-3 py-1 font-inter text-[12px] text-white hover:brightness-110"
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
        </div>
      )}

      {session.mode === 'chatAwaitingUser' && (
        <ChatLayout
          mode={session.mode}
          chatTurnCount={session.chatTurnCount}
          history={session.history}
          streamText=""
          questions={session.questions}
          onCancel={handleCancel}
          onRefuse={handleRefuse}
          chatInput={chatInput}
          setChatInput={setChatInput}
          onSend={handleSendChat}
        />
      )}

      {session.mode === 'exhausted' && (
        <div className="flex flex-col gap-3">
          <p className="text-yk-warning">
            Conversation trop longue (5 tours), abandonnée.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRestart}
              className="flex items-center gap-1.5 rounded-yk-sm border border-yk-line px-3 py-1 font-inter text-[12px] text-yk-text-secondary hover:bg-yk-bg-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recommencer
            </button>
          </div>
        </div>
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
  questions,
  onCancel,
  onRefuse,
  chatInput,
  setChatInput,
  onSend,
}: ChatLayoutProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isStreaming = mode === 'streaming' || mode === 'chatStreaming';

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
            Tour {chatTurnCount}{mode === 'chatAwaitingUser' ? ' (réponse attendue)' : ' / 5'}
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

      {/* Input bar messenger-style */}
      <div className="flex items-end gap-2">
        <textarea
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (chatInput.trim() && !isStreaming) onSend();
            }
          }}
          placeholder={isStreaming ? "L'IA répond…" : 'Réponse…'}
          rows={2}
          disabled={isStreaming}
          className="flex-1 resize-none rounded-yk bg-yk-bg-2 px-3 py-2 font-inter text-[12px] text-yk-text-primary placeholder:text-yk-text-muted focus:outline-none focus:ring-2 focus:ring-[color:var(--yk-primary-ring)] disabled:opacity-50"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onCancel}
            title="Annuler la requête en cours"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-yk-line bg-yk-bg-2 text-yk-text-secondary hover:bg-yk-bg-3"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={!chatInput.trim()}
            title="Envoyer (Entrée)"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yk-primary text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// AssistantBubble — bulle gauche avec avatar Sparkles violet.
// Quand `streaming`, ajoute un curseur clignotant à la fin du texte.
function AssistantBubble({ text, streaming }: { text: string; streaming?: boolean }): JSX.Element {
  return (
    <div className="flex items-start gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--yk-primary-soft)]">
        <Sparkles className="h-3.5 w-3.5 text-yk-primary" />
      </div>
      <div className="max-w-[85%] rounded-yk rounded-tl-none bg-yk-bg-3 px-3 py-2 text-[12.5px] leading-[1.5] text-yk-text-primary whitespace-pre-wrap break-words">
        {text || (streaming ? '…' : '')}
        {streaming && <BlinkingCursor />}
      </div>
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
function DiffStacked({ before, after }: { before: string; after: string }): JSX.Element {
  const beforeSections = splitByHeading(before);
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
