import { defineConfig } from '@playwright/test';
import backgroundConfig from './playwright.config';

export default defineConfig(backgroundConfig, {
  ignoreSnapshots: false,
  use: {
    headless: false,
  },
});
