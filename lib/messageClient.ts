import { browser } from 'wxt/browser';

import type {
  ExtensionMessageOf,
  ExtensionMessageResponse,
  ExtensionMessageType,
} from './messages';

export async function sendRuntimeMessage<Type extends ExtensionMessageType>(
  message: ExtensionMessageOf<Type>,
): Promise<ExtensionMessageResponse<Type>> {
  return browser.runtime.sendMessage(message) as Promise<ExtensionMessageResponse<Type>>;
}

export async function sendTabMessage<Type extends ExtensionMessageType>(
  tabId: number,
  message: ExtensionMessageOf<Type>,
): Promise<ExtensionMessageResponse<Type>> {
  return browser.tabs.sendMessage(tabId, message) as Promise<ExtensionMessageResponse<Type>>;
}
