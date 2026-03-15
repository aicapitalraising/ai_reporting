import { useEffect } from 'react';

interface ShortcutHandlers {
  onNewClient?: () => void;
  onQuickGenerate?: () => void;
  onSaveDownload?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          if (handlers.onNewClient) {
            e.preventDefault();
            handlers.onNewClient();
          }
          break;
        case 'g':
          if (handlers.onQuickGenerate) {
            e.preventDefault();
            handlers.onQuickGenerate();
          }
          break;
        case 's':
          if (handlers.onSaveDownload) {
            e.preventDefault();
            handlers.onSaveDownload();
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlers]);
}
