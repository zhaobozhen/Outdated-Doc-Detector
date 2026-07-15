import { browser } from 'wxt/browser';

export interface ExtensionSettings {
  showPageNotice: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  showPageNotice: true,
};

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await browser.storage.sync.get('showPageNotice');
  return {
    showPageNotice:
      typeof stored.showPageNotice === 'boolean'
        ? stored.showPageNotice
        : DEFAULT_SETTINGS.showPageNotice,
  };
}

export async function setShowPageNotice(showPageNotice: boolean): Promise<void> {
  await browser.storage.sync.set({ showPageNotice });
}
