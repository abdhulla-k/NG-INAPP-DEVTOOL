import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, inject, NgZone, isSignal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NG_INAPP_DEV_TOOL_CONFIG, DevToolConfig } from '../../config.token';

export interface ComponentTreeNode {
    id: string; // Unique ID (e.g. random string or index path)
    name: string; // Component class name
    element: HTMLElement;
    instance: any; // The raw angular component instance
    children: ComponentTreeNode[];
    expanded: boolean;
}

interface StateEntry {
    key: string;
    value: any;
    isSignal: boolean;
    // Primitive value backed by a plain property or a writable signal — can be edited inline.
    editable: boolean;
    // Classified from ɵcmp.inputs / ɵcmp.outputs metadata (dev builds only).
    kind: 'input' | 'output' | 'state';
}

@Component({
    selector: 'ng-devtool-components',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="components-layout">
            <!-- Left Pane: Component Tree -->
            <div class="tree-pane">
                <div class="pane-header">
                    <h3>Component Tree</h3>
                    <button class="refresh-btn" (click)="refreshTree()" title="Refresh Tree">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                    </button>
                </div>
                <div class="tree-container">
                    @for (node of treeNodes; track node.id) {
                        <ng-container *ngTemplateOutlet="treeNodeTpl; context: { $implicit: node }"></ng-container>
                    }
                    @if (treeNodes.length === 0) {
                        <div class="empty-state">No components found.</div>
                    }
                </div>
            </div>

            <!-- Right Pane: State Inspection -->
            <div class="state-pane">
                <div class="pane-header">
                    <h3>{{ selectedNode ? '<' + selectedNode.name + '>' : 'Select a component' }}</h3>
                    @if (selectedNode && canOpenInEditor()) {
                        <button class="open-btn" (click)="openSelectedInEditor()" title="Open source file in editor">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            Open
                        </button>
                    }
                </div>
                <div class="state-container">
                    @if (selectedNode) {
                        @if (inputEntries.length > 0) {
                            <div class="state-section">
                                <h4>Inputs</h4>
                                <div class="state-list">
                                    @for (entry of inputEntries; track entry.key) {
                                        <ng-container *ngTemplateOutlet="stateRowTpl; context: { $implicit: entry }"></ng-container>
                                    }
                                </div>
                            </div>
                        }
                        @if (outputEntries.length > 0) {
                            <div class="state-section">
                                <h4>Outputs</h4>
                                <div class="state-list">
                                    @for (entry of outputEntries; track entry.key) {
                                        <ng-container *ngTemplateOutlet="stateRowTpl; context: { $implicit: entry }"></ng-container>
                                    }
                                </div>
                            </div>
                        }
                        <div class="state-section">
                            <h4>State</h4>
                            @if (stateEntries.length > 0) {
                                <div class="state-list">
                                    @for (entry of stateEntries; track entry.key) {
                                        <ng-container *ngTemplateOutlet="stateRowTpl; context: { $implicit: entry }"></ng-container>
                                    }
                                </div>
                            } @else {
                                <div class="empty-state">No public state found.</div>
                            }
                        </div>
                    } @else {
                        <div class="empty-state">Click on a component in the tree to inspect its state.</div>
                    }
                </div>
            </div>
        </div>

        <!-- Shared State Row Template -->
        <ng-template #stateRowTpl let-entry>
            <div class="state-row">
                <span class="state-key">{{ entry.key }}</span>
                @if (entry.kind === 'input') {
                    <span class="signal-tag input-tag" title="Component @Input / input()">input</span>
                }
                @if (entry.kind === 'output') {
                    <span class="signal-tag output-tag" title="Component @Output / output()">output</span>
                }
                @if (entry.isSignal) {
                    <span class="signal-tag" title="Reactive signal">signal</span>
                }
                <span class="state-separator">:</span>
                @if (entry.editable && getValueType(entry.value) === 'boolean') {
                    <input type="checkbox"
                           class="state-checkbox"
                           [checked]="entry.value"
                           (change)="commitEdit(entry, $event)" />
                    <span class="state-value boolean">{{ entry.value }}</span>
                } @else if (entry.editable && editingKey === entry.key) {
                    <input type="text"
                           class="state-edit-input"
                           [class.number]="getValueType(entry.value) === 'number'"
                           [value]="editDraft"
                           (keydown.enter)="commitEdit(entry, $event)"
                           (keydown.escape)="cancelEdit()"
                           (blur)="commitEdit(entry, $event)" />
                } @else if (entry.editable) {
                    <span class="state-value editable"
                          [class]="getValueType(entry.value)"
                          title="Click to edit"
                          (click)="startEdit(entry)">
                        {{ formatValue(entry.value) }}
                    </span>
                } @else {
                    <span class="state-value" [class]="getValueType(entry.value)">
                        {{ formatValue(entry.value) }}
                    </span>
                }
            </div>
        </ng-template>

        <!-- Recursive Tree Node Template -->
        <ng-template #treeNodeTpl let-node>
            <div class="tree-node" [class.selected]="selectedNode === node">
                <div class="node-content"
                     [style.padding-left.px]="(getDepth(node) * 16) + 8"
                     (click)="selectNode(node)"
                     (mouseenter)="highlight(node.element)"
                     (mouseleave)="clearHighlight()">
                    <!-- Expand/Collapse Caret -->
                    <span class="caret" 
                          [class.invisible]="!node.children.length"
                          [class.expanded]="node.expanded"
                          (click)="toggleExpand($event, node)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </span>
                    <!-- Node Label -->
                    <span class="node-bracket">&lt;</span>
                    <span class="node-name">{{ node.name }}</span>
                    <span class="node-bracket">&gt;</span>
                </div>
            </div>
            <!-- Children -->
            @if (node.expanded && node.children.length > 0) {
                @for (child of node.children; track child.id) {
                    <ng-container *ngTemplateOutlet="treeNodeTpl; context: { $implicit: child }"></ng-container>
                }
            }
        </ng-template>
    `,
    styles: [`
        /* Component specific styles */
        :host {
            display: flex;
            height: 100%;
            width: 100%;
            font-family: 'Inter', sans-serif;
            color: var(--ngidt-gray-300);
            background: var(--ngidt-gray-900);
            overflow: hidden;
        }

        .components-layout {
            display: flex;
            width: 100%;
            height: 100%;
        }

        /* Tree Pane */
        .tree-pane {
            width: 50%;
            border-right: 1px solid var(--ngidt-gray-700);
            display: flex;
            flex-direction: column;
            background: var(--ngidt-gray-900);
        }

        .pane-header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--ngidt-gray-700);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--ngidt-gray-800);
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
        .refresh-btn:hover {
            color: white;
            background: var(--ngidt-gray-700);
        }
        .refresh-btn .icon {
            width: 16px;
            height: 16px;
        }

        .tree-container {
            flex: 1;
            overflow: auto;
            padding: 8px 0;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 13px;
        }

        /* Tree Node */
        .tree-node {
            display: flex;
            flex-direction: column;
        }

        .node-content {
            display: flex;
            align-items: center;
            padding: 4px 8px;
            cursor: pointer;
            border-radius: 4px;
            margin: 1px 8px;
            user-select: none;
        }
        
        .node-content:hover {
            background: var(--ngidt-gray-800);
        }

        .tree-node.selected > .node-content {
            background: rgba(255, 65, 248, 0.15);
            color: var(--ngidt-vivid-pink);
        }

        .caret {
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 4px;
            color: var(--ngidt-gray-400);
            transition: transform 0.15s ease;
            border-radius: 4px;
        }
        .caret:hover {
            background: var(--ngidt-gray-700);
            color: white;
        }
        .caret.expanded {
            transform: rotate(90deg);
        }
        .caret.invisible {
            visibility: hidden;
        }
        .caret svg {
            width: 12px;
            height: 12px;
        }

        .node-bracket {
            color: var(--ngidt-gray-500);
            margin: 0 2px;
        }
        .tree-node.selected .node-bracket {
            color: rgba(255, 65, 248, 0.7);
        }
        .node-name {
            color: #4ade80; /* Nuxt green for components, or vivid-pink */
        }
        .tree-node.selected .node-name {
            color: var(--ngidt-vivid-pink);
            font-weight: 500;
        }

        /* State Pane */
        .state-pane {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: var(--ngidt-gray-900);
            overflow: hidden;
        }

        .state-container {
            flex: 1;
            overflow: auto;
            padding: 16px;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 13px;
        }

        .state-section h4 {
            margin: 0 0 12px 0;
            color: var(--ngidt-gray-400);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .state-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .state-row {
            display: flex;
            align-items: flex-start;
            word-break: break-all;
        }

        .state-key {
            color: #9cdcfe; /* VS Code light blue for properties */
            margin-right: 2px;
        }
        .signal-tag {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            color: #a78bfa;
            background: rgba(168, 139, 250, 0.15);
            padding: 1px 5px;
            border-radius: 3px;
            margin-right: 6px;
            font-family: 'Inter', sans-serif;
            font-weight: 600;
        }
        .signal-tag.input-tag {
            color: #4ade80;
            background: rgba(74, 222, 128, 0.12);
        }
        .signal-tag.output-tag {
            color: #fbbf24;
            background: rgba(251, 191, 36, 0.12);
        }
        .state-section + .state-section {
            margin-top: 20px;
        }
        .open-btn {
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
        .open-btn:hover {
            color: white;
            background: var(--ngidt-gray-700);
        }
        .open-btn svg { width: 14px; height: 14px; }
        .state-separator {
            color: var(--ngidt-gray-500);
            margin-right: 6px;
        }
        
        .state-value.editable { cursor: pointer; border-radius: 3px; padding: 0 3px; margin: 0 -3px; }
        .state-value.editable:hover { background: var(--ngidt-gray-700); box-shadow: 0 0 0 1px var(--ngidt-gray-600, #4b5563); }

        .state-edit-input {
            background: var(--ngidt-gray-800);
            border: 1px solid var(--ngidt-vivid-pink);
            border-radius: 3px;
            color: #ce9178;
            font-family: inherit;
            font-size: inherit;
            padding: 0 4px;
            min-width: 60px;
            max-width: 100%;
            outline: none;
        }
        .state-edit-input.number { color: #b5cea8; }

        .state-checkbox {
            accent-color: var(--ngidt-vivid-pink);
            margin: 2px 6px 0 0;
            cursor: pointer;
        }

        .state-value.string { color: #ce9178; } /* Orange/Brown */
        .state-value.number { color: #b5cea8; } /* Light green */
        .state-value.boolean { color: #569cd6; } /* Blue */
        .state-value.object { color: var(--ngidt-gray-300); }
        .state-value.function { color: #dcdcaa; font-style: italic; } /* Yellow */
        .state-value.undefined { color: #569cd6; font-style: italic; }

        .empty-state {
            color: var(--ngidt-gray-500);
            padding: 20px;
            text-align: center;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
        }
    `]
})
export class ComponentsComponent implements OnInit, OnDestroy {
    treeNodes: ComponentTreeNode[] = [];
    selectedNode: ComponentTreeNode | null = null;
    selectedNodeStateEntries: StateEntry[] = [];
    inputEntries: StateEntry[] = [];
    outputEntries: StateEntry[] = [];
    stateEntries: StateEntry[] = [];

    // Inline-edit state. While editingKey is set, polling skips state refreshes
    // so the re-render doesn't blow away the input mid-edit.
    editingKey: string | null = null;
    editDraft = '';

    private cdr = inject(ChangeDetectorRef);
    private host = inject<ElementRef<HTMLElement>>(ElementRef);
    private ngZone = inject(NgZone);
    private config = inject<DevToolConfig>(NG_INAPP_DEV_TOOL_CONFIG, { optional: true });
    private pollInterval: any;
    private idCounter = 0;

    // Store depth map for fast indentation styling
    private depthMap = new Map<string, number>();

    // Hover-highlight state — restored on leave
    private highlightEl: HTMLElement | null = null;
    private prevOutline = '';
    private prevOutlineOffset = '';

    ngOnInit() {
        this.refreshTree();
        
        // Start polling for state updates (run outside angular to avoid excessive CD)
        this.ngZone.runOutsideAngular(() => {
            this.pollInterval = setInterval(() => {
                if (this.selectedNode && this.selectedNode.instance && this.editingKey === null) {
                    this.updateSelectedNodeState();
                }
            }, 500);
        });
    }

    ngOnDestroy() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        this.clearHighlight();
    }

    refreshTree() {
        const rootElements = Array.from(document.body.children);
        this.treeNodes = [];
        this.depthMap.clear();
        this.idCounter = 0;
        
        // Find all root level Angular components (usually just <app-root>)
        for (const el of rootElements) {
            const nodes = this.extractTree(el as HTMLElement, 0);
            this.treeNodes.push(...nodes);
        }
        
        // If we still have the selected node, try to re-find it in the new tree
        if (this.selectedNode) {
            const found = this.findNodeByInstance(this.treeNodes, this.selectedNode.instance);
            if (found) {
                this.selectedNode = found;
                this.updateSelectedNodeState();
            } else {
                this.selectedNode = null;
                this.selectedNodeStateEntries = [];
                this.inputEntries = [];
                this.outputEntries = [];
                this.stateEntries = [];
            }
        }

        this.cdr.detectChanges();
    }

    private extractTree(element: HTMLElement, depth: number): ComponentTreeNode[] {
        if (!element || !element.tagName) return [];
        
        const nodes: ComponentTreeNode[] = [];
        const ngDebug = (window as any).ng;
        
        if (!ngDebug) return [];

        let currentComponentNode: ComponentTreeNode | null = null;
        
        // Only consider it a component if it has an instance
        const compInstance = ngDebug.getComponent(element);
        
        // Avoid traversing into our own devtool elements to prevent infinite loops or clutter
        if (element.tagName.toLowerCase().includes('ng-inapp-dev-tool')) return [];
        
        if (compInstance) {
            const id = 'node_' + (this.idCounter++);
            currentComponentNode = {
                id,
                name: compInstance.constructor.name,
                element,
                instance: compInstance,
                children: [],
                expanded: true // expanded by default
            };
            this.depthMap.set(id, depth);
            nodes.push(currentComponentNode);
        }

        // Recursively check children
        const children = Array.from(element.children);
        for (const child of children) {
            const childNodes = this.extractTree(child as HTMLElement, currentComponentNode ? depth + 1 : depth);
            if (currentComponentNode) {
                currentComponentNode.children.push(...childNodes);
            } else {
                nodes.push(...childNodes);
            }
        }

        return nodes;
    }

    getDepth(node: ComponentTreeNode): number {
        return this.depthMap.get(node.id) || 0;
    }

    toggleExpand(event: Event, node: ComponentTreeNode) {
        event.stopPropagation();
        node.expanded = !node.expanded;
    }

    selectNode(node: ComponentTreeNode) {
        this.selectedNode = node;
        this.editingKey = null;
        this.updateSelectedNodeState();
    }

    // Property names that back the component's inputs/outputs, read from the
    // dev-mode component def. Handles both metadata shapes: plain
    // publicName -> propName strings and [flags, propName, transform] arrays.
    private getIoPropertyNames(instance: any): { inputs: Set<string>; outputs: Set<string> } {
        const inputs = new Set<string>();
        const outputs = new Set<string>();
        const def = (instance?.constructor as any)?.ɵcmp;
        try {
            for (const publicName of Object.keys(def?.inputs ?? {})) {
                const v = def.inputs[publicName];
                const prop = typeof v === 'string' ? v : (Array.isArray(v) ? v.find((x: any) => typeof x === 'string') : undefined);
                if (prop) inputs.add(prop);
            }
            for (const publicName of Object.keys(def?.outputs ?? {})) {
                const v = def.outputs[publicName];
                if (typeof v === 'string') outputs.add(v);
            }
        } catch {
            // Malformed/unknown def shape — treat everything as plain state.
        }
        return { inputs, outputs };
    }

    private updateSelectedNodeState() {
        if (!this.selectedNode) return;

        const instance = this.selectedNode.instance;
        const entries: StateEntry[] = [];
        const io = this.getIoPropertyNames(instance);

        // Extract public properties (skip private/angular internal)
        try {
            for (const key in instance) {
                // Ignore Angular internals and private convention
                if (key.startsWith('_')) continue;
                if (key === 'constructor') continue;

                let value = instance[key];
                let isSig = false;
                let writableSig = false;
                if (isSignal(value)) {
                    writableSig = typeof (value as any).set === 'function';
                    // Read the current value. Safe outside any reactive context — no graph dependency is created.
                    try {
                        value = (value as () => unknown)();
                        isSig = true;
                    } catch {
                        // signal threw on read — leave the raw reference so the user at least sees something
                    }
                }

                const t = typeof value;
                const isPrimitive = t === 'string' || t === 'number' || t === 'boolean';
                const editable = isPrimitive && (!isSig || writableSig);
                const kind: StateEntry['kind'] =
                    io.inputs.has(key) ? 'input' : (io.outputs.has(key) ? 'output' : 'state');

                entries.push({ key, value, isSignal: isSig, editable, kind });
            }
        } catch (e) {
            console.warn('Could not extract state fully', e);
        }

        this.ngZone.run(() => {
            this.selectedNodeStateEntries = entries;
            this.inputEntries = entries.filter(e => e.kind === 'input');
            this.outputEntries = entries.filter(e => e.kind === 'output');
            this.stateEntries = entries.filter(e => e.kind === 'state');
            this.cdr.detectChanges();
        });
    }

    startEdit(entry: StateEntry) {
        this.editingKey = entry.key;
        // Prefill without the display quotes so the user edits the raw value.
        this.editDraft = typeof entry.value === 'string' ? entry.value : String(entry.value);
        this.cdr.detectChanges();
        const input = this.host.nativeElement.querySelector<HTMLInputElement>('.state-edit-input');
        input?.focus();
        input?.select();
    }

    cancelEdit() {
        this.editingKey = null;
        this.updateSelectedNodeState();
    }

    commitEdit(entry: StateEntry, event: Event) {
        const type = this.getValueType(entry.value);
        // Text edits end via Enter, Escape, or blur — and removing the input on
        // Enter/Escape fires a trailing blur. Only the first path may commit.
        if (type !== 'boolean' && this.editingKey !== entry.key) return;

        const instance = this.selectedNode?.instance;
        if (!instance) { this.editingKey = null; return; }

        let newValue: any;
        if (type === 'boolean') {
            newValue = (event.target as HTMLInputElement).checked;
        } else {
            const raw = (event.target as HTMLInputElement).value;
            if (type === 'number') {
                newValue = Number(raw);
                if (raw.trim() === '' || Number.isNaN(newValue)) {
                    // Not a valid number — treat as cancel rather than corrupting state.
                    this.cancelEdit();
                    return;
                }
            } else {
                newValue = raw;
            }
        }

        try {
            const current = instance[entry.key];
            if (isSignal(current)) {
                if (typeof (current as any).set === 'function') {
                    (current as any).set(newValue);
                }
            } else {
                instance[entry.key] = newValue;
            }
            this.applyHostChanges(instance);
        } catch (e) {
            console.warn(`[ng-inapp-dev-tool] Failed to set "${entry.key}"`, e);
        }

        this.editingKey = null;
        this.updateSelectedNodeState();
    }

    // Ask Angular to run CD on the edited component so plain-property writes show
    // up even in OnPush/zoneless hosts. Signal writes don't need it, but it's harmless.
    private applyHostChanges(instance: any) {
        try {
            (window as any).ng?.applyChanges?.(instance);
        } catch {
            // Debug API unavailable — the host's own CD will pick the change up eventually.
        }
    }

    private findNodeByInstance(nodes: ComponentTreeNode[], instance: any): ComponentTreeNode | null {
        for (const node of nodes) {
            if (node.instance === instance) return node;
            if (node.children.length > 0) {
                const found = this.findNodeByInstance(node.children, instance);
                if (found) return found;
            }
        }
        return null;
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

    canOpenInEditor(): boolean {
        if (this.config?.editor === false) return false;
        const inst = this.selectedNode?.instance;
        return !!(inst?.constructor as any)?.ɵcmp?.debugInfo?.filePath;
    }

    openSelectedInEditor() {
        const inst = this.selectedNode?.instance;
        const cmp = (inst?.constructor as any)?.ɵcmp;
        const filePath: string | undefined = cmp?.debugInfo?.filePath;
        if (!filePath) return;

        const projectRoot = this.config?.projectRoot;
        const editor = this.config?.editor ?? 'vscode';
        if (editor === false) return;

        const line = cmp.debugInfo.lineNumber || 1;
        const col = 1;
        let fullPath = filePath;
        if (projectRoot) {
            fullPath = projectRoot.replace(/\/$/, '') + '/' + filePath.replace(/^\//, '');
        }

        const a = document.createElement('a');
        if (editor === 'vscode' || editor === 'code') {
            a.href = `vscode://file${fullPath}:${line}:${col}`;
        } else if (editor === 'cursor') {
            a.href = `cursor://file${fullPath}:${line}:${col}`;
        } else if (editor === 'webstorm') {
            a.href = `webstorm://open?file=${fullPath}&line=${line}&column=${col}`;
        } else if (editor === 'idea') {
            a.href = `idea://open?file=${fullPath}&line=${line}&column=${col}`;
        } else {
            // Custom editor (e.g. antigravity) — relies on a /__open-in-editor endpoint on the dev server.
            const editorName = String(editor);
            fetch(`/__open-in-editor?file=${encodeURIComponent(fullPath)}`)
                .then(res => {
                    if (!res.ok) this.warnOpenEditorFailed(editorName, `dev server returned ${res.status}`);
                })
                .catch(err => this.warnOpenEditorFailed(editorName, err?.message ?? String(err)));
            return;
        }
        a.click();
    }

    private warnOpenEditorFailed(editor: string, reason: string): void {
        console.warn(
            `[ng-inapp-dev-tool] Open-in-editor failed for editor "${editor}" — ${reason}. ` +
            `The "${editor}" handler relies on a /__open-in-editor endpoint on your dev server, which Angular's default builder does not provide. ` +
            `Use editor: 'vscode' | 'code' | 'cursor' | 'webstorm' | 'idea' (URL schemes), or install a launch-editor middleware.`
        );
    }

    getValueType(value: any): string {
        if (value === null) return 'object';
        if (value === undefined) return 'undefined';
        if (Array.isArray(value)) return 'object';
        const type = typeof value;
        return type;
    }

    formatValue(value: any): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `"${value}"`;
        if (typeof value === 'function') return 'function() { ... }';
        if (Array.isArray(value)) return `Array(${value.length})`;
        if (typeof value === 'object') {
            const name = value.constructor?.name;
            return name ? `Object(${name})` : 'Object';
        }
        return String(value);
    }
}
