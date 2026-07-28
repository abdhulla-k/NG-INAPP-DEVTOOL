import { Component, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DevtoolMockComponent } from './devtool-mock.component';

interface Feature {
    name: string;
    blurb: string;
    icon: SafeHtml; // pre-sanitized full <svg> markup — set via this.svg() in ctor
}

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [DevtoolMockComponent],
    template: `
        <!-- Sticky top nav -->
        <header class="topnav" [class.open]="navOpen()">
            <div class="container nav-row">
                <a class="brand" href="#top">
                    <svg viewBox="0 0 250 250" width="22" height="22" aria-hidden="true">
                        <path fill="none" stroke="currentColor" stroke-width="20" stroke-linejoin="round" d="M125 30L31.9 63.2l14.2 123.1L125 230l78.9-43.7 14.2-123.1z"/>
                        <path fill="currentColor" d="M125 52.1L66.8 182.6h21.7l11.7-29.2h49.4l11.7 29.2H183L125 52.1zm17 83.3h-34l17-40.9 17 40.9z"/>
                    </svg>
                    <span>Angular DevTools</span>
                </a>

                <nav class="nav-links" [attr.aria-hidden]="!navOpen()">
                    <a href="#features" (click)="closeNav()">Features</a>
                    <a href="#install" (click)="closeNav()">Install</a>
                    <a href="#plugins" (click)="closeNav()">Plugins</a>
                    <a class="github" href="https://github.com/abdhulla-k/NG-INAPP-DEVTOOL" target="_blank" rel="noopener" (click)="closeNav()">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-1.94c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.4-5.25 5.69.41.36.77 1.06.77 2.13v3.16c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/></svg>
                        GitHub
                    </a>
                </nav>

                <button class="hamburger" (click)="toggleNav()" [attr.aria-expanded]="navOpen()" aria-label="Toggle menu">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </header>

        <!-- Hero -->
        <section id="top" class="hero">
            <div class="hero-glow" aria-hidden="true"></div>
            <div class="container hero-grid">
                <div class="hero-copy">
                    <div class="eyebrow">
                        <span class="dot"></span>
                        Inspired by Nuxt DevTools · for Angular 19+
                    </div>
                    <h1>
                        Angular DevTools,<br />
                        <span class="gradient-text">in your app.</span>
                    </h1>
                    <p class="lede">
                        Inspect components, routes, signals, and assets without ever
                        leaving your browser. A drop-in dev panel that mounts itself
                        in dev mode and disappears in production.
                    </p>
                    <div class="cta-row">
                        <a class="btn btn-primary" href="#install">Get started</a>
                        <a class="btn btn-ghost" href="https://github.com/abdhulla-k/NG-INAPP-DEVTOOL" target="_blank" rel="noopener">View on GitHub</a>
                    </div>
                    <div class="hero-bullets">
                        <span>Zero prod cost</span>
                        <span class="sep">·</span>
                        <span>Standalone components</span>
                        <span class="sep">·</span>
                        <span>SSR-safe</span>
                    </div>
                </div>

                <div class="hero-mock">
                    <app-devtool-mock />
                </div>
            </div>
        </section>

        <!-- Features -->
        <section id="features" class="features">
            <div class="container">
                <div class="section-head">
                    <h2>Seven plugins in the box.</h2>
                    <p>Every built-in plugin works the moment you install. Add your own with the same API.</p>
                </div>

                <div class="feature-grid">
                    @for (f of features; track f.name) {
                        <article class="feature-card">
                            <span class="feature-icon" [innerHTML]="f.icon" aria-hidden="true"></span>
                            <h3>{{ f.name }}</h3>
                            <p>{{ f.blurb }}</p>
                        </article>
                    }
                </div>
            </div>
        </section>

        <!-- Install -->
        <section id="install" class="install">
            <div class="container install-grid">
                <div class="install-copy">
                    <h2>Drop it into <span class="mono">app.config.ts</span>.</h2>
                    <p>
                        One provider. The dev tool gates itself on <span class="mono">isDevMode()</span>,
                        so production builds tree-shake it out — zero runtime cost when shipped.
                    </p>
                    <ul class="checklist">
                        <li>Standalone-first: no NgModule wiring</li>
                        <li>Browser-only mount via <span class="mono">PLATFORM_ID</span></li>
                        <li>Editor jump-to-source (VSCode, Cursor, WebStorm, IDEA)</li>
                    </ul>
                    <a class="btn btn-ghost npm-btn" href="https://www.npmjs.com/package/ng-inapp-dev-tool" target="_blank" rel="noopener">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zM10.665 10H12v2.667h-1.335V10z"/></svg>
                        View on npm
                    </a>
                </div>
                <div class="code-stack">
                    <div class="code-step">
                        <div class="step-label"><span class="step-num">1</span> Install</div>
                        <pre class="code"><code>{{ installCommand }}</code></pre>
                    </div>
                    <div class="code-step">
                        <div class="step-label"><span class="step-num">2</span> Configure <span class="mono">app.config.ts</span></div>
                        <pre class="code"><code>{{ installSnippet }}</code></pre>
                    </div>
                </div>
            </div>
        </section>

        <!-- Plugin architecture -->
        <section id="plugins" class="plugins">
            <div class="container plugins-grid">
                <pre class="code"><code>{{ pluginSnippet }}</code></pre>
                <div class="plugins-copy">
                    <div class="eyebrow"><span class="dot"></span> Extensible</div>
                    <h2>Extend it with your own plugins.</h2>
                    <p>
                        A plugin is just an Angular component plus a name and an icon.
                        Pass them through the same provider — they'll appear in the
                        sidebar next to the built-ins.
                    </p>
                    <a class="btn btn-ghost" href="https://github.com/abdhulla-k/NG-INAPP-DEVTOOL/blob/main/Core.md" target="_blank" rel="noopener">Read the plugin guide →</a>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="site-footer">
            <div class="container footer-grid">
                <div class="foot-col foot-brand">
                    <div class="brand">
                        <svg viewBox="0 0 250 250" width="22" height="22" aria-hidden="true">
                            <path fill="none" stroke="currentColor" stroke-width="20" stroke-linejoin="round" d="M125 30L31.9 63.2l14.2 123.1L125 230l78.9-43.7 14.2-123.1z"/>
                            <path fill="currentColor" d="M125 52.1L66.8 182.6h21.7l11.7-29.2h49.4l11.7 29.2H183L125 52.1zm17 83.3h-34l17-40.9 17 40.9z"/>
                        </svg>
                        <span>Angular DevTools</span>
                    </div>
                    <p class="muted">In-app developer tools for Angular, inspired by Nuxt DevTools.</p>
                </div>
                <div class="foot-col">
                    <h4>Project</h4>
                    <a href="https://www.npmjs.com/package/ng-inapp-dev-tool" target="_blank" rel="noopener">npm</a>
                    <a href="https://github.com/abdhulla-k/NG-INAPP-DEVTOOL" target="_blank" rel="noopener">GitHub</a>
                    <a href="https://github.com/abdhulla-k/NG-INAPP-DEVTOOL/blob/main/README.md" target="_blank" rel="noopener">README</a>
                    <a href="https://github.com/abdhulla-k/NG-INAPP-DEVTOOL/blob/main/Core.md" target="_blank" rel="noopener">Plugin guide</a>
                </div>
                <div class="foot-col">
                    <h4>Plugins</h4>
                    <span class="muted">Overview</span>
                    <span class="muted">Components</span>
                    <span class="muted">Routes</span>
                    <span class="muted">Assets</span>
                    <span class="muted">Inspector</span>
                </div>
            </div>
            <div class="footer-bottom container">
                <span class="muted">Built with Angular {{ angularVersion }}.</span>
                <span class="muted">MIT License.</span>
            </div>
        </footer>
    `,
    styles: [`
        :host { display: block; color: var(--gray-300); }

        .container {
            width: 100%;
            max-width: var(--container-max);
            margin: 0 auto;
            padding: 0 24px;
        }

        /* ─── Top nav ─── */
        .topnav {
            position: sticky;
            top: 0;
            z-index: 100;
            background: rgba(20, 20, 24, 0.7);
            backdrop-filter: saturate(140%) blur(12px);
            -webkit-backdrop-filter: saturate(140%) blur(12px);
            border-bottom: 1px solid var(--gray-800);
        }
        .nav-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 64px;
        }
        .brand {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            color: white;
            font-weight: 700;
            font-size: 15px;
            letter-spacing: -0.01em;
        }
        .brand svg { color: var(--vivid-pink); }
        .nav-links {
            display: flex;
            align-items: center;
            gap: 28px;
            font-size: 14px;
            color: var(--gray-400);
        }
        .nav-links a:hover { color: white; }
        .nav-links .github {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border: 1px solid var(--gray-700);
            border-radius: 6px;
            color: white;
        }
        .nav-links .github:hover {
            border-color: var(--vivid-pink);
            background: rgba(var(--pink-glow), 0.08);
        }

        .hamburger {
            display: none;
            background: transparent;
            border: 1px solid var(--gray-700);
            border-radius: 6px;
            padding: 8px 10px;
            cursor: pointer;
            flex-direction: column;
            gap: 4px;
        }
        .hamburger span {
            display: block;
            width: 18px;
            height: 2px;
            background: white;
            border-radius: 1px;
        }

        /* ─── Hero ─── */
        .hero {
            position: relative;
            padding: var(--section-pad-y) 0 calc(var(--section-pad-y) - 16px);
            overflow: hidden;
        }
        .hero-glow {
            position: absolute;
            top: -120px;
            left: 50%;
            transform: translateX(-50%);
            width: 900px;
            height: 600px;
            background: radial-gradient(closest-side, rgba(var(--pink-glow), 0.18), transparent 70%);
            pointer-events: none;
            z-index: 0;
        }
        .hero-grid {
            display: grid;
            grid-template-columns: 1.05fr 1fr;
            gap: 64px;
            align-items: center;
            position: relative;
            z-index: 1;
        }
        .eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border: 1px solid var(--gray-700);
            border-radius: 999px;
            font-size: 12px;
            color: var(--gray-400);
            margin-bottom: 24px;
        }
        .eyebrow .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--vivid-pink);
            box-shadow: 0 0 12px var(--vivid-pink);
        }
        .hero-copy h1 {
            font-size: clamp(38px, 5.5vw, 64px);
            line-height: 1.05;
            letter-spacing: -0.025em;
            margin: 0 0 22px;
            color: white;
            font-weight: 800;
        }
        .gradient-text {
            background: var(--gradient-pink);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }
        .lede {
            font-size: clamp(15px, 1.3vw, 18px);
            color: var(--gray-400);
            max-width: 520px;
            margin: 0 0 32px;
        }
        .cta-row {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 24px;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
            cursor: pointer;
        }
        .btn-primary {
            background: var(--vivid-pink);
            color: white;
            box-shadow: 0 8px 24px rgba(var(--pink-glow), 0.35);
        }
        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 12px 32px rgba(var(--pink-glow), 0.45);
        }
        .btn-ghost {
            background: transparent;
            color: white;
            border: 1px solid var(--gray-700);
        }
        .btn-ghost:hover {
            background: rgba(255,255,255,0.04);
            border-color: var(--gray-500);
        }
        .hero-bullets {
            color: var(--gray-500);
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }
        .hero-bullets .sep { opacity: 0.5; }

        /* ─── Sections shared ─── */
        .section-head {
            text-align: center;
            margin-bottom: 56px;
            max-width: 640px;
            margin-left: auto;
            margin-right: auto;
        }
        h2 {
            font-size: clamp(28px, 3.2vw, 40px);
            color: white;
            font-weight: 700;
            margin: 0 0 14px;
            letter-spacing: -0.02em;
            line-height: 1.15;
        }
        .section-head p {
            font-size: 16px;
            color: var(--gray-400);
            margin: 0;
        }

        /* ─── Features ─── */
        .features {
            padding: var(--section-pad-y) 0;
            border-top: 1px solid var(--gray-800);
        }
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 20px;
        }
        .feature-card {
            background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
            border: 1px solid var(--gray-800);
            border-radius: 12px;
            padding: 24px;
            transition: border-color 0.2s ease, transform 0.2s ease;
        }
        .feature-card:hover {
            border-color: rgba(var(--pink-glow), 0.35);
            transform: translateY(-2px);
        }
        .feature-icon {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            background: rgba(var(--pink-glow), 0.1);
            color: var(--vivid-pink);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 18px;
        }
        .feature-icon ::ng-deep svg { display: block; }
        .feature-card h3 {
            color: white;
            font-size: 17px;
            margin: 0 0 8px;
            font-weight: 600;
        }
        .feature-card p {
            color: var(--gray-400);
            font-size: 14px;
            margin: 0;
            line-height: 1.55;
        }

        /* ─── Install ─── */
        .install {
            padding: var(--section-pad-y) 0;
            border-top: 1px solid var(--gray-800);
        }
        .install-grid {
            display: grid;
            grid-template-columns: 1fr 1.1fr;
            gap: 56px;
            align-items: center;
        }
        .install-grid > * { min-width: 0; }
        .install-copy h2 { text-align: left; }
        .install-copy p {
            color: var(--gray-400);
            font-size: 16px;
            margin: 16px 0 24px;
            max-width: 460px;
        }
        .checklist {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .checklist li {
            color: var(--gray-300);
            font-size: 14px;
            padding-left: 26px;
            position: relative;
        }
        .checklist li::before {
            content: '';
            position: absolute;
            left: 0;
            top: 9px;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: rgba(var(--pink-glow), 0.15);
            border: 1px solid var(--vivid-pink);
        }
        .checklist li::after {
            content: '';
            position: absolute;
            left: 4px;
            top: 12px;
            width: 6px;
            height: 3px;
            border-left: 1.5px solid var(--vivid-pink);
            border-bottom: 1.5px solid var(--vivid-pink);
            transform: rotate(-45deg);
        }
        .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.92em; color: var(--vivid-pink); }

        .npm-btn {
            margin-top: 24px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            align-self: flex-start;
        }
        .npm-btn svg { color: #cb3837; }

        .code-stack {
            display: flex;
            flex-direction: column;
            gap: 18px;
        }
        .code-step { display: flex; flex-direction: column; gap: 10px; }
        .step-label {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: var(--gray-400);
            font-weight: 600;
        }
        .step-num {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: rgba(var(--pink-glow), 0.15);
            border: 1px solid var(--vivid-pink);
            color: var(--vivid-pink);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0;
        }

        .code {
            background: var(--gray-900);
            border: 1px solid var(--gray-800);
            border-radius: 12px;
            padding: 24px;
            margin: 0;
            overflow: auto;
            box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        }
        .code code {
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            color: #cbd5e1;
            line-height: 1.7;
            white-space: pre;
            display: block;
        }

        /* ─── Plugins / extensibility ─── */
        .plugins {
            padding: var(--section-pad-y) 0;
            border-top: 1px solid var(--gray-800);
        }
        .plugins-grid {
            display: grid;
            grid-template-columns: 1.1fr 1fr;
            gap: 56px;
            align-items: center;
        }
        .plugins-grid > * { min-width: 0; }
        .plugins-copy h2 { text-align: left; }
        .plugins-copy p {
            color: var(--gray-400);
            font-size: 16px;
            margin: 16px 0 24px;
            max-width: 460px;
        }

        /* ─── Footer ─── */
        .site-footer {
            padding: 64px 0 24px;
            border-top: 1px solid var(--gray-800);
            background: linear-gradient(180deg, var(--gray-950) 0%, #0c0c0e 100%);
        }
        .footer-grid {
            display: grid;
            grid-template-columns: 1.4fr 1fr 1fr;
            gap: 48px;
            margin-bottom: 40px;
        }
        .foot-col { display: flex; flex-direction: column; gap: 8px; }
        .foot-col h4 {
            color: white;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 6px;
        }
        .foot-col a, .foot-col span {
            color: var(--gray-400);
            font-size: 14px;
        }
        .foot-col a:hover { color: white; }
        .foot-brand .brand { margin-bottom: 6px; }
        .muted { color: var(--gray-500); font-size: 13px; }
        .footer-bottom {
            display: flex;
            justify-content: space-between;
            padding-top: 24px;
            border-top: 1px solid var(--gray-800);
            font-size: 12px;
        }

        /* ─── Tablet ─── */
        @media (max-width: 1024px) {
            .hero-grid { grid-template-columns: 1fr; gap: 48px; text-align: center; }
            .hero-copy { display: flex; flex-direction: column; align-items: center; }
            .hero-copy .lede { text-align: center; }
            .install-grid, .plugins-grid { grid-template-columns: 1fr; gap: 40px; }
            .install-copy h2, .plugins-copy h2 { text-align: center; }
            .install-copy, .plugins-copy { text-align: center; display: flex; flex-direction: column; align-items: center; }
            .install-copy p, .plugins-copy p { margin-left: auto; margin-right: auto; }
            .npm-btn { align-self: center; }
            .checklist { display: inline-flex; }
            .footer-grid { grid-template-columns: 1fr 1fr; }
        }

        /* ─── Mobile ─── */
        @media (max-width: 768px) {
            .hamburger { display: inline-flex; }
            .nav-links {
                position: fixed;
                top: 64px;
                left: 0;
                right: 0;
                background: var(--gray-950);
                border-bottom: 1px solid var(--gray-800);
                flex-direction: column;
                align-items: stretch;
                gap: 0;
                padding: 12px 24px 18px;
                transform: translateY(-110%);
                transition: transform 0.2s ease;
                visibility: hidden;
            }
            .nav-links a {
                padding: 12px 0;
                border-bottom: 1px solid var(--gray-800);
            }
            .nav-links a:last-child { border-bottom: none; }
            .nav-links .github {
                margin-top: 10px;
                justify-content: center;
            }
            .topnav.open .nav-links {
                transform: translateY(0);
                visibility: visible;
            }
        }

        @media (max-width: 640px) {
            :root { --section-pad-y: var(--section-pad-y-mobile); }
            .hero { padding: 56px 0 48px; }
            .features, .install, .plugins { padding: 64px 0; }
            .footer-grid { grid-template-columns: 1fr; gap: 32px; }
            .footer-bottom { flex-direction: column; gap: 6px; }
            .code { padding: 16px; }
            .code code { font-size: 12px; }
            .feature-card { padding: 20px; }
            .container { padding: 0 18px; }
        }
    `],
})
export class LandingComponent {
    private sanitizer = inject(DomSanitizer);

    navOpen = signal(false);
    angularVersion = '19';

    toggleNav() { this.navOpen.update(v => !v); }
    closeNav() { this.navOpen.set(false); }

    // Wrap an icon's path data in a full <svg> and trust it for [innerHTML].
    // Bound via a <span> wrapper, not <svg> directly — Angular's SSR renderer
    // doesn't implement setProperty('innerHTML') for SVG elements.
    private icon(inner: string): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
        );
    }

    features: Feature[] = [
        {
            name: 'Overview',
            blurb: 'A landing dashboard with Angular version, plugin count, and a snapshot of your app at a glance.',
            icon: this.icon('<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>'),
        },
        {
            name: 'Components',
            blurb: 'Live tree of every Angular component on the page. Inspect state, unwrap signals, and jump to source.',
            icon: this.icon('<rect x="10" y="3" width="4" height="4" rx="1"/><rect x="4" y="17" width="4" height="4" rx="1"/><rect x="10" y="17" width="4" height="4" rx="1"/><rect x="16" y="17" width="4" height="4" rx="1"/><path d="M12 7v5"/><path d="M6 12v5"/><path d="M18 12v5"/><path d="M6 12h12"/>'),
        },
        {
            name: 'Routes',
            blurb: 'Every registered route, the active match, guards, and lazy chunks — with one-click navigation.',
            icon: this.icon('<rect x="3" y="10" width="6" height="4" rx="1"/><rect x="15" y="4" width="6" height="4" rx="1"/><rect x="15" y="10" width="6" height="4" rx="1"/><rect x="15" y="16" width="6" height="4" rx="1"/><polyline points="9 12 12 12 12 6 15 6"/><line x1="12" y1="12" x2="15" y2="12"/><polyline points="12 12 12 18 15 18"/>'),
        },
        {
            name: 'Assets',
            blurb: 'Every loaded image, font, script, and fetch. Type filters, previews, and where-used DOM mapping.',
            icon: this.icon('<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
        },
        {
            name: 'Inspector',
            blurb: 'Point-and-click any element to reveal its component, copy a precise selector, and open the source.',
            icon: this.icon('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>'),
        },
        {
            name: 'SEO',
            blurb: 'Live share-card preview, Open Graph and Twitter tag tables, and checks for titles, descriptions, and canonicals.',
            icon: this.icon('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>'),
        },
        {
            name: 'Profiler',
            blurb: 'Record change detection: per-component render counts and timings, CD cycle stats, and hot-spot highlighting.',
            icon: this.icon('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'),
        },
        {
            name: 'State',
            blurb: 'Auto-detects NgRx or NGXS, renders the store as an expandable tree, and logs every dispatched action.',
            icon: this.icon('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>'),
        },
    ];

    installCommand = `npm install ng-inapp-dev-tool --save-dev`;

    installSnippet = `// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideInAppDevTools } from 'ng-inapp-dev-tool';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideInAppDevTools({
      editor: 'vscode',
      projectRoot: '/absolute/path/to/your/repo',
    }),
  ],
};`;

    pluginSnippet = `import { Plugin } from 'ng-inapp-dev-tool';
import { MyToolComponent } from './my-tool.component';

const myPlugin: Plugin = {
  name: 'My Tool',
  icon: '<svg ...></svg>',
  order: 10,
  component: MyToolComponent,
};

provideInAppDevTools({
  plugins: [myPlugin],
});`;
}
