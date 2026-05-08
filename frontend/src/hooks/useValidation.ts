// UI-014f — O2: useValidation hook.
// Calls StoryValidate on the Go backend with a 200ms debounce.
// Falls back to an empty report when Wails is not available (e.g., browser
// dev mode without the desktop shell).

import { useEffect, useState } from 'react';
import { draftToGoPayload } from '@/lib/draftMapper';
import type { StoryDraft } from '@/components/spdd/types';

/** Mirror of Go storyspec.FieldError. */
export interface FieldError {
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

/** Mirror of Go storyspec.ValidationReport. */
export interface ValidationReport {
  errors: FieldError[];
}

const DEBOUNCE_MS = 200;

const EMPTY_REPORT: ValidationReport = { errors: [] };

/**
 * Validates the current draft against the Go backend with a 200ms debounce.
 * Returns an empty report if `window.go.main.App.StoryValidate` is unavailable.
 */
export function useValidation(draft: StoryDraft): ValidationReport {
  const [report, setReport] = useState<ValidationReport>(EMPTY_REPORT);

  useEffect(() => {
    const timer = setTimeout(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const go = (window as any).go;
      if (!go?.uiapp?.App?.StoryValidate) return;

      try {
        const result = await go.uiapp.App.StoryValidate(draftToGoPayload(draft));
        if (result && Array.isArray(result.errors)) {
          setReport(result as ValidationReport);
        } else {
          setReport(EMPTY_REPORT);
        }
      } catch {
        // Validation errors from the backend are non-blocking.
        setReport(EMPTY_REPORT);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [draft]);

  return report;
}
