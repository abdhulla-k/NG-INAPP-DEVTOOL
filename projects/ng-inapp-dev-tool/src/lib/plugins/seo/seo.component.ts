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

interface MissingTag {
    name: string;
    description: string;
}

interface SeoSnapshot {
    title: string | null;
    description: string | null;
    canonical: string | null;
    favicon: string | null;
    robots: string | null;
    lang: string | null;
    viewport: string | null;
    charset: string | null;
    og: TagRow[];
    twitter: TagRow[];
}

type Platform = 'twitter' | 'facebook' | 'linkedin' | 'telegram';

const KNOWN_OG_TAGS = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name'];
const KNOWN_TWITTER_TAGS = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:site'];

// What each tag is for — shown next to missing tags so fixing them doesn't
// require a trip to the docs. Wording follows Nuxt DevTools' Open Graph panel.
const TAG_DESCRIPTIONS: Record<string, string> = {
    'title': 'A concise and descriptive title for the browser tab that accurately summarizes the content of the page.',
    'description': 'A one to two sentence summary for search engines that includes relevant keywords to improve visibility in search results.',
    'icon': 'A small image that appears in the browser tab and bookmark menu to help users easily identify the page.',
    'lang': 'The primary language of the page to help search engines and browsers understand the content.',
    'canonical': 'The preferred URL for this page, so search engines don\'t treat URL variations as duplicate content.',
    'viewport': 'Controls how the page scales on mobile devices.',
    'og:title': 'A title for the link preview used by social media platforms.',
    'og:description': 'A description for the link preview used by social media platforms.',
    'og:image': 'The image shown in link previews. Recommended size is 1200×630.',
    'og:url': 'The canonical URL attached to the preview when the page is shared.',
    'og:type': 'The type of content, such as "website" or "article".',
    'og:site_name': 'The name of the overall site, shown alongside some link previews.',
    'twitter:card': 'The X/Twitter card style — usually "summary_large_image" for a big preview image.',
    'twitter:title': 'A title for X/Twitter previews. Falls back to og:title when absent.',
    'twitter:description': 'A description for X/Twitter previews. Falls back to og:description when absent.',
    'twitter:image': 'The preview image for X/Twitter. Falls back to og:image when absent.',
};

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
                <!-- Social share preview, per platform -->
                <div class="seo-section preview-section">
                    <div class="platform-tabs">
                        @for (p of platforms; track p.key) {
                            <button class="platform-tab" [class.active]="activePlatform === p.key" (click)="setPlatform(p.key)">{{ p.label }}</button>
                        }
                    </div>

                    <ng-template #cardImage>
                        @if (previewImage && !previewImageFailed) {
                            <img class="card-img" [src]="previewImage" alt="" (error)="previewImageFailed = true" />
                        } @else {
                            <div class="card-img placeholder">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                <span>No og:image</span>
                            </div>
                        }
                    </ng-template>

                    <div class="preview-stage">
                        @switch (activePlatform) {
                            @case ('twitter') {
                                <div class="card-tw">
                                    <div class="tw-media">
                                        <ng-container [ngTemplateOutlet]="cardImage" />
                                        <span class="tw-overlay">{{ previewTitle || 'Untitled page' }}</span>
                                    </div>
                                </div>
                                <div class="tw-from">From {{ previewDomain }}</div>
                            }
                            @case ('facebook') {
                                <div class="card-fb">
                                    <div class="fb-media"><ng-container [ngTemplateOutlet]="cardImage" /></div>
                                    <div class="fb-body">
                                        <div class="fb-domain">{{ previewDomain.toUpperCase() }}</div>
                                        <div class="fb-title">{{ previewTitle || 'Untitled page' }}</div>
                                        @if (previewDescription) { <div class="fb-desc">{{ previewDescription }}</div> }
                                    </div>
                                </div>
                            }
                            @case ('linkedin') {
                                <div class="card-li">
                                    <div class="li-media"><ng-container [ngTemplateOutlet]="cardImage" /></div>
                                    <div class="li-body">
                                        <div class="li-title">{{ previewTitle || 'Untitled page' }}</div>
                                        <div class="li-domain">{{ previewDomain }}</div>
                                    </div>
                                </div>
                            }
                            @case ('telegram') {
                                <div class="card-tg">
                                    <div class="tg-site">{{ previewSiteName || previewDomain }}</div>
                                    <div class="tg-title">{{ previewTitle || 'Untitled page' }}</div>
                                    @if (previewDescription) { <div class="tg-desc">{{ previewDescription }}</div> }
                                    <div class="tg-media"><ng-container [ngTemplateOutlet]="cardImage" /></div>
                                </div>
                            }
                        }
                    </div>
                </div>

                <!-- Missing tags -->
                <div class="seo-section">
                    <div class="missing-head">
                        <h4>Missing Tags</h4>
                        @if (missingTags.length > 0) {
                            <span class="missing-count">{{ missingTags.length }}</span>
                        }
                        <div class="view-tabs">
                            <button class="view-tab" [class.active]="missingView === 'tags'" (click)="setMissingView('tags')">Missing Tags</button>
                            <button class="view-tab" [class.active]="missingView === 'snippet'" (click)="setMissingView('snippet')" [disabled]="missingTags.length === 0">Code Snippet</button>
                        </div>
                    </div>

                    @if (missingTags.length === 0) {
                        <div class="all-present">✓ All recommended tags are present.</div>
                    } @else if (missingView === 'tags') {
                        <div class="missing-list">
                            @for (tag of missingTags; track tag.name) {
                                <div class="missing-row">
                                    <span class="missing-icon">!</span>
                                    <span class="missing-name">{{ tag.name }}</span>
                                    <span class="missing-desc">{{ tag.description }}</span>
                                </div>
                            }
                        </div>
                    } @else {
                        <div class="snippet-box">
                            <button class="copy-btn" (click)="copySnippet()">{{ copied ? 'Copied ✓' : 'Copy' }}</button>
                            <pre class="snippet"><code>{{ snippet }}</code></pre>
                        </div>
                    }
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
                            <tr><td class="tag-name">icon</td><td class="tag-value" [class.missing]="!snapshot?.favicon">{{ snapshot?.favicon || '—' }}</td></tr>
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

        /* Platform tabs */
        .platform-tabs {
            display: flex;
            gap: 2px;
            border-bottom: 1px solid var(--ngidt-gray-700);
            margin-bottom: 14px;
        }
        .platform-tab {
            background: transparent;
            border: none;
            border-bottom: 2px solid transparent;
            color: var(--ngidt-gray-400);
            font: inherit;
            font-size: 13px;
            padding: 6px 12px;
            cursor: pointer;
            margin-bottom: -1px;
        }
        .platform-tab:hover { color: white; }
        .platform-tab.active {
            color: white;
            border-bottom-color: var(--ngidt-pink, #ff41f8);
        }

        .preview-stage { max-width: 460px; }

        /* Shared preview image */
        .card-img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .card-img.placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 6px;
            color: var(--ngidt-gray-500);
            font-size: 12px;
            background: var(--ngidt-gray-800);
        }

        /* X / Twitter — large summary card, title overlaid on the image */
        .card-tw {
            border: 1px solid var(--ngidt-gray-700);
            border-radius: 16px;
            overflow: hidden;
        }
        .tw-media { position: relative; aspect-ratio: 1.91 / 1; background: var(--ngidt-gray-800); }
        .tw-overlay {
            position: absolute;
            left: 10px;
            bottom: 10px;
            max-width: calc(100% - 20px);
            background: rgba(0, 0, 0, 0.65);
            color: white;
            font-size: 13px;
            padding: 2px 8px;
            border-radius: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .tw-from { color: var(--ngidt-gray-500); font-size: 12px; margin-top: 6px; }

        /* Facebook — sharp corners, grey body bar, uppercase domain */
        .card-fb { border: 1px solid var(--ngidt-gray-700); overflow: hidden; }
        .fb-media { aspect-ratio: 1.91 / 1; background: var(--ngidt-gray-800); }
        .fb-body { background: #242526; padding: 10px 12px; }
        .fb-domain { color: #b0b3b8; font-size: 11px; letter-spacing: 0.3px; margin-bottom: 3px; }
        .fb-title { color: #e4e6eb; font-size: 15px; font-weight: 600; line-height: 1.3; }
        .fb-desc {
            color: #b0b3b8;
            font-size: 13px;
            margin-top: 3px;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        /* LinkedIn — compact body, bold title over muted domain */
        .card-li { border: 1px solid var(--ngidt-gray-700); border-radius: 2px; overflow: hidden; }
        .li-media { aspect-ratio: 1.91 / 1; background: var(--ngidt-gray-800); }
        .li-body { background: #1b1f23; padding: 10px 12px; }
        .li-title { color: #ffffff; font-size: 14px; font-weight: 600; line-height: 1.35; }
        .li-domain { color: #a8b4bd; font-size: 12px; margin-top: 4px; }

        /* Telegram — message-bubble quote style */
        .card-tg {
            background: #182533;
            border-left: 3px solid #6ab3f3;
            border-radius: 6px;
            padding: 8px 12px 10px;
        }
        .tg-site { color: #6ab3f3; font-size: 13px; font-weight: 600; margin-bottom: 2px; }
        .tg-title { color: #f5f5f5; font-size: 13px; font-weight: 600; line-height: 1.35; }
        .tg-desc {
            color: #aebacb;
            font-size: 13px;
            line-height: 1.4;
            margin-top: 2px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .tg-media { aspect-ratio: 1.91 / 1; border-radius: 6px; overflow: hidden; margin-top: 8px; background: var(--ngidt-gray-800); }

        /* Missing tags */
        .missing-head {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
        }
        .missing-head h4 { margin: 0; }
        .missing-count {
            background: rgba(251, 191, 36, 0.15);
            color: #fbbf24;
            font-size: 11px;
            font-weight: 600;
            padding: 1px 7px;
            border-radius: 999px;
        }
        .view-tabs { margin-left: auto; display: flex; gap: 2px; }
        .view-tab {
            background: transparent;
            border: 1px solid var(--ngidt-gray-700);
            color: var(--ngidt-gray-400);
            font: inherit;
            font-size: 11px;
            padding: 3px 10px;
            cursor: pointer;
        }
        .view-tab:first-child { border-radius: 6px 0 0 6px; }
        .view-tab:last-child { border-radius: 0 6px 6px 0; border-left: none; }
        .view-tab:hover:not(:disabled) { color: white; }
        .view-tab.active { color: white; background: var(--ngidt-gray-700); }
        .view-tab:disabled { opacity: 0.4; cursor: not-allowed; }

        .all-present { color: #4ade80; font-size: 13px; }

        .missing-list {
            border: 1px solid var(--ngidt-gray-700);
            border-radius: 8px;
            overflow: hidden;
        }
        .missing-row {
            display: flex;
            align-items: baseline;
            gap: 10px;
            padding: 9px 12px;
            font-size: 13px;
        }
        .missing-row + .missing-row { border-top: 1px solid var(--ngidt-gray-800); }
        .missing-icon {
            flex-shrink: 0;
            width: 15px;
            height: 15px;
            line-height: 15px;
            text-align: center;
            border-radius: 50%;
            border: 1px solid #fbbf24;
            color: #fbbf24;
            font-size: 10px;
            font-weight: 700;
            align-self: center;
        }
        .missing-name {
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 12px;
            color: #9cdcfe;
            white-space: nowrap;
            flex-shrink: 0;
        }
        .missing-desc { color: var(--ngidt-gray-400); font-size: 12px; line-height: 1.45; }

        /* Code snippet */
        .snippet-box {
            position: relative;
            border: 1px solid var(--ngidt-gray-700);
            border-radius: 8px;
            background: var(--ngidt-gray-800);
        }
        .copy-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            background: var(--ngidt-gray-700);
            border: none;
            color: var(--ngidt-gray-300);
            font: inherit;
            font-size: 11px;
            padding: 4px 10px;
            border-radius: 5px;
            cursor: pointer;
        }
        .copy-btn:hover { color: white; }
        .snippet {
            margin: 0;
            padding: 12px 14px;
            overflow-x: auto;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 12px;
            line-height: 1.6;
            color: #ce9178;
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
    missingTags: MissingTag[] = [];
    snippet = '';
    copied = false;
    previewImage: string | null = null;
    previewImageFailed = false;
    previewTitle = '';
    previewDescription = '';
    previewDomain = '';
    previewSiteName = '';

    platforms: { key: Platform; label: string }[] = [
        { key: 'twitter', label: 'Twitter' },
        { key: 'facebook', label: 'Facebook' },
        { key: 'linkedin', label: 'LinkedIn' },
        { key: 'telegram', label: 'Telegram' },
    ];
    activePlatform: Platform = 'twitter';
    missingView: 'tags' | 'snippet' = 'tags';

    private cdr = inject(ChangeDetectorRef);
    private ngZone = inject(NgZone);
    private pollInterval: any;
    private copiedTimer: any;
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
        if (this.copiedTimer) clearTimeout(this.copiedTimer);
    }

    setPlatform(p: Platform): void {
        this.activePlatform = p;
        this.cdr.detectChanges();
    }

    setMissingView(view: 'tags' | 'snippet'): void {
        this.missingView = view;
        this.cdr.detectChanges();
    }

    copySnippet(): void {
        navigator.clipboard?.writeText(this.snippet).then(() => {
            this.copied = true;
            this.cdr.detectChanges();
            if (this.copiedTimer) clearTimeout(this.copiedTimer);
            this.copiedTimer = setTimeout(() => {
                this.copied = false;
                this.cdr.detectChanges();
            }, 1500);
        });
    }

    refresh(fromPoll = false): void {
        const snap = this.collectSnapshot();
        const serialized = JSON.stringify(snap);
        if (fromPoll && serialized === this.lastSerialized) return; // nothing changed
        this.lastSerialized = serialized;

        const apply = () => {
            this.snapshot = snap;
            this.checks = this.buildChecks(snap);
            this.missingTags = this.buildMissingTags(snap);
            this.snippet = this.buildSnippet(snap, this.missingTags);
            if (this.missingTags.length === 0) this.missingView = 'tags';
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
            favicon: document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.getAttribute('href') ?? null,
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

    // Everything recommended that the page doesn't have, with an explanation.
    // twitter:title/description/image fall back to their og:* counterparts on
    // every major platform, so they only count as missing when the og:* tag is
    // missing too.
    private buildMissingTags(snap: SeoSnapshot): MissingTag[] {
        const ogValue = (name: string) => snap.og.find(t => t.name === name)?.value ?? null;
        const twValue = (name: string) => snap.twitter.find(t => t.name === name)?.value ?? null;

        const missing: string[] = [];
        if (!snap.title) missing.push('title');
        if (!snap.description) missing.push('description');
        if (!snap.favicon) missing.push('icon');
        if (!snap.lang) missing.push('lang');
        if (!snap.canonical) missing.push('canonical');
        if (!snap.viewport) missing.push('viewport');
        for (const tag of KNOWN_OG_TAGS) {
            if (!ogValue(tag)) missing.push(tag);
        }
        if (!twValue('twitter:card')) missing.push('twitter:card');
        for (const tag of ['twitter:title', 'twitter:description', 'twitter:image']) {
            if (!twValue(tag) && !ogValue(tag.replace('twitter:', 'og:'))) missing.push(tag);
        }

        return missing.map(name => ({ name, description: TAG_DESCRIPTIONS[name] ?? '' }));
    }

    // Ready-to-paste HTML for every missing tag, pre-filled from what the page
    // already has (og:title from <title>, og:url from the current URL, …).
    private buildSnippet(snap: SeoSnapshot, missing: MissingTag[]): string {
        if (missing.length === 0) return '';
        const names = new Set(missing.map(m => m.name));
        const title = snap.title ?? 'Page title';
        const description = snap.description ?? 'A short summary of this page.';
        const url = snap.canonical ?? location.href;
        const lines: string[] = [];

        if (names.has('lang')) lines.push(`<html lang="en">`);
        if (names.has('title')) lines.push(`<title>${title}</title>`);
        if (names.has('description')) lines.push(`<meta name="description" content="${description}">`);
        if (names.has('viewport')) lines.push(`<meta name="viewport" content="width=device-width, initial-scale=1">`);
        if (names.has('icon')) lines.push(`<link rel="icon" href="/favicon.ico">`);
        if (names.has('canonical')) lines.push(`<link rel="canonical" href="${url}">`);
        if (names.has('og:title')) lines.push(`<meta property="og:title" content="${title}">`);
        if (names.has('og:description')) lines.push(`<meta property="og:description" content="${description}">`);
        if (names.has('og:image')) lines.push(`<meta property="og:image" content="${new URL('/og-image.png', document.baseURI).href}">`);
        if (names.has('og:url')) lines.push(`<meta property="og:url" content="${url}">`);
        if (names.has('og:type')) lines.push(`<meta property="og:type" content="website">`);
        if (names.has('og:site_name')) lines.push(`<meta property="og:site_name" content="${location.hostname}">`);
        if (names.has('twitter:card')) lines.push(`<meta name="twitter:card" content="summary_large_image">`);
        if (names.has('twitter:title')) lines.push(`<meta name="twitter:title" content="${title}">`);
        if (names.has('twitter:description')) lines.push(`<meta name="twitter:description" content="${description}">`);
        if (names.has('twitter:image')) lines.push(`<meta name="twitter:image" content="${new URL('/og-image.png', document.baseURI).href}">`);

        return lines.join('\n');
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
        this.previewSiteName = ogValue('og:site_name') ?? '';
        try {
            this.previewDomain = new URL(ogValue('og:url') ?? document.baseURI).hostname;
        } catch {
            this.previewDomain = location.hostname;
        }
    }
}
