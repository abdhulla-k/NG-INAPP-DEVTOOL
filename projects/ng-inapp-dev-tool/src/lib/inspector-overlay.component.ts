import {
    Component,
    HostListener,
    Output,
    EventEmitter,
    ElementRef,
    inject,
    ViewChild,
    Renderer2,
    ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { NG_INAPP_DEV_TOOL_CONFIG, DevToolConfig } from './config.token';

/** Holds resolved component metadata for display and actions */
interface ComponentInfo {
    name: string;
    path: string;
    domPath: string;
}

@Component({
    selector: 'ng-inspector-overlay',
    standalone: true,
    imports: [CommonModule],
    template: `
        <!-- Highlighter box -->
        <div #highlighter class="highlighter">
            <div #label class="highlighter-label"></div>
        </div>

        <!-- Info panel (shown after click) -->
        @if (selectedInfo) {
            <div
                class="info-panel"
                [style.top.px]="panelTop"
                [style.left.px]="panelLeft"
                (mousedown)="onPanelInteraction($event)"
                (click)="onPanelInteraction($event)"
            >
                <div class="info-actions">
                    <button class="action-btn" (click)="goToParent(); $event.stopPropagation()" title="Select parent component">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 11 12 6 7 11"></polyline><polyline points="17 18 12 13 7 18"></polyline></svg>
                        Parent
                    </button>
                    <button class="action-btn" (click)="openInEditor(); $event.stopPropagation()" title="Open in editor">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        Open
                    </button>
                    <button class="action-btn" (click)="copyInfo(); $event.stopPropagation()" title="Copy component info">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        {{ copyLabel }}
                    </button>
                    <button class="action-btn close-btn" (click)="closePanel(); $event.stopPropagation()" title="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div class="info-details">
                    <div class="info-row">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        <span class="info-path">{{ selectedInfo.path || 'unknown' }}</span>
                    </div>
                    <div class="info-row">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                        <span class="info-dom">{{ selectedInfo.domPath }}</span>
                    </div>
                </div>
            </div>
        }
    `,
    styles: [`
        :host {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            z-index: 9990;
            cursor: crosshair;
            background-color: rgba(0, 0, 0, 0);
        }
        :host(.panel-open) { cursor: default; }

        .highlighter {
            position: fixed;
            background-color: oklch(69.02% 0.277 332.77 / 0.2);
            border: 1px solid oklch(69.02% 0.277 332.77);
            border-radius: 4px;
            pointer-events: none;
            z-index: 9991;
            transition: all 0.1s ease-out;
        }

        .highlighter-label {
            position: absolute;
            background-color: oklch(69.02% 0.277 332.77);
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            pointer-events: none;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            left: 0;
        }
        .highlighter-label.bottom { bottom: -22px; top: auto; }
        .highlighter-label.top { top: -22px; bottom: auto; }

        /* ── Info Panel ── */
        .info-panel {
            position: fixed;
            z-index: 9995;
            background: oklch(19.37% 0.006 300.98);
            border: 1px solid oklch(36.98% 0.014 302.71);
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.45);
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            min-width: 300px;
            max-width: 480px;
            overflow: hidden;
            animation: panelIn 0.15s ease-out;
        }
        @keyframes panelIn {
            from { opacity: 0; transform: translateY(4px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        .info-actions {
            display: flex;
            align-items: center;
            gap: 2px;
            padding: 6px 8px;
            border-bottom: 1px solid oklch(36.98% 0.014 302.71);
        }
        .action-btn {
            display: flex;
            align-items: center;
            gap: 5px;
            background: transparent;
            border: none;
            color: oklch(70.9% 0.015 304.04);
            font-size: 12px;
            font-weight: 500;
            padding: 4px 10px;
            border-radius: 5px;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.15s ease;
        }
        .action-btn:hover {
            background: oklch(36.98% 0.014 302.71);
            color: white;
        }
        .close-btn { margin-left: auto; padding: 4px 6px; }

        .info-details { padding: 8px 12px; }
        .info-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 3px 0;
            color: oklch(70.9% 0.015 304.04);
            font-size: 12px;
        }
        .info-row svg { flex-shrink: 0; color: oklch(69.02% 0.277 332.77); }
        .info-path {
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 11px;
            color: oklch(69.02% 0.277 332.77);
        }
        .info-dom {
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 11px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    `],
})
export class InspectorOverlayComponent {
    @Output() inspectEnd = new EventEmitter<void>();

    private hostElement: HTMLElement = inject(ElementRef).nativeElement;
    private renderer = inject(Renderer2);
    private cdr = inject(ChangeDetectorRef);
    private config = inject<DevToolConfig>(NG_INAPP_DEV_TOOL_CONFIG, { optional: true });

    @ViewChild('highlighter', { static: true }) private highlighter!: ElementRef<HTMLElement>;
    @ViewChild('label', { static: true }) private label!: ElementRef<HTMLElement>;

    private lastTarget: HTMLElement | null = null;

    // State: currently selected component info (shown in the panel)
    selectedInfo: ComponentInfo | null = null;
    // The raw element the user clicked on (needed for "Parent" navigation)
    private selectedElement: HTMLElement | null = null;
    // Label for the copy button (toggles briefly to "Copied!")
    copyLabel = 'Info';
    // Panel position (bound via template)
    panelTop = 0;
    panelLeft = 0;
    // Timestamp guard to prevent immediate close on same-frame click
    private panelOpenedAt = 0;

    // ─── Hover Highlighting ───
    @HostListener('document:mousemove', ['$event'])
    onMouseMove(event: MouseEvent) {
        // Don't update highlight while info panel is open
        if (this.selectedInfo) return;

        this.hostElement.style.display = 'none';
        const el = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement;
        this.hostElement.style.display = 'block';

        if (el && this.lastTarget !== el) {
            this.lastTarget = el;
            this.updateHighlighter(el);
        }
    }

    /** Prevent clicks inside the panel from bubbling to the document handler */
    onPanelInteraction(event: Event) {
        event.stopPropagation();
    }

    // ─── Click → Show Info Panel ───
    @HostListener('document:click', ['$event'])
    onClick(event: MouseEvent) {
        // If panel is already open and user clicked outside it, close & resume
        if (this.selectedInfo) {
            // Guard: don't close if panel was just opened (same frame protection)
            if (Date.now() - this.panelOpenedAt < 200) return;
            this.closePanel();
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        this.hostElement.style.display = 'none';
        const clickedEl = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement;
        this.hostElement.style.display = 'block';

        const info = this.getComponentInfo(clickedEl);
        if (!info) return;

        // Build the DOM path from the clicked element up to the component host
        const domPath = this.buildDomPath(clickedEl);

        // Calculate panel position before rendering
        this.calculatePanelPosition(event.clientX, event.clientY);

        this.selectedInfo = { ...info, domPath };
        this.selectedElement = clickedEl;
        this.copyLabel = 'Info';
        this.panelOpenedAt = Date.now();
        this.renderer.addClass(this.hostElement, 'panel-open');
        this.cdr.detectChanges();
    }

    // ─── Escape to close ───
    @HostListener('document:keydown.escape')
    onEscape() {
        if (this.selectedInfo) {
            this.closePanel();
        } else {
            this.inspectEnd.emit();
        }
    }

    // ─── Actions ───

    /** Navigate to parent Angular component */
    goToParent() {
        if (!this.selectedElement) return;

        const ngDebug = (window as any).ng;
        if (!ngDebug) return;

        // Step 1: Find the host element of the current component.
        // Walk up from selectedElement to find the element where getComponent() returns something.
        let hostEl: HTMLElement | null = this.selectedElement;
        while (hostEl) {
            if (ngDebug.getComponent(hostEl)) break;
            hostEl = hostEl.parentElement;
        }
        if (!hostEl) return;

        // Step 2: Start from the host's parent and find the next component host above it.
        let walker: HTMLElement | null = hostEl.parentElement;
        while (walker) {
            const comp = ngDebug.getComponent(walker);
            if (comp && comp.constructor) {
                // Found a parent component host element
                const cmpMeta = (comp.constructor as any).ɵcmp;
                let path = '';
                if (cmpMeta?.debugInfo?.filePath) {
                    path = cmpMeta.debugInfo.filePath;
                    if (cmpMeta.debugInfo.lineNumber) path += `:${cmpMeta.debugInfo.lineNumber}`;
                }
                const parentInfo = { name: comp.constructor.name, path };

                this.selectedElement = walker;
                this.selectedInfo = { ...parentInfo, domPath: this.buildDomPath(walker) };
                this.updateHighlighter(walker);
                this.cdr.detectChanges();

                const rect = walker.getBoundingClientRect();
                this.calculatePanelPosition(rect.left + rect.width / 2, rect.top);
                return;
            }
            walker = walker.parentElement;
        }
    }

    /** Open the component source in the configured editor */
    openInEditor() {
        if (!this.selectedInfo?.path) return;
        const sourcePath = this.selectedInfo.path;
        const editorConfig = this.config?.editor;
        const projectRoot = this.config?.projectRoot;

        if (editorConfig === false) return;

        try {
            if (!editorConfig || editorConfig === 'vite') {
                fetch(`/__open-in-editor?file=${sourcePath}`);
            } else if (typeof editorConfig === 'string' || editorConfig === true) {
                const scheme = editorConfig === true ? 'vscode' : editorConfig;
                let fullPath = sourcePath;
                if (projectRoot) {
                    const safeRoot = projectRoot.replace(/\/$/, '') + '/';
                    const safePath = sourcePath.replace(/^\//, '');
                    fullPath = `${safeRoot}${safePath}`;
                } else if (!fullPath.startsWith('/')) {
                    fullPath = '/' + fullPath;
                }
                window.open(`${scheme}://file${fullPath}`, '_blank');
            }
        } catch (error) {
            console.error('[ng-inapp-dev-tool] Failed to open in editor:', error);
        }
    }

    /** Copy component info to clipboard (useful for pasting to AI agents) */
    copyInfo() {
        if (!this.selectedInfo) return;
        const text = [
            `Component: ${this.selectedInfo.name}`,
            `File: ${this.selectedInfo.path || 'unknown'}`,
            `DOM: ${this.selectedInfo.domPath}`,
        ].join('\n');

        navigator.clipboard.writeText(text).then(() => {
            this.copyLabel = 'Copied!';
            this.cdr.detectChanges();
            setTimeout(() => {
                this.copyLabel = 'Info';
                this.cdr.detectChanges();
            }, 1500);
        });
    }

    /** Close the info panel and resume hover inspection */
    closePanel() {
        this.selectedInfo = null;
        this.selectedElement = null;
        this.lastTarget = null;
        this.renderer.removeClass(this.hostElement, 'panel-open');
        this.cdr.detectChanges();
    }

    // ─── Helpers ───

    private updateHighlighter(el: HTMLElement) {
        const rect = el.getBoundingClientRect();
        const hEl = this.highlighter.nativeElement;
        const lEl = this.label.nativeElement;

        const info = this.getComponentInfo(el);
        if (info) {
            lEl.textContent = info.name;
            this.renderer.setStyle(lEl, 'display', 'block');
            if (rect.top < 30) {
                this.renderer.addClass(lEl, 'bottom');
                this.renderer.removeClass(lEl, 'top');
            } else {
                this.renderer.addClass(lEl, 'top');
                this.renderer.removeClass(lEl, 'bottom');
            }
        } else {
            this.renderer.setStyle(lEl, 'display', 'none');
        }

        this.renderer.setStyle(hEl, 'width', `${rect.width}px`);
        this.renderer.setStyle(hEl, 'height', `${rect.height}px`);
        this.renderer.setStyle(hEl, 'top', `${rect.top}px`);
        this.renderer.setStyle(hEl, 'left', `${rect.left}px`);
    }

    private getComponentInfo(element: HTMLElement | null): { name: string; path: string } | null {
        if (!element) return null;

        const ngDebug = (window as any).ng;
        if (ngDebug) {
            let comp = ngDebug.getComponent(element);
            if (!comp) comp = ngDebug.getOwningComponent(element);
            if (comp && comp.constructor) {
                const cmpMeta = (comp.constructor as any).ɵcmp;
                let path = '';
                if (cmpMeta?.debugInfo?.filePath) {
                    path = cmpMeta.debugInfo.filePath;
                    if (cmpMeta.debugInfo.lineNumber) path += `:${cmpMeta.debugInfo.lineNumber}`;
                }
                return { name: comp.constructor.name, path };
            }
        }

        return this.getComponentInfo(element.parentElement);
    }

    /** Build a CSS-selector-like path: div > span > h1 */
    private buildDomPath(element: HTMLElement): string {
        const parts: string[] = [];
        let el: HTMLElement | null = element;
        // Walk up max 8 levels to keep it short
        let depth = 0;
        while (el && depth < 8) {
            const tag = el.tagName.toLowerCase();
            parts.unshift(tag);
            // Stop at a component host element (custom element with a hyphen)
            if (tag.includes('-')) break;
            el = el.parentElement;
            depth++;
        }
        return parts.join(' > ');
    }

    /** Pre-calculate the panel position before it renders */
    private calculatePanelPosition(x: number, y: number) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const gap = 12;
        // Estimate panel dimensions (will be refined, but good enough for positioning)
        const estimatedWidth = 340;
        const estimatedHeight = 80;

        // Try to place above the click point; fall back to below
        let top = y - estimatedHeight - gap;
        if (top < gap) top = y + gap;
        // Horizontal: center on click, clamp to viewport
        let left = x - estimatedWidth / 2;
        left = Math.max(gap, Math.min(left, vw - estimatedWidth - gap));
        top = Math.max(gap, Math.min(top, vh - estimatedHeight - gap));

        this.panelTop = top;
        this.panelLeft = left;
    }
}
