import { create } from 'zustand';
import { GetClaudeStatus, type ClaudeStatus } from '../../wailsjs/go/main/App';

interface ClaudeState {
  status: ClaudeStatus;
  refresh: () => Promise<void>;
}

export const useClaudeStore = create<ClaudeState>((set) => ({
  status: { Available: false, Version: '', Err: '' },
  refresh: async () => {
    try {
      const status = await GetClaudeStatus();
      set({ status });
    } catch (e) {
      set({ status: { Available: false, Version: '', Err: String(e) } });
    }
  },
}));
