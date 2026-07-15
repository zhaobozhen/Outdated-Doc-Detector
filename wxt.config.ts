import { defineConfig } from 'wxt';

import { DOCUMENT_MATCHES } from './lib/analyzers/sites';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    permissions: ['storage'],
    host_permissions: DOCUMENT_MATCHES,
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    action: {
      default_title: '__MSG_extensionName__',
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
      },
    },
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Alt+Shift+E',
          mac: 'Alt+Shift+E',
        },
        description: '__MSG_openPopupCommand__',
      },
    },
  },
});
