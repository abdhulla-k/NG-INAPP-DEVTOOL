import { Component, OnInit, OnDestroy, ChangeDetectorRef, EnvironmentInjector, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';

type StoreFlavor = 'ngrx' | 'ngxs' | null;

interface StateEntry {
    key: string;
    value: any;
}

@Component({
    selector: 'ng-devtool-state',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="state-layout">
            <div class="pane-header">
                <h3>State</h3>
                @if (flavor) {
                    <span class="flavor-badge">{{ flavor === 'ngrx' ? 'NgRx' : 'NGXS' }}</span>
                }
            </div>

            @if (!flavor) {
                <div class="empty-state">
                    <p>No state management library detected.</p>
                    <p class="hint">Supports NgRx and NGXS — the store is discovered automatically when the host app provides one.</p>
                </div>
            } @else {
                <div class="state-content">
                    <div class="state-section">
                        <h4>Store state</h4>
                        @if (rootEntries.length > 0) {
                            <div class="json-tree">
                                @for (entry of rootEntries; track entry.key) {
                                    <ng-container *ngTemplateOutlet="stateNodeTpl; context: { $implicit: entry, path: entry.key, depth: 0 }"></ng-container>
                                }
                            </div>
                        } @else {
                            <div class="empty-state">Store state is empty.</div>
                        }
                    </div>
                </div>
            }
        </div>

        <!-- Recursive state tree node -->
        <ng-template #stateNodeTpl let-entry let-path="path" let-depth="depth">
            <div class="node-row"
                 [class.expandable]="isExpandable(entry.value)"
                 [style.padding-left.px]="depth * 16 + 8"
                 (click)="isExpandable(entry.value) && toggleNode(path)">
                <span class="node-caret"
                      [class.invisible]="!isExpandable(entry.value)"
                      [class.expanded]="expandedPaths.has(path)">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </span>
                <span class="node-key">{{ entry.key }}</span>
                <span class="node-sep">:</span>
                <span class="node-value" [class]="valueClass(entry.value)">{{ preview(entry.value) }}</span>
            </div>
            @if (isExpandable(entry.value) && expandedPaths.has(path)) {
                @for (child of entries(entry.value); track child.key) {
                    <ng-container *ngTemplateOutlet="stateNodeTpl; context: { $implicit: child, path: path + '.' + child.key, depth: depth + 1 }"></ng-container>
                }
            }
        </ng-template>
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

        .state-layout { display: flex; flex-direction: column; height: 100%; }

        .pane-header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--ngidt-gray-700);
            display: flex;
            align-items: center;
            gap: 10px;
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
        .flavor-badge {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            color: var(--ngidt-vivid-pink);
            background: rgba(255, 65, 248, 0.12);
            padding: 2px 8px;
            border-radius: 4px;
        }

        .state-content { flex: 1; overflow: auto; padding: 16px; }

        .state-section h4 {
            margin: 0 0 10px 0;
            color: var(--ngidt-gray-400);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .json-tree {
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 13px;
        }
        .node-row {
            display: flex;
            align-items: center;
            padding-top: 3px;
            padding-bottom: 3px;
            border-radius: 4px;
            white-space: nowrap;
        }
        .node-row.expandable { cursor: pointer; user-select: none; }
        .node-row.expandable:hover { background: var(--ngidt-gray-800); }
        .node-caret {
            width: 14px;
            height: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-right: 4px;
            color: var(--ngidt-gray-400);
            transition: transform 0.15s ease;
            flex-shrink: 0;
        }
        .node-caret.expanded { transform: rotate(90deg); }
        .node-caret.invisible { visibility: hidden; }
        .node-caret svg { width: 11px; height: 11px; }
        .node-key { color: #9cdcfe; }
        .node-sep { color: var(--ngidt-gray-500); margin: 0 6px 0 2px; }
        .node-value.string { color: #ce9178; }
        .node-value.number { color: #b5cea8; }
        .node-value.boolean { color: #569cd6; }
        .node-value.object { color: var(--ngidt-gray-400); }
        .node-value.undefined { color: #569cd6; font-style: italic; }

        .empty-state {
            color: var(--ngidt-gray-500);
            padding: 24px 20px;
            text-align: center;
            font-size: 14px;
        }
        .empty-state p { margin: 0 0 8px; }
        .empty-state .hint { font-size: 12px; }
    `]
})
export class StateComponent implements OnInit, OnDestroy {
    flavor: StoreFlavor = null;
    rootEntries: StateEntry[] = [];
    expandedPaths = new Set<string>();

    private cdr = inject(ChangeDetectorRef);
    private ngZone = inject(NgZone);
    private envInjector = inject(EnvironmentInjector);

    private store: any = null;
    private storeSub: any = null;
    private latestState: any = undefined;
    private renderedState: any = undefined;
    private pollInterval: any;

    ngOnInit(): void {
        this.detectStore();

        if (!this.flavor) return;

        if (this.flavor === 'ngrx') {
            // NgRx Store is BehaviorSubject-like: emits the current state synchronously
            // on subscribe and on every action after that.
            this.storeSub = this.store.subscribe((s: any) => { this.latestState = s; });
        }

        // Immutable stores swap the root object identity on every change, so a
        // cheap reference check is enough to know when to re-render.
        this.ngZone.runOutsideAngular(() => {
            this.pollInterval = setInterval(() => {
                const current = this.flavor === 'ngxs' ? this.safeSnapshot() : this.latestState;
                if (current !== this.renderedState) {
                    this.ngZone.run(() => this.applyState(current));
                }
            }, 500);
        });

        // First paint
        this.applyState(this.flavor === 'ngxs' ? this.safeSnapshot() : this.latestState);
    }

    ngOnDestroy(): void {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.storeSub?.unsubscribe?.();
    }

    // The host app's env injector holds provider records keyed by token. We look
    // for a class token literally named "Store" and duck-type which library it
    // is — this keeps NgRx/NGXS out of our dependency tree entirely.
    private detectStore(): void {
        const records: Map<any, any> | undefined = (this.envInjector as any)?.records;
        if (!records) return;

        for (const token of records.keys()) {
            if (typeof token !== 'function' || token.name !== 'Store') continue;
            try {
                const store = this.envInjector.get(token as any);
                if (!store || typeof store.dispatch !== 'function') continue;
                if (typeof store.snapshot === 'function') {
                    this.flavor = 'ngxs';
                    this.store = store;
                    return;
                }
                if (typeof store.subscribe === 'function' && typeof store.select === 'function') {
                    this.flavor = 'ngrx';
                    this.store = store;
                    return;
                }
            } catch {
                // Token resolution failed — keep scanning
            }
        }
    }

    private safeSnapshot(): any {
        try {
            return this.store.snapshot();
        } catch {
            return this.renderedState;
        }
    }

    private applyState(state: any): void {
        this.renderedState = state;
        this.rootEntries = this.entries(state);
        this.cdr.detectChanges();
    }

    toggleNode(path: string): void {
        if (this.expandedPaths.has(path)) {
            this.expandedPaths.delete(path);
        } else {
            this.expandedPaths.add(path);
        }
        this.cdr.detectChanges();
    }

    isExpandable(value: any): boolean {
        return value !== null && typeof value === 'object';
    }

    entries(value: any): StateEntry[] {
        if (value === null || typeof value !== 'object') return [];
        try {
            return Object.entries(value).map(([key, v]) => ({ key, value: v }));
        } catch {
            return [];
        }
    }

    valueClass(value: any): string {
        if (value === undefined) return 'undefined';
        if (value === null) return 'object';
        const t = typeof value;
        return t === 'string' || t === 'number' || t === 'boolean' ? t : 'object';
    }

    preview(value: any): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `"${value}"`;
        if (typeof value === 'function') return 'function() { ... }';
        if (Array.isArray(value)) return `Array(${value.length})`;
        if (typeof value === 'object') {
            const count = Object.keys(value).length;
            return `{ ${count} ${count === 1 ? 'key' : 'keys'} }`;
        }
        return String(value);
    }
}
