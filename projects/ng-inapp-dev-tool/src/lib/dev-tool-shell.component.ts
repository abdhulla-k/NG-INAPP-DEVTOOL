import {
    Component,
    inject,
    ChangeDetectorRef,
    OnInit,
    ViewChild,
    ElementRef,
    Renderer2,
    HostListener,
} from '@angular/core';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { NG_INAPP_DEV_TOOL_PLUGINS, Plugin } from './plugin.token';
import { DraggableDirective, Position } from './draggable.directive';
import { InspectorOverlayComponent } from './inspector-overlay.component';

@Component({
    selector: 'ng-inapp-dev-tool-shell',
    standalone: true,
    imports: [CommonModule, DraggableDirective, InspectorOverlayComponent, NgComponentOutlet],
    template: `
        @if (isInspecting) {
        <ng-inspector-overlay (inspectEnd)="toggleInspector()" />
        }

        <div
        #draggableWrapper
        class="draggable-wrapper"
        draggable
        (positionChange)="onPositionChange($event)"
        >
            @if (!hidden) {
                <div #shellContainer class="shell-container" (mousedown)="$event.stopPropagation()">
                    <!-- Resize Handles -->
                    <div class="resize-handle top" (mousedown)="startResize($event, 'top')"></div>
                    <div class="resize-handle right" (mousedown)="startResize($event, 'right')"></div>
                    <div class="resize-handle bottom" (mousedown)="startResize($event, 'bottom')"></div>
                    <div class="resize-handle left" (mousedown)="startResize($event, 'left')"></div>

                    <aside class="sidebar">
                        <div class="sidebar-logo">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 250" width="22" height="22">
                                <path fill="none" stroke="currentColor" stroke-width="20" stroke-linejoin="round" d="M125 30L31.9 63.2l14.2 123.1L125 230l78.9-43.7 14.2-123.1z"/>
                                <path fill="currentColor" d="M125 52.1L66.8 182.6h21.7l11.7-29.2h49.4l11.7 29.2H183L125 52.1zm17 83.3h-34l17-40.9 17 40.9z"/>
                            </svg>
                        </div>
                        <div class="sidebar-divider"></div>

                        @for (plugin of plugins; track plugin.name) {
                            <button 
                                class="plugin-tab" 
                                [class.active]="activePlugin === plugin"
                                (click)="selectPlugin(plugin)"
                                [title]="plugin.name"
                                [innerHTML]="sanitizeHtml(plugin.icon)"
                            ></button>
                        }
                    </aside>
                    <main class="content-area">
                        @if (activePlugin) {
                            <ng-container *ngComponentOutlet="activePlugin.component" />
                        } @else {
                            <div class="empty-state">No Plugins Available</div>
                        }
                    </main>
                </div>
            }

            <div class="button-container" [class.vertical]="isVerticalPill">
                <button
                    class="control-button inspector-button"
                    [class.active]="isInspecting"
                    (click)="toggleInspector(); $event.stopPropagation()"
                    title="Inspect Components"
                >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <circle cx="12" cy="12" r="10" />

                    <circle cx="12" cy="12" r="1" />

                    <line x1="12" y1="2" x2="12" y2="4" />
                    <line x1="12" y1="20" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="4" y2="12" />
                    <line x1="20" y1="12" x2="22" y2="12" />
                </svg>
                </button>

                <button class="floating-button" (click)="toggle()" title="Toggle Dev Tools">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 250" width="20" height="20">
                        <path fill="#DD0031" d="M125 30L31.9 63.2l14.2 123.1L125 230l78.9-43.7 14.2-123.1z"/>
                        <path fill="#C3002F" d="M125 30v22.2-.1V230l78.9-43.7 14.2-123.1L125 30z"/>
                        <path fill="#FFA3B1" d="M125 52.1L66.8 182.6h21.7l11.7-29.2h49.4l11.7 29.2H183L125 52.1zm17 83.3h-34l17-40.9 17 40.9z"/>
                        <path fill="#FFD4E0" d="M125 52.1v67.8l-17 40.9h34l11.7 29.2H183L125 52.1z"/>
                    </svg>
                </button>
            </div>
        </div>
  `,
    styles: [
        `
        :host {
            --ngidt-bright-blue: oklch(51.01% 0.274 263.83);
            --ngidt-electric-violet: oklch(53.18% 0.28 296.97);
            --ngidt-french-violet: oklch(47.66% 0.246 305.88);
            --ngidt-vivid-pink: oklch(69.02% 0.277 332.77);
            --ngidt-hot-red: oklch(61.42% 0.238 15.34);
            --ngidt-orange-red: oklch(63.32% 0.24 31.68);

            --ngidt-gray-900: oklch(19.37% 0.006 300.98);
            --ngidt-gray-800: oklch(25% 0.006 300);
            --ngidt-gray-700: oklch(36.98% 0.014 302.71);
            --ngidt-gray-500: oklch(55% 0.014 302);
            --ngidt-gray-400: oklch(70.9% 0.015 304.04);
            --ngidt-gray-300: oklch(82% 0.012 302);
        }

        .button-container {
            display: flex;
            align-items: center;
            background: black;
            padding: 4px;
            border-radius: 20px;
            gap: 4px;
            flex-direction: row;
            box-shadow:
                0 0 0 1px rgba(255, 65, 248, 0.18),
                0 0 14px 2px rgba(255, 65, 248, 0.35),
                0 0 38px 6px rgba(255, 65, 248, 0.22);
            transition: box-shadow 0.25s ease;
        }
        .button-container:hover {
            box-shadow:
                0 0 0 1px rgba(255, 65, 248, 0.3),
                0 0 18px 3px rgba(255, 65, 248, 0.55),
                0 0 56px 10px rgba(255, 65, 248, 0.32);
        }
        .button-container.vertical {
            flex-direction: column;
        }
        .inspector-button {
            background: transparent;
            border: none;
            color: white;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }

        .inspector-button:hover {
            color: var(--ngidt-vivid-pink);
            cursor: pointer;
        }
        
        /* Resizability styling */
        .resize-handle {
            position: absolute;
            z-index: 10000;
        }
        .resize-handle.top { top: -4px; left: 0; right: 0; height: 8px; cursor: ns-resize; }
        .resize-handle.bottom { bottom: -4px; left: 0; right: 0; height: 8px; cursor: ns-resize; }
        .resize-handle.left { top: 0; left: -4px; bottom: 0; width: 8px; cursor: ew-resize; }
        .resize-handle.right { top: 0; right: -4px; bottom: 0; width: 8px; cursor: ew-resize; }

        .shell-container.pinned-top .resize-handle.top { display: none; }
        .shell-container.pinned-bottom .resize-handle.bottom { display: none; }
        .shell-container.pinned-left .resize-handle.left { display: none; }
        .shell-container.pinned-right .resize-handle.right { display: none; }

        .sidebar {
            width: 55px;
            background: #18181b;
            display: flex;
            flex-direction: column;
            border-right: 1px solid var(--ngidt-gray-700);
            padding-top: 15px;
            align-items: center;
            overflow-y: auto;
            overflow-x: hidden;
            box-sizing: border-box;
        }

        .sidebar::-webkit-scrollbar {
            display: none;
        }

        .sidebar-logo {
            color: var(--ngidt-vivid-pink);
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .sidebar-divider {
            width: 35px;
            height: 1px;
            background: var(--ngidt-gray-700);
            margin-bottom: 15px;
        }
        
        .plugin-tab {
            background: transparent;
            border: none;
            color: var(--ngidt-gray-400);
            cursor: pointer;
            padding: 10px;
            margin-bottom: 8px;
            border-radius: 12px;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 42px;
            height: 42px;
        }

        .plugin-tab:hover {
            color: white;
            background: var(--ngidt-gray-800);
        }

        .plugin-tab.active {
            color: var(--ngidt-vivid-pink);
            background: rgba(255, 65, 248, 0.1);
            box-shadow: inset 0 0 0 1px rgba(255, 65, 248, 0.2);
        }
        
        /* Ensure SVGs injected via innerHTML fit nicely */
        ::ng-deep .plugin-tab svg {
            width: 20px;
            height: 20px;
            stroke-width: 1.5;
        }

        .content-area {
            flex: 1;
            background: var(--ngidt-gray-900);
            overflow: auto;
            position: relative;
        }

        .content-area::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        .content-area::-webkit-scrollbar-track {
            background: transparent;
        }
        .content-area::-webkit-scrollbar-thumb {
            background: var(--ngidt-gray-700);
            border-radius: 4px;
        }
        .content-area::-webkit-scrollbar-thumb:hover {
            background: var(--ngidt-gray-400);
        }

        .empty-state {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--ngidt-gray-400);
            font-family: 'Inter', sans-serif;
        }
        .draggable-wrapper {
            font-family: 'Inter', sans-serif;
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9998;
        }
        .floating-button {
            padding: 4px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            background-color: transparent;
            border: none;
            cursor: pointer;
            z-index: 10000;
        }
        .floating-button:hover {
            background-color: rgba(255,255,255,0.1);
        }
        .shell-container {
            position: fixed;
            background: var(--ngidt-gray-900);
            border: 1px solid var(--ngidt-gray-700);
            border-radius: 8px;
            box-shadow: 0 5px 25px rgba(0, 0, 0, 0.5);
            z-index: 9999;
            width: 80vw;
            height: 80vh;
            min-width: 400px;
            min-height: 300px;
            max-width: 95vw;
            max-height: 95vh;
            display: flex;
            overflow: hidden;
            color: white;
        }
    `,
    ],
})
export class DevToolShellComponent implements OnInit {
    // Get all references from template
    @ViewChild(DraggableDirective, { static: true })
    draggableDirective!: DraggableDirective;

    @ViewChild('draggableWrapper', { read: ElementRef, static: true })
    wrapperElement!: ElementRef<HTMLElement>;

    @ViewChild('shellContainer', { read: ElementRef })
    shellContainerElement!: ElementRef<HTMLElement>;

    // Inject plugins that provided in root level
    plugins: Plugin[] = [];
    
    // The currently selected active plugin
    activePlugin: Plugin | null = null;

    constructor() {
        const injectedPlugins = inject(NG_INAPP_DEV_TOOL_PLUGINS, { optional: true }) ?? [];
        // Sort plugins by order (if provided), then fallback to original position
        this.plugins = [...injectedPlugins].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
        
        if (this.plugins.length > 0) {
            this.activePlugin = this.plugins[0];
        }
    }

    // Set devtool detail/plugin panel closed for default
    hidden = true;

    // Controls flex-direction of the dragged wrapper button
    isVerticalPill = false;

    // To manage inspecting ui and inspecting mode
    isInspecting = false;

    // We want to notify angular the changes mannually.
    // So inject change detectionRef to notify angular the events
    private cdr = inject(ChangeDetectorRef);

    // Inject renderer2 to safely manipulate dome elements
    private renderer = inject(Renderer2);

    // Inject DOM sanitizer to safely render plugin icons
    private sanitizer = inject(DomSanitizer);

    ngOnInit(): void {
        this.cdr.detectChanges();

        setTimeout(() => {
            const initialRect =
                this.wrapperElement.nativeElement.getBoundingClientRect();

            // Set the position of the button initially
            this.onPositionChange({ x: initialRect.left, y: initialRect.top });
        });
    }

    selectPlugin(plugin: Plugin): void {
        this.activePlugin = plugin;
        this.cdr.detectChanges();
    }

    toggle(): void {
        // Check is dragged before changing anything.
        // We don't want to open/close menue if user draging the panel or button
        if (this.draggableDirective.wasJustDragged) {
            return;
        }

        // Toggle the panel
        this.hidden = !this.hidden;

        // Notify angular change detection to update component UI
        this.cdr.detectChanges();

        // Wait for a small time to update the UI
        setTimeout(() => {
            // Find the position of wrapper and change the position of the container
            const currentRect =
                this.wrapperElement.nativeElement.getBoundingClientRect();
            this.onPositionChange({ x: currentRect.left, y: currentRect.top });
        });
    }

    toggleInspector(): void {
        this.isInspecting = !this.isInspecting;

        // Manually tell Angular to check for changes
        this.cdr.detectChanges();

        // Close the panel weather user started inspecting now
        if (this.isInspecting) {
            this.hidden = true;
            this.cdr.detectChanges();
        }
    }

    sanitizeHtml(html: string): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(html);
    }

    onPositionChange(buttonPos: Position, customWidth?: number, customHeight?: number): void {
        // Handle toggle button orientation (vertical pill vs horizontal) unconditionally
        const buttonEl = this.wrapperElement?.nativeElement;
        if (buttonEl) {
            const buttonWidth = buttonEl.offsetWidth;
            const buttonHeight = buttonEl.offsetHeight;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const distToTop = buttonPos.y + buttonHeight / 2;
            const distToBottom = viewportHeight - distToTop;
            const distToLeft = buttonPos.x + buttonWidth / 2;
            const distToRight = viewportWidth - distToLeft;

            const minVerticalDist = Math.min(distToTop, distToBottom);
            const minHorizontalDist = Math.min(distToLeft, distToRight);

            const newIsVerticalPill = minHorizontalDist < minVerticalDist;
            if (this.isVerticalPill !== newIsVerticalPill) {
                this.isVerticalPill = newIsVerticalPill;
                this.cdr.detectChanges();
            }
        }

        // Only want to set panel closed or container not exists
        if (this.hidden || !this.shellContainerElement) return;

        // Access native elements to change position
        const containerEl = this.shellContainerElement.nativeElement;
        const finalButtonEl = this.wrapperElement.nativeElement;

        // Get all the values from different objects to caluclate positions
        const gap = 20;
        let panelWidth = customWidth ?? containerEl.offsetWidth;
        let panelHeight = customHeight ?? containerEl.offsetHeight;
        let buttonWidth = finalButtonEl.offsetWidth;
        let buttonHeight = finalButtonEl.offsetHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const buttonCenterX = buttonPos.x + buttonWidth / 2;
        const buttonCenterY = buttonPos.y + buttonHeight / 2;

        // Determine placement based on corners to mimic Nuxt DevTools behavior.
        const isTop = buttonCenterY < viewportHeight / 2;
        const isLeft = buttonCenterX < viewportWidth / 2;

        let finalTop: number;
        let finalLeft: number;

        if (this.isVerticalPill) {
            // Button is docked to Left or Right edge. Grow horizontal.
            if (isLeft) {
                finalLeft = buttonPos.x + buttonWidth + gap; // Right of the button
            } else {
                finalLeft = buttonPos.x - panelWidth - gap; // Left of the button
            }

            if (isTop) {
                finalTop = buttonPos.y; // Align top
            } else {
                finalTop = buttonPos.y + buttonHeight - panelHeight; // Align bottom
            }
        } else {
            // Button is docked to Top or Bottom edge. Grow vertical.
            if (isTop) {
                finalTop = buttonPos.y + buttonHeight + gap; // Below
            } else {
                finalTop = buttonPos.y - panelHeight - gap; // Above
            }

            if (isLeft) {
                finalLeft = buttonPos.x; // Right / Align Left
            } else {
                finalLeft = buttonPos.x + buttonWidth - panelWidth; // Left / Align Right
            }
        }

        // Apply a universal clamp to the final calculated position
        finalTop = Math.max(
            gap,
            Math.min(finalTop, viewportHeight - panelHeight - gap)
        );

        finalLeft = Math.max(
            gap,
            Math.min(finalLeft, viewportWidth - panelWidth - gap)
        );

        // Calculate and apply pin classes for hiding irrelevant resize handles
        const pinnedVertical = isTop ? 'top' : 'bottom';
        const pinnedHorizontal = isLeft ? 'left' : 'right';

        this.renderer.removeClass(containerEl, 'pinned-top');
        this.renderer.removeClass(containerEl, 'pinned-bottom');
        this.renderer.removeClass(containerEl, 'pinned-left');
        this.renderer.removeClass(containerEl, 'pinned-right');
        
        this.renderer.addClass(containerEl, `pinned-${pinnedVertical}`);
        this.renderer.addClass(containerEl, `pinned-${pinnedHorizontal}`);

        // Render the final, safe position for the container
        this.renderer.setStyle(containerEl, 'top', `${finalTop}px`);
        this.renderer.setStyle(containerEl, 'left', `${finalLeft}px`);
        if (customWidth !== undefined) {
             this.renderer.setStyle(containerEl, 'width', `${customWidth}px`);
        }
        if (customHeight !== undefined) {
             this.renderer.setStyle(containerEl, 'height', `${customHeight}px`);
        }
    }

    // Resize states
    isResizing = false;
    resizeDirection = '';
    initialWidth = 0;
    initialHeight = 0;
    initialMouseX = 0;
    initialMouseY = 0;

    startResize(event: MouseEvent, direction: string) {
        if (!this.hidden) {
            this.isResizing = true;
            this.resizeDirection = direction;
            this.initialMouseX = event.clientX;
            this.initialMouseY = event.clientY;
            
            const containerEl = this.shellContainerElement.nativeElement;
            this.initialWidth = containerEl.offsetWidth;
            this.initialHeight = containerEl.offsetHeight;
            
            event.preventDefault();
            event.stopPropagation();
        }
    }

    @HostListener('window:mousemove', ['$event'])
    onMouseMove(event: MouseEvent) {
        if (this.isResizing && this.shellContainerElement && this.wrapperElement) {
            const dx = event.clientX - this.initialMouseX;
            const dy = event.clientY - this.initialMouseY;
            
            let newWidth = this.initialWidth;
            let newHeight = this.initialHeight;

            if (this.resizeDirection === 'top') {
                newHeight = this.initialHeight - dy;
            } else if (this.resizeDirection === 'bottom') {
                newHeight = this.initialHeight + dy;
            } else if (this.resizeDirection === 'left') {
                newWidth = this.initialWidth - dx;
            } else if (this.resizeDirection === 'right') {
                newWidth = this.initialWidth + dx;
            }

            // Clamp max limits and min limits
            newWidth = Math.max(400, Math.min(newWidth, window.innerWidth - 40));
            newHeight = Math.max(300, Math.min(newHeight, window.innerHeight - 40));

            // Delegate application of dimensions to onPositionChange to prevent layout anchoring jitter
            const buttonPos = this.wrapperElement.nativeElement.getBoundingClientRect();
            this.onPositionChange({ x: buttonPos.left, y: buttonPos.top }, newWidth, newHeight);
        }
    }

    @HostListener('window:mouseup')
    onMouseUp() {
        this.isResizing = false;
    }
}
