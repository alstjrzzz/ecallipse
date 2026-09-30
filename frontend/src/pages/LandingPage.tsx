import {Link} from 'react-router-dom';
import {Brand} from '../components/Brand';

export function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Brand />
        <nav><a href="#how">How it works</a><a href="#widgets">Widgets</a><Link to="/login">Sign in</Link></nav>
        <Link to="/signup" className="button button-primary">Get started</Link>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">CALLS, CONNECTED TO YOUR WORK</span>
            <h1>Make every conversation <em>actionable.</em></h1>
            <p>Ecallipse brings live transcripts, decisions, next actions and your own workflow into one focused call workspace.</p>
            <div className="hero-actions"><Link to="/signup" className="button button-primary">Start a workspace</Link><a href="#how" className="button button-ghost">See the workflow</a></div>
            <div className="hero-proof"><span><i /> Browser-to-browser voice</span><span><i /> Configurable AI widgets</span></div>
          </div>
          <div className="hero-visual" aria-label="Ecallipse call workspace preview">
            <div className="preview-window">
              <div className="preview-top"><span className="preview-brand-dot" /> Project alignment call <small>08:42</small></div>
              <div className="preview-person"><span>BL</span><strong>Bob Lee</strong><small>Connected</small></div>
              <div className="preview-widgets">
                <article><label>LIVE TRANSCRIPT</label><p><b>Alice</b> Let's confirm the launch scope before Friday.</p><p><b>Bob</b> I'll share the revised brief by tomorrow.</p></article>
                <article className="preview-action"><label>NEXT ACTION</label><strong>Review the revised launch brief tomorrow</strong></article>
              </div>
              <div className="preview-controls"><i>◉</i><i>⌁</i><i className="end">×</i></div>
            </div>
            <span className="orbit orbit-one" /><span className="orbit orbit-two" />
          </div>
        </section>

        <section id="how" className="feature-band">
          <div><span>01</span><h3>Choose a person</h3><p>Start from contacts instead of a technical dial pad.</p></div>
          <div><span>02</span><h3>Shape the workspace</h3><p>Move, resize and detach only the widgets you need.</p></div>
          <div><span>03</span><h3>Leave with outcomes</h3><p>Carry decisions and next actions beyond the call.</p></div>
        </section>

        <section id="widgets" className="landing-callout">
          <span className="eyebrow">YOUR CALL, YOUR WORKSPACE</span>
          <h2>AI assistance should fit the conversation, not interrupt it.</h2>
          <Link to="/signup" className="button button-light">Build your workspace</Link>
        </section>
      </main>
    </div>
  );
}
