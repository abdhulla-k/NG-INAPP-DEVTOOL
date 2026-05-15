import { Component } from '@angular/core';

@Component({
    selector: 'app-devtool-mock',
    standalone: true,
    template: `
        <div class="browser-frame" aria-hidden="true">
            <div class="browser-chrome">
                <div class="dots">
                    <span class="dot red"></span>
                    <span class="dot yellow"></span>
                    <span class="dot green"></span>
                </div>
                <div class="url-bar">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>
                    <span>localhost:4200</span>
                </div>
            </div>

            <div class="viewport">
                <div class="page-shimmer">
                    <span class="shim line" style="width: 60%"></span>
                    <span class="shim line" style="width: 85%"></span>
                    <span class="shim line" style="width: 40%"></span>
                    <span class="shim block"></span>
                </div>

                <div class="devtool-shell">
                    <aside class="dt-sidebar">
                        <span class="dt-logo"></span>
                        <span class="dt-divider"></span>
                        <span class="dt-tab"></span>
                        <span class="dt-tab active"></span>
                        <span class="dt-tab"></span>
                        <span class="dt-tab"></span>
                    </aside>
                    <div class="dt-content">
                        <div class="dt-header">
                            <span class="dt-title"></span>
                            <span class="dt-pill"></span>
                        </div>
                        <div class="dt-rows">
                            <div class="dt-row">
                                <span class="dt-thumb"></span>
                                <span class="dt-meta">
                                    <span class="dt-name"></span>
                                    <span class="dt-sub"></span>
                                </span>
                            </div>
                            <div class="dt-row">
                                <span class="dt-thumb pink"></span>
                                <span class="dt-meta">
                                    <span class="dt-name long"></span>
                                    <span class="dt-sub"></span>
                                </span>
                            </div>
                            <div class="dt-row selected">
                                <span class="dt-thumb"></span>
                                <span class="dt-meta">
                                    <span class="dt-name"></span>
                                    <span class="dt-sub short"></span>
                                </span>
                            </div>
                            <div class="dt-row">
                                <span class="dt-thumb violet"></span>
                                <span class="dt-meta">
                                    <span class="dt-name short"></span>
                                    <span class="dt-sub"></span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host {
            display: block;
            width: 100%;
            max-width: 580px;
            margin: 0 auto;
            filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.45)) drop-shadow(0 0 80px rgba(var(--pink-glow), 0.15));
        }

        .browser-frame {
            background: var(--gray-900);
            border: 1px solid var(--gray-700);
            border-radius: 12px;
            overflow: hidden;
            position: relative;
        }

        .browser-chrome {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 10px 14px;
            background: var(--gray-800);
            border-bottom: 1px solid var(--gray-700);
        }
        .dots { display: flex; gap: 6px; }
        .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            display: inline-block;
        }
        .dot.red { background: #ff5f57; }
        .dot.yellow { background: #febc2e; }
        .dot.green { background: #28c840; }
        .url-bar {
            flex: 1;
            background: var(--gray-900);
            border-radius: 6px;
            padding: 4px 10px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: var(--gray-400);
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
        }

        /* Page area */
        .viewport {
            position: relative;
            min-height: 280px;
            padding: 28px;
            background: linear-gradient(180deg, var(--gray-900) 0%, var(--gray-950) 100%);
        }

        .page-shimmer {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .shim {
            display: block;
            background: linear-gradient(90deg, var(--gray-800), var(--gray-700), var(--gray-800));
            background-size: 200% 100%;
            border-radius: 6px;
            animation: shimmer 2.4s ease-in-out infinite;
        }
        .shim.line { height: 12px; }
        .shim.block {
            height: 90px;
            margin-top: 12px;
            background: linear-gradient(135deg, rgba(var(--pink-glow), 0.18), rgba(255,255,255,0.02));
        }

        @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        /* Floating dev tool */
        .devtool-shell {
            position: absolute;
            right: 18px;
            bottom: 18px;
            width: 62%;
            max-width: 340px;
            height: 200px;
            background: var(--gray-900);
            border: 1px solid var(--gray-700);
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
        }

        .dt-sidebar {
            width: 36px;
            background: #18181b;
            border-right: 1px solid var(--gray-700);
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px 0;
            gap: 8px;
        }
        .dt-logo {
            width: 14px;
            height: 14px;
            background: var(--vivid-pink);
            border-radius: 2px;
            clip-path: polygon(50% 0%, 100% 25%, 90% 80%, 50% 100%, 10% 80%, 0% 25%);
        }
        .dt-divider {
            width: 18px;
            height: 1px;
            background: var(--gray-700);
            margin: 2px 0;
        }
        .dt-tab {
            width: 20px;
            height: 20px;
            border-radius: 5px;
            background: rgba(255,255,255,0.04);
        }
        .dt-tab.active {
            background: rgba(var(--pink-glow), 0.15);
            box-shadow: inset 0 0 0 1px rgba(var(--pink-glow), 0.25);
        }

        .dt-content { flex: 1; padding: 10px 12px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .dt-header { display: flex; align-items: center; justify-content: space-between; }
        .dt-title { width: 60px; height: 8px; background: var(--gray-700); border-radius: 3px; }
        .dt-pill { width: 36px; height: 14px; background: rgba(var(--pink-glow), 0.15); border: 1px solid rgba(var(--pink-glow), 0.3); border-radius: 999px; }

        .dt-rows { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .dt-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 6px;
            border-radius: 4px;
            background: rgba(255,255,255,0.02);
            min-width: 0;
        }
        .dt-row.selected {
            background: rgba(var(--pink-glow), 0.08);
            border-left: 2px solid var(--vivid-pink);
        }
        .dt-thumb { width: 18px; height: 18px; border-radius: 3px; background: #4ade80; flex-shrink: 0; }
        .dt-thumb.pink { background: var(--vivid-pink); }
        .dt-thumb.violet { background: #a78bfa; }
        .dt-meta { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
        .dt-name { height: 7px; background: var(--gray-400); border-radius: 2px; width: 70%; }
        .dt-name.long { width: 90%; }
        .dt-name.short { width: 45%; }
        .dt-sub { height: 6px; background: var(--gray-700); border-radius: 2px; width: 40%; }
        .dt-sub.short { width: 25%; }

        @media (max-width: 640px) {
            :host { max-width: 100%; }
            .viewport { padding: 16px; min-height: 220px; }
            .devtool-shell { width: 70%; height: 160px; right: 12px; bottom: 12px; }
            .dt-sidebar { width: 28px; }
            .dt-tab { width: 16px; height: 16px; }
            .shim.block { height: 60px; }
        }
    `],
})
export class DevtoolMockComponent {}
