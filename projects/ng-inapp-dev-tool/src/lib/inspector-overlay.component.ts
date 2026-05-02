import {
    Component,
    HostListener,
    Output,
    EventEmitter,
    ElementRef,
    inject,
    ViewChild,
    Renderer2,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { NG_INAPP_DEV_TOOL_CONFIG, DevToolConfig } from './config.token';

@Component({
    selector: 'ng-inspector-overlay',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div #highlighter class="highlighter">
            <div #label class="highlighter-label"></div>
        </div>
    `,
    styles: [
        `
        :host {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 9990;
            cursor: crosshair;
            background-color: rgba(0, 0, 0, 0);
        }

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

        .highlighter-label.bottom {
            bottom: -22px;
            top: auto;
        }

        .highlighter-label.top {
            top: -22px;
            bottom: auto;
        }
    `,
    ],
})
export class InspectorOverlayComponent {
    // Create an event emiter to emit when selecting an element.
    // It will utilize in shell component to toggle and also we can use in other purpose later
    @Output() inspectEnd = new EventEmitter<void>();

    // Inject ElementRef to get a reference to this component's host element
    private hostElement: HTMLElement = inject(ElementRef).nativeElement;

    // Inject renderer to manipulate the UI
    private renderer = inject(Renderer2);

    // Inject DevToolConfig to check editor preferences
    private config = inject<DevToolConfig>(NG_INAPP_DEV_TOOL_CONFIG, { optional: true });

    // Get hilighter to mange size and manipulate it
    @ViewChild('highlighter', { static: true })
    private highlighter!: ElementRef<HTMLElement>;

    @ViewChild('label', { static: true })
    private label!: ElementRef<HTMLElement>;

    // variable to save last selected element
    private lastTarget: HTMLElement | null = null;

    // Listen for mousemove to get access to the elments
    @HostListener('document:mousemove', ['$event'])
    onMouseMove(event: MouseEvent) {
        // Temporarily hide the overlay
        this.hostElement.style.display = 'none';

        // Get the element at the cursor's position
        const elementUnderCursor = document.elementFromPoint(
            event.clientX,
            event.clientY
        ) as HTMLElement;

        // Immediately show the overlay again
        this.hostElement.style.display = 'block';

        // Only calculate th size if hovered element not last lastTarget
        if (elementUnderCursor && this.lastTarget !== elementUnderCursor) {
            // Set last targe
            this.lastTarget = elementUnderCursor;

            // Get the position and dimensions of the target element
            const rect = elementUnderCursor.getBoundingClientRect();
            const highlighterEl = this.highlighter.nativeElement;
            const labelEl = this.label.nativeElement;

            // Get component info
            const compInfo = this.getComponentInfo(elementUnderCursor);
            if (compInfo) {
                labelEl.textContent = compInfo.name;
                this.renderer.setStyle(labelEl, 'display', 'block');
                
                // Position label
                if (rect.top < 30) {
                    this.renderer.addClass(labelEl, 'bottom');
                    this.renderer.removeClass(labelEl, 'top');
                } else {
                    this.renderer.addClass(labelEl, 'top');
                    this.renderer.removeClass(labelEl, 'bottom');
                }
            } else {
                this.renderer.setStyle(labelEl, 'display', 'none');
            }

            //  Use the Renderer to apply the styles to our highlighter div
            this.renderer.setStyle(highlighterEl, 'width', `${rect.width}px`);
            this.renderer.setStyle(highlighterEl, 'height', `${rect.height}px`);
            this.renderer.setStyle(highlighterEl, 'top', `${rect.top}px`);
            this.renderer.setStyle(highlighterEl, 'left', `${rect.left}px`);
        }
    }

    private getComponentInfo(element: HTMLElement | null): { name: string; path: string } | null {
        if (!element) {
            return null;
        }

        // Attempt to access Angular's global debug info
        const ngDebug = (window as any).ng;

        if (ngDebug) {
            let comp = ngDebug.getComponent(element);
            if (!comp) {
                comp = ngDebug.getOwningComponent(element);
            }
            if (comp && comp.constructor) {
                // Read Angular 17+ component debug metadata
                const cmpMeta = (comp.constructor as any).ɵcmp;
                let path = '';
                if (cmpMeta && cmpMeta.debugInfo && cmpMeta.debugInfo.filePath) {
                    path = cmpMeta.debugInfo.filePath;
                    if (cmpMeta.debugInfo.lineNumber) {
                        path += `:${cmpMeta.debugInfo.lineNumber}`;
                    }
                }
                return {
                    name: comp.constructor.name,
                    path: path,
                };
            }
        }

        return this.getComponentInfo(element.parentElement);
    }

    // Listen for the click event on document to get the elment clicked to open in editer
    @HostListener('document:click', ['$event'])
    onClick(event: MouseEvent) {
        // Stop default behavious
        event.preventDefault();
        event.stopPropagation();

        this.hostElement.style.display = 'none';
        // Get clicked element 
        const clickedElement = document.elementFromPoint(
            event.clientX,
            event.clientY
        ) as HTMLElement;
        this.hostElement.style.display = 'block';

        const compInfo = this.getComponentInfo(clickedElement);
        if (compInfo && compInfo.path) {
            const sourcePath = compInfo.path;
            console.log('[ng-inapp-dev-tool] Component source:', sourcePath);
            
            const editorConfig = this.config?.editor;
            const projectRoot = this.config?.projectRoot;

            // Allow opting out of the editor opening feature via configuration
            if (editorConfig !== false) {
                try {
                    if (!editorConfig || editorConfig === 'vite') {
                        // Use Vite's native __open-in-editor middleware which runs in Angular Dev Server
                        fetch(`/__open-in-editor?file=${sourcePath}`);
                    } else if (typeof editorConfig === 'string' || editorConfig === true) {
                        const scheme = editorConfig === true ? 'vscode' : editorConfig;
                        // Use custom URL scheme for other editors
                        // Note: Custom schemas usually require absolute paths.
                        let fullPath = sourcePath;
                        if (projectRoot) {
                            // Ensure projectRoot ends with a slash and sourcePath doesn't start with one
                            const safeRoot = projectRoot.replace(/\/$/, '') + '/';
                            const safePath = sourcePath.replace(/^\//, '');
                            fullPath = `${safeRoot}${safePath}`;
                        } else if (!fullPath.startsWith('/')) {
                            // Ensure there is a full path format for URI if it's missing root
                            fullPath = '/' + fullPath;
                        }
                        
                        window.open(`${scheme}://file${fullPath}`, '_blank');
                    }
                } catch (error) {
                    console.error('[ng-inapp-dev-tool] Failed to open in editor:', error);
                }
            } else {
                console.log('[ng-inapp-dev-tool] Editor opening disabled by DevToolConfig.');
            }
        } else {
            console.log('[ng-inapp-dev-tool] Could not find an Angular component source for this element.');
        }

        // Emit to close inpect mode from shell component
        this.inspectEnd.emit();
    }
}
