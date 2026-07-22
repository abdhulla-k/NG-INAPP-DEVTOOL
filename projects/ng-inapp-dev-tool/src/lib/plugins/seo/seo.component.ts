import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TagRow {
    name: string;
    value: string | null;
}

interface SeoCheck {
    label: string;
    status: 'ok' | 'warn' | 'fail';
    detail: string;
}

interface SeoSnapshot {
    title: string | null;
    description: string | null;
    canonical: string | null;
    robots: string | null;
    lang: string | null;
    viewport: string | null;
    charset: string | null;
    og: TagRow[];
    twitter: TagRow[];
}

const KNOWN_OG_TAGS = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name'];
const KNOWN_TWITTER_TAGS = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:site'];

@Component({
    selector: 'ng-devtool-seo',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="seo-layout">
            <div class="pane-header">
                <h3>Open Graph &amp; SEO</h3>
                <button class="refresh-btn" (click)="refresh()" title="Refresh">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                </button>
            </div>

            <div class="seo-content">
                <!-- Social share preview -->
                <div class="seo-section preview-section">
                    <h4>Share Preview</h4>
                    <div class="share-card">
                        @if (previewImage && !previewImageFailed) {
                            <img class="share-image" [src]="previewImage" alt="" (error)="previewImageFailed = true" />
                        } @else {
                            <div class="share-image placeholder">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                <span>No og:image</span>
                            </div>
                        }
                        <div class="share-body">
                            <div class="share-domain">{{ previewDomain }}</div>
                            <div class="share-title">{{ previewTitle || 'Untitled page' }}</div>
                            @if (previewDescription) {
                                <div class="share-description">{{ previewDescription }}</div>
                            }
                        </div>
                    </div>
                </div>

                <!-- Checks -->
                <div class="seo-section">
                    <h4>Checks</h4>
                    <div class="check-list">
                        @for (check of checks; track check.label) {
                            <div class="check-row" [class]="check.status">
                                <span class="check-icon">
                                    @if (check.status === 'ok') { ✓ }
                                    @else if (check.status === 'warn') { ⚠ }
                                    @else { ✕ }
                                </span>
                                <span class="check-label">{{ check.label }}</span>
                                <span class="check-detail">{{ check.detail }}</span>
                            </div>
                        }
                    </div>
                </div>

                <!-- Tag tables -->
                <div class="seo-section">
                    <h4>General</h4>
                    <table class="tag-table">
                        <tbody>
                            <tr><td class="tag-name">title</td><td class="tag-value" [class.missing]="!snapshot?.title">{{ snapshot?.title || '—' }}</td></tr>
                            <tr><td class="tag-name">description</td><td class="tag-value" [class.missing]="!snapshot?.description">{{ snapshot?.description || '—' }}</td></tr>
                            <tr><td class="tag-name">canonical</td><td class="tag-value" [class.missing]="!snapshot?.canonical">{{ snapshot?.canonical || '—' }}</td></tr>
                            <tr><td class="tag-name">robots</td><td class="tag-value" [class.missing]="!snapshot?.robots">{{ snapshot?.robots || '—' }}</td></tr>
                            <tr><td class="tag-name">html lang</td><td class="tag-value" [class.missing]="!snapshot?.lang">{{ snapshot?.lang || '—' }}</td></tr>
                            <tr><td class="tag-name">viewport</td><td class="tag-value" [class.missing]="!snapshot?.viewport">{{ snapshot?.viewport || '—' }}</td></tr>
                            <tr><td class="tag-name">charset</td><td class="tag-value" [class.missing]="!snapshot?.charset">{{ snapshot?.charset || '—' }}</td></tr>
                        </tbody>
                    </table>
                </div>

                <div class="seo-section">
                    <h4>Open Graph</h4>
                    <table class="tag-table">
                        <tbody>
                            @for (tag of snapshot?.og ?? []; track tag.name) {
                                <tr><td class="tag-name">{{ tag.name }}</td><td class="tag-value" [class.missing]="!tag.value">{{ tag.value || '—' }}</td></tr>
                            }
                        </tbody>
                    </table>
                </div>

                <div class="seo-section">
                    <h4>Twitter</h4>
                    <table class="tag-table">
                        <tbody>
                            @for (tag of snapshot?.twitter ?? []; track tag.name) {
                                <tr><td class="tag-name">{{ tag.name }}</td><td class="tag-value" [class.missing]="!tag.value">{{ tag.value || '—' }}</td></tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host {
            display: block;
            height: 100%;
            width: 100%;
            color: var(--ngidt-gray-300);
            background: var(--ngidt-gray-900);
            font-family: 'Inter', sans-serif;
            overflow: hidden;
        }

        .seo-layout {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .pane-header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--ngidt-gray-700);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--ngidt-gray-800);
            flex-shrink: 0;
        }
        .pane-header h3 {
            margin: 0;
            font-size: 14px;
            font-weight: 500;
            color: white;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }

        .refresh-btn {
            background: transparent;
            border: none;
            color: var(--ngidt-gray-400);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .refresh-btn:hover { color: white; background: var(--ngidt-gray-700); }
        .refresh-btn .icon { width: 16px; height: 16px; }

        .seo-content {
            flex: 1;
            overflow: auto;
            padding: 16px;
        }

        .seo-section { margin-bottom: 24px; }
        .seo-section h4 {
            margin: 0 0 10px 0;
            color: var(--ngidt-gray-400);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Share preview card */
        .share-card {
            max-width: 440px;
            border: 1px solid var(--ngidt-gray-700);
            border-radius: 10px;
            overflow: hidden;
            background: var(--ngidt-gray-800);
        }
        .share-image {
            display: block;
            width: 100%;
            aspect-ratio: 1.91 / 1;
            object-fit: cover;
            background: var(--ngidt-gray-900);
        }
        .share-image.placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: var(--ngidt-gray-500);
            font-size: 12px;
        }
        .share-body { padding: 12px 14px; }
        .share-domain {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            color: var(--ngidt-gray-500);
            margin-bottom: 4px;
        }
        .share-title {
            font-size: 15px;
            font-weight: 600;
            color: white;
            margin-bottom: 4px;
            line-height: 1.3;
        }
        .share-description {
            font-size: 13px;
            color: var(--ngidt-gray-400);
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        /* Checks */
        .check-list { display: flex; flex-direction: column; gap: 6px; }
        .check-row {
            display: flex;
            align-items: baseline;
            gap: 8px;
            font-size: 13px;
        }
        .check-icon { width: 16px; text-align: center; flex-shrink: 0; }
        .check-row.ok .check-icon { color: #4ade80; }
        .check-row.warn .check-icon { color: #fbbf24; }
        .check-row.fail .check-icon { color: #f87171; }
        .check-label { color: var(--ngidt-gray-300); white-space: nowrap; }
        .check-detail { color: var(--ngidt-gray-500); font-size: 12px; }

        /* Tag tables */
        .tag-table {
            width: 100%;
            border-collapse: collapse;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 12px;
        }
        .tag-table td {
            padding: 5px 10px;
            border-bottom: 1px solid var(--ngidt-gray-800);
            vertical-align: top;
        }
        .tag-name {
            color: #9cdcfe;
            white-space: nowrap;
            width: 1%;
        }
        .tag-value { color: #ce9178; word-break: break-all; }
        .tag-value.missing { color: var(--ngidt-gray-500); font-style: italic; }
    `]
})
export class SeoComponent implements OnInit, OnDestroy {
    snapshot: SeoSnapshot | null = null;
    checks: SeoCheck[] = [];
    previewImage: string | null = null;
    previewImageFailed = false;
    previewTitle = '';
    previewDescription = '';
    previewDomain = '';

    private cdr = inject(ChangeDetectorRef);
    private ngZone = inject(NgZone);
    private pollInterval: any;
    private lastSerialized = '';

    ngOnInit(): void {
        this.refresh();

        // Re-read head tags every second (outside the zone) so navigations that
        // update Title/Meta show up without the user having to hit refresh.
        this.ngZone.runOutsideAngular(() => {
            this.pollInterval = setInterval(() => this.refresh(true), 1000);
        });
    }

    ngOnDestroy(): void {
        if (this.pollInterval) clearInterval(this.pollInterval);
    }

    refresh(fromPoll = false): void {
        const snap = this.collectSnapshot();
        const serialized = JSON.stringify(snap);
        if (fromPoll && serialized === this.lastSerialized) return; // nothing changed
        this.lastSerialized = serialized;

        const apply = () => {
            this.snapshot = snap;
            this.checks = this.buildChecks(snap);
            this.buildPreview(snap);
            this.cdr.detectChanges();
        };
        fromPoll ? this.ngZone.run(apply) : apply();
    }

    private meta(selector: string): string | null {
        const el = document.querySelector<HTMLMetaElement>(selector);
        const content = el?.getAttribute('content')?.trim();
        return content ? content : null;
    }

    private collectSnapshot(): SeoSnapshot {
        const metaByName = (name: string) => this.meta(`meta[name="${name}"]`);
        const metaByProp = (prop: string) => this.meta(`meta[property="${prop}"]`) ?? this.meta(`meta[name="${prop}"]`);

        const collectGroup = (known: string[], prefix: string): TagRow[] => {
            const rows: TagRow[] = known.map(name => ({ name, value: metaByProp(name) }));
            // Also surface any extra tags with the prefix that aren't in the known list
            const seen = new Set(known);
            document.querySelectorAll<HTMLMetaElement>(`meta[property^="${prefix}"], meta[name^="${prefix}"]`)
                .forEach(el => {
                    const name = el.getAttribute('property') ?? el.getAttribute('name') ?? '';
                    if (name && !seen.has(name)) {
                        seen.add(name);
                        rows.push({ name, value: el.getAttribute('content')?.trim() || null });
                    }
                });
            return rows;
        };

        return {
            title: document.title?.trim() || null,
            description: metaByName('description'),
            canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null,
            robots: metaByName('robots'),
            lang: document.documentElement.getAttribute('lang'),
            viewport: metaByName('viewport'),
            charset: document.querySelector<HTMLMetaElement>('meta[charset]')?.getAttribute('charset') ?? null,
            og: collectGroup(KNOWN_OG_TAGS, 'og:'),
            twitter: collectGroup(KNOWN_TWITTER_TAGS, 'twitter:'),
        };
    }

    private buildChecks(snap: SeoSnapshot): SeoCheck[] {
        const checks: SeoCheck[] = [];
        const ogValue = (name: string) => snap.og.find(t => t.name === name)?.value ?? null;

        if (!snap.title) {
            checks.push({ label: 'Title', status: 'fail', detail: 'Missing <title>' });
        } else if (snap.title.length < 10 || snap.title.length > 60) {
            checks.push({ label: 'Title', status: 'warn', detail: `${snap.title.length} chars — aim for 10–60` });
        } else {
            checks.push({ label: 'Title', status: 'ok', detail: `${snap.title.length} chars` });
        }

        if (!snap.description) {
            checks.push({ label: 'Description', status: 'fail', detail: 'Missing meta description' });
        } else if (snap.description.length < 50 || snap.description.length > 160) {
            checks.push({ label: 'Description', status: 'warn', detail: `${snap.description.length} chars — aim for 50–160` });
        } else {
            checks.push({ label: 'Description', status: 'ok', detail: `${snap.description.length} chars` });
        }

        checks.push(snap.canonical
            ? { label: 'Canonical URL', status: 'ok', detail: snap.canonical }
            : { label: 'Canonical URL', status: 'warn', detail: 'No <link rel="canonical">' });

        const missingOg = ['og:title', 'og:description', 'og:image', 'og:url'].filter(n => !ogValue(n));
        checks.push(missingOg.length === 0
            ? { label: 'Open Graph', status: 'ok', detail: 'Core tags present' }
            : { label: 'Open Graph', status: 'warn', detail: `Missing ${missingOg.join(', ')}` });

        const twitterCard = snap.twitter.find(t => t.name === 'twitter:card')?.value;
        checks.push(twitterCard
            ? { label: 'Twitter card', status: 'ok', detail: twitterCard }
            : { label: 'Twitter card', status: 'warn', detail: 'No twitter:card tag' });

        checks.push(snap.lang
            ? { label: 'Language', status: 'ok', detail: `lang="${snap.lang}"` }
            : { label: 'Language', status: 'warn', detail: 'No lang attribute on <html>' });

        checks.push(snap.viewport
            ? { label: 'Viewport', status: 'ok', detail: 'Present' }
            : { label: 'Viewport', status: 'warn', detail: 'No viewport meta — mobile rendering will suffer' });

        if (snap.robots && /noindex/i.test(snap.robots)) {
            checks.push({ label: 'Robots', status: 'warn', detail: 'Page is set to noindex' });
        }

        return checks;
    }

    private buildPreview(snap: SeoSnapshot): void {
        const ogValue = (name: string) => snap.og.find(t => t.name === name)?.value ?? null;

        const rawImage = ogValue('og:image');
        let resolvedImage: string | null = null;
        if (rawImage) {
            try {
                resolvedImage = new URL(rawImage, document.baseURI).href;
            } catch {
                resolvedImage = rawImage;
            }
        }
        if (resolvedImage !== this.previewImage) {
            this.previewImage = resolvedImage;
            this.previewImageFailed = false;
        }

        this.previewTitle = ogValue('og:title') ?? snap.title ?? '';
        this.previewDescription = ogValue('og:description') ?? snap.description ?? '';
        try {
            this.previewDomain = new URL(ogValue('og:url') ?? document.baseURI).hostname;
        } catch {
            this.previewDomain = location.hostname;
        }
    }
}
