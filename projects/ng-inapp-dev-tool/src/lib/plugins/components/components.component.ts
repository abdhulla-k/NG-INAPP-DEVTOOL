import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ComponentTreeNode {
    id: string; // Unique ID (e.g. random string or index path)
    name: string; // Component class name
    element: HTMLElement;
    instance: any; // The raw angular component instance
    children: ComponentTreeNode[];
    expanded: boolean;
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
                </div>
                <div class="state-container">
                    @if (selectedNode) {
                        <div class="state-section">
                            <h4>State</h4>
                            @if (hasState(selectedNodeState)) {
                                <div class="state-list">
                                    @for (kv of selectedNodeState | keyvalue; track kv.key) {
                                        <div class="state-row">
                                            <span class="state-key">{{ kv.key }}</span>
                                            <span class="state-separator">:</span>
                                            <span class="state-value" [class]="getValueType(kv.value)">
                                                {{ formatValue(kv.value) }}
                                            </span>
                                        </div>
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

        <!-- Recursive Tree Node Template -->
        <ng-template #treeNodeTpl let-node>
            <div class="tree-node" [class.selected]="selectedNode === node">
                <div class="node-content" 
                     [style.padding-left.px]="(getDepth(node) * 16) + 8"
                     (click)="selectNode(node)">
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
            color: var(--gray-300);
            background: var(--gray-900);
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
            border-right: 1px solid var(--gray-700);
            display: flex;
            flex-direction: column;
            background: var(--gray-900);
        }

        .pane-header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--gray-700);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--gray-800);
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
            color: var(--gray-400);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .refresh-btn:hover {
            color: white;
            background: var(--gray-700);
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
            background: var(--gray-800);
        }

        .tree-node.selected > .node-content {
            background: rgba(255, 65, 248, 0.15);
            color: var(--vivid-pink);
        }

        .caret {
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 4px;
            color: var(--gray-400);
            transition: transform 0.15s ease;
            border-radius: 4px;
        }
        .caret:hover {
            background: var(--gray-700);
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
            color: var(--gray-500);
            margin: 0 2px;
        }
        .tree-node.selected .node-bracket {
            color: rgba(255, 65, 248, 0.7);
        }
        .node-name {
            color: #4ade80; /* Nuxt green for components, or vivid-pink */
        }
        .tree-node.selected .node-name {
            color: var(--vivid-pink);
            font-weight: 500;
        }

        /* State Pane */
        .state-pane {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: var(--gray-900);
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
            color: var(--gray-400);
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
        .state-separator {
            color: var(--gray-500);
            margin-right: 6px;
        }
        
        .state-value.string { color: #ce9178; } /* Orange/Brown */
        .state-value.number { color: #b5cea8; } /* Light green */
        .state-value.boolean { color: #569cd6; } /* Blue */
        .state-value.object { color: var(--gray-300); }
        .state-value.function { color: #dcdcaa; font-style: italic; } /* Yellow */
        .state-value.undefined { color: #569cd6; font-style: italic; }

        .empty-state {
            color: var(--gray-500);
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
    selectedNodeState: Record<string, any> = {};

    private cdr = inject(ChangeDetectorRef);
    private ngZone = inject(NgZone);
    private pollInterval: any;
    private idCounter = 0;
    
    // Store depth map for fast indentation styling
    private depthMap = new Map<string, number>();

    ngOnInit() {
        this.refreshTree();
        
        // Start polling for state updates (run outside angular to avoid excessive CD)
        this.ngZone.runOutsideAngular(() => {
            this.pollInterval = setInterval(() => {
                if (this.selectedNode && this.selectedNode.instance) {
                    this.updateSelectedNodeState();
                }
            }, 500);
        });
    }

    ngOnDestroy() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
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
                this.selectedNodeState = {};
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
        this.updateSelectedNodeState();
    }

    private updateSelectedNodeState() {
        if (!this.selectedNode) return;
        
        const instance = this.selectedNode.instance;
        const newState: Record<string, any> = {};
        
        // Extract public properties (skip private/angular internal)
        try {
            for (const key in instance) {
                // Ignore Angular internals and private convention
                if (key.startsWith('_')) continue;
                if (key === 'constructor') continue;
                
                newState[key] = instance[key];
            }
        } catch (e) {
            console.warn('Could not extract state fully', e);
        }
        
        // Only trigger CD if state actually changed structurally or values changed
        this.ngZone.run(() => {
            this.selectedNodeState = newState;
            this.cdr.detectChanges();
        });
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

    hasState(state: Record<string, any>): boolean {
        return Object.keys(state).length > 0;
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
