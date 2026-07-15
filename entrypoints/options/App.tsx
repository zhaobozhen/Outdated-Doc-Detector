import { useEffect, useState } from 'react';

import { DocumentClockIcon } from '../../components/DocumentClockIcon';
import { message } from '../../lib/i18n';
import { getSettings, setShowPageNotice } from '../../lib/storage/settings';

export default function App() {
  const [showPageNotice, setValue] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getSettings().then((settings) => {
      setValue(settings.showPageNotice);
      setLoaded(true);
    });
  }, []);

  const toggle = async () => {
    const next = !showPageNotice;
    setValue(next);
    setSaved(false);
    await setShowPageNotice(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="options-shell">
      <header className="options-header">
        <div className="options-brand">
          <DocumentClockIcon size={32} state="current" />
          <span>Outdated Docs</span>
        </div>
      </header>

      <main className="options-main">
        <h1>{message('optionsTitle')}</h1>
        <p className="options-intro">{message('optionsDescription')}</p>

        <section className="setting-row">
          <div>
            <h2>{message('showPageNotice')}</h2>
            <p>{message('showPageNoticeHelp')}</p>
          </div>
          <button
            aria-checked={showPageNotice}
            aria-label={message('showPageNotice')}
            className="switch"
            data-checked={showPageNotice}
            disabled={!loaded}
            onClick={() => void toggle()}
            role="switch"
            type="button"
          >
            <span />
          </button>
        </section>

        <section className="privacy-section">
          <h2>{message('privacyTitle')}</h2>
          <p>{message('privacyCopy')}</p>
        </section>

        <div aria-live="polite" className="save-status">
          <svg aria-hidden="true" className="save-check" fill="none" height="18" viewBox="0 0 18 18" width="18">
            <circle cx="9" cy="9" r="7.5" stroke="currentColor" />
            <path d="m5.5 9 2.2 2.2 4.8-4.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
          </svg>
          {message(saved ? 'saved' : 'autoSaved')}
        </div>
      </main>
    </div>
  );
}
