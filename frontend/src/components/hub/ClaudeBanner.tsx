import { AlertCircle } from 'lucide-react';
import { useClaudeStore } from '@/stores/claude';

export function ClaudeBanner() {
  const status = useClaudeStore((s) => s.status);

  if (status.Available && !status.Err) {
    return null;
  }

  if (!status.Available) {
    return (
      <div className="bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 text-sm text-amber-900 dark:text-amber-200">
        <AlertCircle className="inline h-4 w-4 mr-2" />
        Claude CLI not detected — install it to generate artefacts.{' '}
        <a
          href="https://docs.anthropic.com/en/docs/claude-code/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          See install guide
        </a>
        .
      </div>
    );
  }

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 text-sm text-amber-900 dark:text-amber-200">
      <AlertCircle className="inline h-4 w-4 mr-2" />
      Claude CLI detected but version unreadable: {status.Err}
    </div>
  );
}
