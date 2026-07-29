import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular's ProfilerEvent values (stable numeric contract of ng.ɵsetProfiler).
const TEMPLATE_UPDATE_START = 2;
const TEMPLATE_UPDATE_END = 3;
const CHANGE_DETECTION_START = 12;
const CHANGE_DETECTION_END = 13;

interface ComponentStat {
    name: string;
    updates: number;
    totalMs: number;
    maxMs: number;
}

// The dev tool's own components — excluded from stats, otherwise the profiler
// panel's 500ms refresh would dominate its own measurements.
const OWN_COMPONENTS = new Set([
    'DevToolShellComponent',
    'InspectorOverlayComponent',
    'OverviewComponent',
    'ComponentsComponent',
    'RoutesComponent',
    'AssetsComponent',
    'SeoComponent',
    'ProfilerComponent',
    'StateComponent',
]);

// Angular-internal embedded-view context classes (@for repeaters, *ngIf, etc.).
// Their template updates belong to the declaring component, so a standalone row
// for them is noise.
const INTERNAL_CONTEXTS = new Set([
    'RepeaterContext',
    'NgIfContext',
    'NgForOfContext',
    'NgTemplateOutletContext',
    'Object',
]);

// Dev-server bundles rename classes to `_LandingComponent`; strip the prefix so
// exclusion matching and display both see the real class name.
function normalizeName(raw: string | undefined): string | undefined {
    return raw ? raw.replace(/^_+/, '') : raw;
}

@Component({
    selector: 'ng-devtool-profiler',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="profiler-layout">
            <div class="pane-header">
                <h3>Change Detection Profiler</h3>
                <div class="header-actions">
                    <button class="action-btn" (click)="clear()" [disabled]="!hasData()" title="Clear collected data">Clear</button>
                    <button class="action-btn record" [class.recording]="recording" (click)="toggleRecording()">
                        <span class="record-dot"></span>
                        {{ recording ? 'Stop' : 'Record' }}
                    </button>
                </div>
            </div>

            @if (!profilerAvailable) {
                <div class="empty-state">
                    Angular's profiler hook (ng.ɵsetProfiler) is not available in this build.
                </div>
            } @else {
                <div class="profiler-content">
                    <!-- Summary cards -->
                    <div class="summary-grid">
                        <div class="summary-card">
                            <div class="summary-value">{{ cdCount }}</div>
                            <div class="summary-label">CD cycles</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-value">{{ avgCdMs() }}<span class="unit">ms</span></div>
                            <div class="summary-label">avg cycle</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-value">{{ totalUpdates }}</div>
                            <div class="summary-label">template updates</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-value">{{ elapsedSeconds() }}<span class="unit">s</span></div>
                            <div class="summary-label">recorded</div>
                        </div>
                    </div>

                    @if (rows.length > 0) {
                        <table class="stats-table">
                            <thead>
                                <tr>
                                    <th class="col-name">Component</th>
                                    <th (click)="setSort('updates')" [class.sorted]="sortBy === 'updates'">Updates</th>
                                    <th (click)="setSort('totalMs')" [class.sorted]="sortBy === 'totalMs'">Total</th>
                                    <th>Avg</th>
                                    <th>Max</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (row of rows; track row.name) {
                                    <tr [class.hot]="row.updates > 0 && row.totalMs / row.updates > 4">
                                        <td class="col-name">{{ row.name }}</td>
                                        <td>{{ row.updates }}</td>
                                        <td>{{ row.totalMs.toFixed(1) }}ms</td>
                                        <td>{{ (row.totalMs / row.updates).toFixed(2) }}ms</td>
                                        <td>{{ row.maxMs.toFixed(2) }}ms</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                        <p class="hint">Rows highlighted red average &gt; 4ms per template update. Interact with your app while recording.</p>
                    } @else {
                        <div class="empty-state">
                            {{ recording ? 'Recording… interact with your app to collect data.' : 'Press Record, then interact with your app.' }}
                        </div>
                    }
                </div>
            }
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

        .profiler-layout { display: flex; flex-direction: column; height: 100%; }

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
        .header-actions { display: flex; gap: 8px; }

        .action-btn {
            background: transparent;
            border: 1px solid var(--ngidt-gray-700);
            color: #cbd5e1;
            cursor: pointer;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .action-btn:hover:not(:disabled) { color: white; background: var(--ngidt-gray-700); }
        .action-btn:disabled { opacity: 0.4; cursor: default; }

        .record-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--ngidt-gray-400);
        }
        .action-btn.recording { border-color: #f87171; color: #f87171; }
        .action-btn.recording .record-dot {
            background: #f87171;
            animation: ngidt-pulse 1.2s ease-in-out infinite;
        }
        @keyframes ngidt-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        .profiler-content { flex: 1; overflow: auto; padding: 16px; }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
            gap: 10px;
            margin-bottom: 20px;
        }
        .summary-card {
            background: var(--ngidt-gray-800);
            border: 1px solid var(--ngidt-gray-700);
            border-radius: 8px;
            padding: 12px;
            text-align: center;
        }
        .summary-value {
            font-size: 20px;
            font-weight: 600;
            color: white;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }
        .summary-value .unit { font-size: 12px; color: var(--ngidt-gray-400); margin-left: 2px; }
        .summary-label {
            font-size: 11px;
            color: var(--ngidt-gray-400);
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-top: 4px;
        }

        .stats-table {
            width: 100%;
            border-collapse: collapse;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 12px;
        }
        .stats-table th {
            text-align: right;
            padding: 6px 10px;
            color: var(--ngidt-gray-400);
            font-weight: 500;
            border-bottom: 1px solid var(--ngidt-gray-700);
            cursor: pointer;
            user-select: none;
            white-space: nowrap;
        }
        .stats-table th.col-name { text-align: left; cursor: default; }
        .stats-table th.sorted { color: var(--ngidt-vivid-pink); }
        .stats-table td {
            text-align: right;
            padding: 5px 10px;
            border-bottom: 1px solid var(--ngidt-gray-800);
            color: var(--ngidt-gray-300);
            white-space: nowrap;
        }
        .stats-table td.col-name { text-align: left; color: #4ade80; }
        .stats-table tr.hot td { background: rgba(248, 113, 113, 0.08); }
        .stats-table tr.hot td.col-name { color: #f87171; }

        .hint {
            margin-top: 12px;
            font-size: 12px;
            color: var(--ngidt-gray-500);
        }

        .empty-state {
            color: var(--ngidt-gray-500);
            padding: 32px 20px;
            text-align: center;
            font-size: 14px;
        }
    `]
})
export class ProfilerComponent implements OnInit, OnDestroy {
    recording = false;
    profilerAvailable = true;
    rows: ComponentStat[] = [];
    totalUpdates = 0;
    cdCount = 0;
    cdTotalMs = 0;
    sortBy: 'updates' | 'totalMs' = 'totalMs';

    private cdr = inject(ChangeDetectorRef);
    private ngZone = inject(NgZone);

    // Raw collection state — mutated from the profiler callback, which fires on
    // every template update. Keep the callback allocation-light and O(1).
    private stats = new Map<string, ComponentStat>();
    private startStamps = new Map<object, number>();
    private cdStartStamp = 0;
    private recordingMs = 0;
    private recordingStartedAt = 0;
    private uiInterval: any;

    ngOnInit(): void {
        this.profilerAvailable = typeof (window as any).ng?.ɵsetProfiler === 'function';
    }

    ngOnDestroy(): void {
        if (this.recording) this.stopRecording();
    }

    toggleRecording(): void {
        this.recording ? this.stopRecording() : this.startRecording();
    }

    hasData(): boolean {
        return this.totalUpdates > 0 || this.cdCount > 0;
    }

    avgCdMs(): string {
        return this.cdCount === 0 ? '0.0' : (this.cdTotalMs / this.cdCount).toFixed(1);
    }

    elapsedSeconds(): string {
        const ms = this.recordingMs + (this.recording ? performance.now() - this.recordingStartedAt : 0);
        return (ms / 1000).toFixed(1);
    }

    setSort(key: 'updates' | 'totalMs'): void {
        this.sortBy = key;
        this.syncRows();
        this.cdr.detectChanges();
    }

    clear(): void {
        this.stats.clear();
        this.startStamps.clear();
        this.totalUpdates = 0;
        this.cdCount = 0;
        this.cdTotalMs = 0;
        this.recordingMs = 0;
        this.recordingStartedAt = performance.now();
        this.rows = [];
        this.cdr.detectChanges();
    }

    private startRecording(): void {
        const ng = (window as any).ng;
        if (typeof ng?.ɵsetProfiler !== 'function') {
            this.profilerAvailable = false;
            return;
        }

        // NOTE: only one profiler can be registered at a time — this replaces
        // any previously set one (e.g. the Angular DevTools extension's) until Stop.
        ng.ɵsetProfiler(this.profilerCallback);

        this.recording = true;
        this.recordingStartedAt = performance.now();

        // Refresh the table twice a second while recording. Must stay fully
        // outside the zone: entering it (ngZone.run) triggers a host-app tick,
        // which the profiler would then measure — self-inflicted CD cycles on
        // an idle app. The panel is a detached view, so detectChanges() alone
        // refreshes it.
        this.ngZone.runOutsideAngular(() => {
            this.uiInterval = setInterval(() => {
                this.syncRows();
                this.cdr.detectChanges();
            }, 500);
        });
        this.cdr.detectChanges();
    }

    private stopRecording(): void {
        try {
            (window as any).ng?.ɵsetProfiler?.(null);
        } catch {
            // nothing to clean up if the hook vanished
        }
        if (this.uiInterval) {
            clearInterval(this.uiInterval);
            this.uiInterval = null;
        }
        this.recordingMs += performance.now() - this.recordingStartedAt;
        this.recording = false;
        this.startStamps.clear();
        this.syncRows();
        this.cdr.detectChanges();
    }

    // Bound once so start/stop always reference the same function identity.
    private profilerCallback = (event: number, instance: any): void => {
        switch (event) {
            case TEMPLATE_UPDATE_START:
                if (instance && typeof instance === 'object') {
                    this.startStamps.set(instance, performance.now());
                }
                break;
            case TEMPLATE_UPDATE_END: {
                if (!instance || typeof instance !== 'object') break;
                const start = this.startStamps.get(instance);
                if (start === undefined) break;
                this.startStamps.delete(instance);

                const name = normalizeName(instance.constructor?.name);
                if (!name || OWN_COMPONENTS.has(name) || INTERNAL_CONTEXTS.has(name)) break;

                const duration = performance.now() - start;
                let stat = this.stats.get(name);
                if (!stat) {
                    stat = { name, updates: 0, totalMs: 0, maxMs: 0 };
                    this.stats.set(name, stat);
                }
                stat.updates++;
                stat.totalMs += duration;
                if (duration > stat.maxMs) stat.maxMs = duration;
                this.totalUpdates++;
                break;
            }
            case CHANGE_DETECTION_START:
                this.cdStartStamp = performance.now();
                break;
            case CHANGE_DETECTION_END:
                if (this.cdStartStamp > 0) {
                    this.cdCount++;
                    this.cdTotalMs += performance.now() - this.cdStartStamp;
                    this.cdStartStamp = 0;
                }
                break;
        }
    };

    private syncRows(): void {
        const sorted = [...this.stats.values()].sort((a, b) =>
            this.sortBy === 'updates' ? b.updates - a.updates : b.totalMs - a.totalMs);
        this.rows = sorted;
    }
}
