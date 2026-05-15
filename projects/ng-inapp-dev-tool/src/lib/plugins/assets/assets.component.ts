import {
    Component,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
    inject,
    NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';

type AssetType = 'image' | 'font' | 'script' | 'stylesheet' | 'fetch' | 'media' | 'other';

interface Asset {
    url: string;
    filename: string;
    type: AssetType;
    initiatorType: string;
    transferSize: number;
    decodedBodySize: number;
}

interface UsageRef {
    tag: string;
    selector: string;
    property: string;
    element: HTMLElement;
}

const TYPE_ORDER: AssetType[] = ['image', 'font', 'script', 'stylesheet', 'fetch', 'media', 'other'];

const TYPE_LABEL: Record<AssetType, string> = {
    image: 'Images',
    font: 'Fonts',
    script: 'Scripts',
    stylesheet: 'Styles',
    fetch: 'Fetch',
    media: 'Media',
    other: 'Other',
};

const EXT_TYPE: Array<[RegExp, AssetType]> = [
    [/\.(png|jpe?g|gif|webp|avif|svg|bmp|ico)(\?|#|$)/i, 'image'],
    [/\.(woff2?|ttf|otf|eot)(\?|#|$)/i, 'font'],
    [/\.(mp4|webm|ogg|ogv|mp3|wav|m4a|m4v)(\?|#|$)/i, 'media'],
    [/\.css(\?|#|$)/i, 'stylesheet'],
    [/\.(m?js)(\?|#|$)/i, 'script'],
];

@Component({
    selector: 'ng-inapp-dev-tool-assets',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="assets-layout">
            <!-- Left pane: filters + list -->
            <div class="list-pane">
                <div class="pane-header">
                    <h3>Assets</h3>
                    <div class="totals">
                        <span class="muted">{{ filteredAssets.length }} of {{ assets.length }}</span>
                        <span class="muted">·</span>
                        <span class="muted">{{ formatBytes(totalTransferred) }} transferred</span>
                    </div>
                    <button class="refresh-btn" (click)="refresh()" title="Re-scan resources">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                    </button>
                </div>

                <div class="search-bar">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input
                        type="text"
                        [value]="search"
                        (input)="onSearch($event)"
                        placeholder="Filter by URL"
                    />
                </div>

                <div class="filter-chips">
                    <button
                        class="chip"
                        [class.active]="activeType === 'all'"
                        (click)="setType('all')"
                    >
                        All <span class="count">{{ assets.length }}</span>
                    </button>
                    @for (t of typeOrder; track t) {
                        @if (typeCounts[t]) {
                            <button
                                class="chip"
                                [class.active]="activeType === t"
                                (click)="setType(t)"
                            >
                                {{ typeLabel[t] }} <span class="count">{{ typeCounts[t] }}</span>
                            </button>
                        }
                    }
                </div>

                <div class="list-container">
                    @for (asset of filteredAssets; track asset.url) {
                        <div
                            class="asset-row"
                            [class.selected]="selected?.url === asset.url"
                            (click)="select(asset)"
                        >
                            <div class="thumb">
                                @if (asset.type === 'image') {
                                    <img [src]="asset.url" [alt]="asset.filename" loading="lazy" />
                                } @else {
                                    <span class="type-glyph">{{ glyphFor(asset.type) }}</span>
                                }
                            </div>
                            <div class="row-main">
                                <div class="filename">{{ asset.filename }}</div>
                                <div class="row-meta">
                                    <span class="type-badge type-{{ asset.type }}">{{ asset.type }}</span>
                                    <span class="muted">{{ formatBytes(asset.transferSize || asset.decodedBodySize) }}</span>
                                </div>
                            </div>
                        </div>
                    }
                    @if (filteredAssets.length === 0) {
                        <div class="empty-state">No assets match this filter.</div>
                    }
                </div>
            </div>

            <!-- Right pane: detail + where-used -->
            <div class="detail-pane">
                @if (selected) {
                    <div class="pane-header">
                        <h3 class="filename-mono">{{ selected.filename }}</h3>
                        <button class="copy-btn" (click)="copyUrl()" [attr.data-state]="copyLabel">{{ copyLabel }}</button>
                    </div>

                    <div class="detail-body">
                        @if (selected.type === 'image') {
                            <div class="preview">
                                <img [src]="selected.url" [alt]="selected.filename" />
                            </div>
                        }

                        <dl class="meta-grid">
                            <dt>Type</dt>
                            <dd><span class="type-badge type-{{ selected.type }}">{{ selected.type }}</span></dd>
                            <dt>Initiator</dt>
                            <dd class="mono">{{ selected.initiatorType || '—' }}</dd>
                            <dt>Transferred</dt>
                            <dd class="mono">{{ formatBytes(selected.transferSize) }} <span class="muted">(over network)</span></dd>
                            <dt>Decoded</dt>
                            <dd class="mono">{{ formatBytes(selected.decodedBodySize) }}</dd>
                            <dt>URL</dt>
                            <dd class="mono url-cell">{{ selected.url }}</dd>
                        </dl>

                        <div class="usage-section">
                            <div class="usage-header">
                                <h4>Where used</h4>
                                <button class="ghost-btn" (click)="findUsages()" [disabled]="scanning">
                                    {{ scanning ? 'Scanning…' : (usagesScanned ? 'Re-scan DOM' : 'Scan DOM') }}
                                </button>
                            </div>

                            @if (!usagesScanned && !scanning) {
                                <p class="muted small">Walks the live DOM looking for elements whose <code>src</code>, <code>href</code>, <code>srcset</code>, or computed <code>background-image</code> resolves to this URL.</p>
                            }

                            @if (usagesScanned) {
                                @if (usages.length > 0) {
                                    <ul class="usage-list">
                                        @for (u of usages; track u.element) {
                                            <li
                                                class="usage-row"
                                                (mouseenter)="highlight(u.element)"
                                                (mouseleave)="clearHighlight()"
                                                (click)="scrollToAndFlash(u.element)"
                                            >
                                                <span class="usage-tag">&lt;{{ u.tag }}&gt;</span>
                                                <span class="usage-prop">{{ u.property }}</span>
                                                <span class="usage-selector mono">{{ u.selector }}</span>
                                            </li>
                                        }
                                    </ul>
                                } @else {
                                    <p class="muted small">No DOM references found. The asset may be loaded by code or referenced from a stylesheet that wasn't scanned.</p>
                                }
                            }
                        </div>
                    </div>
                } @else {
                    <div class="empty-state">Select an asset to inspect.</div>
                }
            </div>
        </div>
    `,
    styles: [`
        :host {
            display: flex;
            height: 100%;
            width: 100%;
            font-family: 'Inter', sans-serif;
            color: #e2e8f0;
            background: var(--ngidt-gray-900);
            overflow: hidden;
        }

        .assets-layout {
            display: flex;
            width: 100%;
            height: 100%;
        }

        /* Panes */
        .list-pane {
            width: 45%;
            min-width: 320px;
            border-right: 1px solid var(--ngidt-gray-700);
            display: flex;
            flex-direction: column;
            background: var(--ngidt-gray-900);
        }
        .detail-pane {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: var(--ngidt-gray-900);
            overflow: hidden;
        }

        .pane-header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--ngidt-gray-700);
            display: flex;
            align-items: center;
            gap: 10px;
            background: var(--ngidt-gray-800, #1f1f23);
        }
        .pane-header h3 {
            margin: 0;
            font-size: 14px;
            font-weight: 500;
            color: white;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }
        .pane-header .totals {
            display: flex;
            gap: 6px;
            margin-left: auto;
            margin-right: 6px;
            font-size: 11px;
        }
        .filename-mono {
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 13px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* Buttons */
        .refresh-btn, .copy-btn, .ghost-btn {
            background: transparent;
            border: 1px solid var(--ngidt-gray-700);
            color: #cbd5e1;
            cursor: pointer;
            padding: 4px 10px;
            border-radius: 4px;
            font-family: inherit;
            font-size: 11px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .refresh-btn { padding: 4px; border: none; }
        .refresh-btn:hover, .copy-btn:hover, .ghost-btn:hover {
            color: white;
            background: var(--ngidt-gray-700);
        }
        .ghost-btn:disabled { opacity: 0.5; cursor: default; }
        .icon { width: 14px; height: 14px; }
        .copy-btn[data-state="Copied!"] {
            color: var(--ngidt-vivid-pink);
            border-color: rgba(255, 65, 248, 0.4);
        }

        /* Search */
        .search-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-bottom: 1px solid var(--ngidt-gray-700);
            color: #94a3b8;
        }
        .search-bar input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: #e2e8f0;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 12px;
        }

        /* Filter chips */
        .filter-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            padding: 10px 12px;
            border-bottom: 1px solid var(--ngidt-gray-700);
        }
        .chip {
            background: rgba(255,255,255,0.04);
            border: 1px solid transparent;
            color: #cbd5e1;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-family: inherit;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .chip:hover { background: rgba(255,255,255,0.08); }
        .chip.active {
            background: rgba(255, 65, 248, 0.12);
            border-color: rgba(255, 65, 248, 0.4);
            color: var(--ngidt-vivid-pink);
        }
        .chip .count {
            font-size: 10px;
            background: rgba(255,255,255,0.08);
            padding: 1px 6px;
            border-radius: 999px;
        }
        .chip.active .count {
            background: rgba(255, 65, 248, 0.2);
            color: var(--ngidt-vivid-pink);
        }

        /* List */
        .list-container {
            flex: 1;
            overflow: auto;
            padding: 6px 0;
        }
        .asset-row {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 6px 12px;
            cursor: pointer;
            border-left: 2px solid transparent;
        }
        .asset-row:hover { background: rgba(255,255,255,0.04); }
        .asset-row.selected {
            background: rgba(255, 65, 248, 0.08);
            border-left-color: var(--ngidt-vivid-pink);
        }
        .thumb {
            width: 32px;
            height: 32px;
            background: rgba(0,0,0,0.3);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
        }
        .thumb img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .type-glyph {
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 11px;
            color: #94a3b8;
        }
        .row-main { min-width: 0; flex: 1; }
        .filename {
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #e2e8f0;
        }
        .row-meta {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 2px;
            font-size: 11px;
        }

        /* Type badges share styling, color tinted per type */
        .type-badge {
            text-transform: lowercase;
            font-size: 10px;
            padding: 1px 6px;
            border-radius: 3px;
            background: rgba(255,255,255,0.08);
            color: #cbd5e1;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }
        .type-image      { background: rgba( 74, 222, 128, 0.15); color: #4ade80; }
        .type-font       { background: rgba(168, 139, 250, 0.15); color: #a78bfa; }
        .type-script     { background: rgba(250, 204,  21, 0.15); color: #facc15; }
        .type-stylesheet { background: rgba( 96, 165, 250, 0.15); color: #60a5fa; }
        .type-fetch      { background: rgba(244, 114, 182, 0.15); color: #f472b6; }
        .type-media      { background: rgba(251, 146,  60, 0.15); color: #fb923c; }
        .type-other      { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }

        .muted { color: #64748b; }
        .small { font-size: 11px; }

        /* Detail */
        .detail-body {
            flex: 1;
            overflow: auto;
            padding: 16px;
        }
        .preview {
            background: rgba(0,0,0,0.3);
            border: 1px solid var(--ngidt-gray-700);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: center;
        }
        .preview img {
            max-width: 100%;
            max-height: 240px;
            object-fit: contain;
        }
        .meta-grid {
            display: grid;
            grid-template-columns: 100px 1fr;
            gap: 6px 12px;
            margin: 0 0 20px;
            font-size: 12px;
        }
        .meta-grid dt { color: #94a3b8; }
        .meta-grid dd { margin: 0; color: #e2e8f0; }
        .mono {
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 11px;
        }
        .url-cell {
            word-break: break-all;
            color: var(--ngidt-vivid-pink);
        }

        .usage-section {
            border-top: 1px solid var(--ngidt-gray-700);
            padding-top: 14px;
        }
        .usage-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .usage-header h4 {
            margin: 0;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #94a3b8;
        }
        .usage-list {
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .usage-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 8px;
            border-radius: 4px;
            background: rgba(255,255,255,0.03);
            cursor: pointer;
            font-size: 11px;
        }
        .usage-row:hover { background: rgba(255, 65, 248, 0.08); }
        .usage-tag {
            color: #4ade80;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }
        .usage-prop {
            color: #94a3b8;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 10px;
            background: rgba(255,255,255,0.05);
            padding: 1px 5px;
            border-radius: 3px;
        }
        .usage-selector {
            color: #cbd5e1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            min-width: 0;
            flex: 1;
        }

        .empty-state {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #64748b;
            font-family: 'Inter', sans-serif;
            padding: 20px;
            text-align: center;
        }
    `],
})
export class AssetsComponent implements OnInit, OnDestroy {
    assets: Asset[] = [];
    filteredAssets: Asset[] = [];
    typeCounts: Record<AssetType, number> = {
        image: 0, font: 0, script: 0, stylesheet: 0, fetch: 0, media: 0, other: 0,
    };
    totalTransferred = 0;

    activeType: AssetType | 'all' = 'all';
    search = '';

    selected: Asset | null = null;

    usages: UsageRef[] = [];
    usagesScanned = false;
    scanning = false;

    copyLabel = 'Copy URL';

    typeOrder = TYPE_ORDER;
    typeLabel = TYPE_LABEL;

    private cdr = inject(ChangeDetectorRef);
    private ngZone = inject(NgZone);

    private observer?: PerformanceObserver;
    private highlightEl: HTMLElement | null = null;
    private prevOutline = '';
    private prevOutlineOffset = '';

    ngOnInit() {
        this.refresh();

        // Live updates: pick up new resources without a manual refresh.
        // Run outside zone — we batch updates with a single detectChanges.
        this.ngZone.runOutsideAngular(() => {
            try {
                this.observer = new PerformanceObserver(() => {
                    this.collect();
                    this.cdr.detectChanges();
                });
                this.observer.observe({ type: 'resource', buffered: false });
            } catch {
                // PerformanceObserver isn't supported in some environments — silently degrade.
            }
        });
    }

    ngOnDestroy() {
        this.observer?.disconnect();
        this.clearHighlight();
    }

    refresh() {
        this.collect();
        this.cdr.detectChanges();
    }

    private collect() {
        const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const seen = new Set<string>();
        const next: Asset[] = [];
        const counts: Record<AssetType, number> = {
            image: 0, font: 0, script: 0, stylesheet: 0, fetch: 0, media: 0, other: 0,
        };
        let total = 0;

        for (const e of entries) {
            // Skip the dev tool's own assets (none currently, but future-proof) and devtools-injected URLs
            if (e.name.startsWith('chrome-extension://') || e.name.startsWith('devtools://')) continue;
            if (seen.has(e.name)) continue;
            seen.add(e.name);

            const type = this.classify(e);
            const filename = this.basename(e.name);
            const transferSize = e.transferSize || 0;
            const decodedBodySize = e.decodedBodySize || 0;

            counts[type]++;
            total += transferSize;

            next.push({
                url: e.name,
                filename,
                type,
                initiatorType: e.initiatorType,
                transferSize,
                decodedBodySize,
            });
        }

        this.assets = next;
        this.typeCounts = counts;
        this.totalTransferred = total;
        this.applyFilter();

        // If the selected asset is gone (rare — entries usually persist), clear it
        if (this.selected && !this.assets.find(a => a.url === this.selected!.url)) {
            this.selected = null;
            this.usagesScanned = false;
            this.usages = [];
        }
    }

    private classify(entry: PerformanceResourceTiming): AssetType {
        const initiator = entry.initiatorType;
        const url = entry.name;

        // Trust initiatorType when it's specific
        if (initiator === 'img' || initiator === 'image') return 'image';
        if (initiator === 'css') return 'stylesheet';
        if (initiator === 'script') return 'script';
        if (initiator === 'video' || initiator === 'audio') return 'media';
        if (initiator === 'xmlhttprequest' || initiator === 'fetch') return 'fetch';

        // Fall back to extension match
        for (const [re, t] of EXT_TYPE) {
            if (re.test(url)) return t;
        }

        // <link> can be many things — only classify as stylesheet if extension matched above
        return 'other';
    }

    private basename(url: string): string {
        try {
            const u = new URL(url);
            const parts = u.pathname.split('/').filter(Boolean);
            return parts[parts.length - 1] || u.hostname;
        } catch {
            return url;
        }
    }

    onSearch(event: Event) {
        this.search = (event.target as HTMLInputElement).value.toLowerCase();
        this.applyFilter();
        this.cdr.detectChanges();
    }

    setType(t: AssetType | 'all') {
        this.activeType = t;
        this.applyFilter();
        this.cdr.detectChanges();
    }

    private applyFilter() {
        const q = this.search;
        const t = this.activeType;
        this.filteredAssets = this.assets.filter(a => {
            if (t !== 'all' && a.type !== t) return false;
            if (q && !a.url.toLowerCase().includes(q)) return false;
            return true;
        });
    }

    select(asset: Asset) {
        this.selected = asset;
        this.usages = [];
        this.usagesScanned = false;
        this.copyLabel = 'Copy URL';
        this.cdr.detectChanges();
    }

    glyphFor(type: AssetType): string {
        switch (type) {
            case 'font': return 'Aa';
            case 'script': return 'JS';
            case 'stylesheet': return '{}';
            case 'fetch': return '↯';
            case 'media': return '▶';
            default: return '·';
        }
    }

    formatBytes(n: number): string {
        if (!n) return '—';
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / 1024 / 1024).toFixed(2)} MB`;
    }

    copyUrl() {
        if (!this.selected) return;
        navigator.clipboard.writeText(this.selected.url).then(() => {
            this.copyLabel = 'Copied!';
            this.cdr.detectChanges();
            setTimeout(() => {
                this.copyLabel = 'Copy URL';
                this.cdr.detectChanges();
            }, 1200);
        });
    }

    findUsages() {
        if (!this.selected || this.scanning) return;
        const target = this.selected.url;
        this.scanning = true;
        this.cdr.detectChanges();

        // Defer to next tick so the "Scanning…" label paints before we walk the DOM
        setTimeout(() => {
            this.usages = this.scanDom(target);
            this.usagesScanned = true;
            this.scanning = false;
            this.cdr.detectChanges();
        }, 0);
    }

    private scanDom(targetUrl: string): UsageRef[] {
        const found: UsageRef[] = [];
        const all = document.querySelectorAll<HTMLElement>('*');
        const bgUrlRe = /url\((['"]?)(.*?)\1\)/g;

        for (const el of Array.from(all)) {
            // Skip the devtool's own DOM
            if (el.closest('ng-inapp-dev-tool-shell')) continue;

            const tag = el.tagName.toLowerCase();

            // Direct attribute / property checks (browser resolves to absolute URLs)
            const candidates: Array<[string, string | null]> = [];
            if ('src' in el && (el as any).src) candidates.push(['src', (el as any).src as string]);
            if ('href' in el && (el as any).href && (tag === 'link' || tag === 'a')) {
                candidates.push(['href', (el as any).href as string]);
            }
            if ('currentSrc' in el && (el as any).currentSrc && (el as any).currentSrc !== (el as any).src) {
                candidates.push(['currentSrc', (el as any).currentSrc as string]);
            }

            for (const [prop, value] of candidates) {
                if (value === targetUrl) {
                    found.push({
                        tag,
                        property: prop,
                        selector: this.shortSelector(el),
                        element: el,
                    });
                    break;
                }
            }

            // background-image — expensive, but bounded by total element count
            const bg = getComputedStyle(el).backgroundImage;
            if (bg && bg !== 'none') {
                bgUrlRe.lastIndex = 0;
                let m: RegExpExecArray | null;
                while ((m = bgUrlRe.exec(bg))) {
                    // background-image URLs may be relative — resolve against the document
                    let resolved = m[2];
                    try { resolved = new URL(m[2], document.baseURI).href; } catch { /* keep raw */ }
                    if (resolved === targetUrl) {
                        found.push({
                            tag,
                            property: 'background-image',
                            selector: this.shortSelector(el),
                            element: el,
                        });
                        break;
                    }
                }
            }
        }

        return found;
    }

    private shortSelector(el: HTMLElement): string {
        const parts: string[] = [];
        let cur: HTMLElement | null = el;
        let depth = 0;
        while (cur && cur.tagName !== 'HTML' && depth < 4) {
            let part = cur.tagName.toLowerCase();
            if (cur.id) {
                part += `#${cur.id}`;
                parts.unshift(part);
                break;
            }
            const cls = cur.getAttribute('class');
            if (cls) {
                const first = cls.split(/\s+/).filter(c => c && !c.startsWith('ng-'))[0];
                if (first) part += `.${first}`;
            }
            parts.unshift(part);
            cur = cur.parentElement;
            depth++;
        }
        return parts.join(' > ');
    }

    highlight(el: HTMLElement) {
        this.clearHighlight();
        this.highlightEl = el;
        this.prevOutline = el.style.outline;
        this.prevOutlineOffset = el.style.outlineOffset;
        el.style.outline = '2px solid oklch(69.02% 0.277 332.77)';
        el.style.outlineOffset = '2px';
    }

    clearHighlight() {
        if (this.highlightEl) {
            this.highlightEl.style.outline = this.prevOutline;
            this.highlightEl.style.outlineOffset = this.prevOutlineOffset;
            this.highlightEl = null;
        }
    }

    scrollToAndFlash(el: HTMLElement) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.highlight(el);
        setTimeout(() => this.clearHighlight(), 1500);
    }
}
