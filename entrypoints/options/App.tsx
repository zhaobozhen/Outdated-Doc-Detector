import { useEffect, useState } from 'react';
import { CircleCheck } from 'lucide-react';

import { FreshnessIcon } from '../../components/FreshnessIcon';
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
          <FreshnessIcon size={32} state="current" strokeWidth={1.8} />
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
          <CircleCheck aria-hidden="true" className="save-check" size={18} strokeWidth={1.8} />
          {message(saved ? 'saved' : 'autoSaved')}
        </div>
      </main>
    </div>
  );
}
