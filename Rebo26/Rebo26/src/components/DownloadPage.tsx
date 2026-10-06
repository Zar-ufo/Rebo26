import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Check, Laptop, Menu, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';

const downloads = {
  windows: '/release/Rebo26%20Setup%201.0.0.exe',
  android: '/release/Rebo26-Android.apk',
};

export default function DownloadPage() {
  const [installHelp, setInstallHelp] = useState(false);
  const [platform, setPlatform] = useState<'windows' | 'android' | 'other'>('other');

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setPlatform(/android/.test(ua) ? 'android' : /windows/.test(ua) ? 'windows' : 'other');
  }, []);

  const install = () => {
    if (platform !== 'other') {
      window.location.assign(downloads[platform]);
      return;
    }
    setInstallHelp(true);
    document.getElementById('install-help')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const platformLabel = platform === 'android' ? 'Android' : platform === 'windows' ? 'Windows' : 'your device';

  return (
    <div className="download-site">
      <header className="download-nav">
        <a className="download-brand" href="/" aria-label="Rebo home">
          <span className="download-brand-mark"><Sparkles size={19} /></span>
          <span>rebo<span className="brand-period">.</span></span>
        </a>
        <nav className="download-links" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#install-help">Install guide</a>
          <a href="/app">Open web app</a>
        </nav>
        <button className="nav-install" onClick={install}>
          Get the app <ArrowRight size={16} />
        </button>
      </header>

      <main>
        <section className="download-hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="live-dot" /> YOUR RESEARCH, IN ITS OWN SPACE</div>
            <h1>Your research deserves <span>its own app.</span></h1>
            <p className="hero-description">Meet Rebo: your AI research workspace. Download the Windows app or Android APK—your research and AI stay connected to the same Rebo service.</p>
            <div className="hero-actions">
              <button className="primary-download" onClick={install}>
                <ArrowDownToLine size={19} />
                Download Rebo
                <span className="button-platform">for {platformLabel}</span>
              </button>
              <a className="install-secondary" href="/app">Open in browser <ArrowRight size={16} /></a>
            </div>
            <div className="hero-assurance"><ShieldCheck size={16} /> Available for Windows and Android · Always up to date</div>
          </div>

          <div className="hero-art" aria-label="Preview of the Rebo app running in its own window">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="app-window">
              <div className="window-topbar"><div className="window-dots"><i /><i /><i /></div><span>Rebo · Research workspace</span><div className="window-controls">—　□　×</div></div>
              <div className="mock-app">
                <aside className="mock-sidebar"><div className="mock-logo"><span><Sparkles size={13} /></span> rebo</div><div className="mock-side-label">WORKSPACE</div><div className="mock-side-item active"><span className="mock-square">R</span> Research project</div><div className="mock-side-item"><span className="mock-square muted">+</span> New project</div><div className="mock-side-label second">TOOLS</div><div className="mock-side-item"><span className="mock-tool violet">▦</span> Datasets</div><div className="mock-side-item"><span className="mock-tool green">◫</span> Analysis</div><div className="mock-side-item"><span className="mock-tool blue">✧</span> AI assistant</div><div className="mock-user"><span>AZ</span><div>My workspace<small>Personal</small></div></div></aside>
                <div className="mock-content"><div className="mock-welcome">GOOD MORNING, RESEARCHER <span>✦</span></div><h3>What are we discovering today?</h3><p>Your work, organized and ready to explore.</p><div className="mock-stats"><div><span>PROJECTS</span><b>04</b><small>Active workspaces</small></div><div><span>DATASETS</span><b>12</b><small>Across all projects</small></div><div><span>INSIGHTS</span><b>28</b><small>AI discoveries</small></div></div><div className="mock-project-heading">Recent projects <span>View all →</span></div><div className="mock-project"><span className="project-icon lilac">⌁</span><div><b>Climate &amp; urban resilience</b><small>Updated 2 hours ago</small></div><span className="project-pill">ANALYZED</span></div><div className="mock-project"><span className="project-icon mint">◈</span><div><b>Learning outcomes study</b><small>Updated yesterday</small></div><span className="project-pill waiting">IN PROGRESS</span></div><div className="mock-ai"><span className="ai-icon"><Sparkles size={14} /></span><div><b>Ask your research assistant</b><small>Get answers grounded in your own data</small></div><ArrowRight size={15} /></div></div>
              </div>
            </div>
            <div className="floating-chip chip-windows"><Laptop size={17} /><span>Windows<small>Opens like an app</small></span></div>
            <div className="floating-chip chip-android"><Smartphone size={17} /><span>Android<small>On your home screen</small></span></div>
            <div className="glow-orb" />
          </div>
        </section>

        <section className="platform-strip" aria-label="Supported platforms">
          <span>ONE APP. YOUR DEVICES.</span><div><Laptop size={18} /> Windows</div><i /><div><Smartphone size={18} /> Android</div>
        </section>

        <section className="download-features" id="features">
          <div className="section-heading"><span>MADE FOR YOUR FLOW</span><h2>Everything you need. Nothing to install twice.</h2><p>Install Rebo on Windows or Android and work in a focused app window.</p></div>
          <div className="feature-grid">
            <article className="feature-card"><span className="feature-icon purple"><Laptop size={20} /></span><h3>Feels like a real app</h3><p>Launch Rebo from your Start menu, taskbar, or Android home screen—without browser tabs in the way.</p></article>
            <article className="feature-card"><span className="feature-icon blue"><Sparkles size={20} /></span><h3>Your AI stays connected</h3><p>Research analysis and AI chat run through the same Rebo service. Updates arrive automatically.</p></article>
            <article className="feature-card"><span className="feature-icon green"><ShieldCheck size={20} /></span><h3>One Rebo service</h3><p>The Windows installer and Android APK open the same hosted Rebo workspace. App updates are delivered through the website.</p></article>
          </div>
        </section>

        <section className="install-section" id="how-it-works">
          <div className="install-copy"><span className="section-kicker">UP AND RUNNING IN A MOMENT</span><h2>Choose your<br /><span>Rebo app.</span></h2><p>Download the Windows installer or Android APK below. Both launch the Rebo website in a dedicated app window; AI features need an internet connection.</p><button className="install-secondary" onClick={install}>Download Rebo <ArrowRight size={16} /></button></div>
          <div className="install-steps">
            <div className="install-step"><span>01</span><div><b>Download the app for your device</b><p>Get the .exe installer for Windows or the .apk for Android.</p></div><ArrowDownToLine size={19} /></div>
            <div className="install-step"><span>02</span><div><b>Install Rebo</b><p>Run the installer on Windows, or open the APK on Android and allow the install if asked.</p></div><Check size={19} /></div>
            <div className="install-step"><span>03</span><div><b>Launch it like any other app</b><p>Find it in Start on Windows or on your home screen on Android.</p></div><Menu size={19} /></div>
          </div>
        </section>

        <section className={`install-help ${installHelp ? 'show' : ''}`} id="install-help">
          <div><span className="section-kicker">INSTALL HELP</span><h2>Download Rebo</h2><p>The Rebo workspace is available only in the Windows and Android apps.</p></div>
          <div className="help-cards">
            <article className="download-card"><Laptop size={20} /><b>Windows</b><p>Download the Windows installer, open it, and follow the setup prompts. Rebo launches in its own app window.</p><a className="platform-download-button" href={downloads.windows} download><ArrowDownToLine size={16} /> Download for Windows <span>.exe</span></a></article>
            <article className="download-card"><Smartphone size={20} /><b>Android</b><p>Download the APK, open it on your device, and approve installation if Android asks. You may need to allow installs from your browser.</p><a className="platform-download-button" href={downloads.android} download><ArrowDownToLine size={16} /> Download for Android <span>.apk</span></a></article>
          </div>
        </section>
      </main>

      <footer className="download-footer"><a className="download-brand" href="/"><span className="download-brand-mark"><Sparkles size={17} /></span><span>rebo<span className="brand-period">.</span></span></a><span>AI research, ready when you are.</span><a href="#install-help">Download <ArrowRight size={14} /></a></footer>
    </div>
  );
}
