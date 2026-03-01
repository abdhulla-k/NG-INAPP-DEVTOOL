import {
    Component,
    inject,
    ChangeDetectorRef,
    OnInit,
    ViewChild,
    ElementRef,
    Renderer2,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { NG_INAPP_DEV_TOOL_PLUGINS, Plugin } from './plugin.token';
import { DraggableDirective, Position } from './draggable.directive';
import { InspectorOverlayComponent } from './inspector-overlay.component';

@Component({
    selector: 'ng-inapp-dev-tool-shell',
    standalone: true,
    imports: [CommonModule, DraggableDirective, InspectorOverlayComponent],
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
                <div #shellContainer class="shell-container">
                    <main>
                        <div class="plugin-container">
                            <h1>ANGULAR&nbsp;DEV&nbsp;TOOL</h1>
                            <p>coming&nbsp;soon...</p>
                        </div>
                    </main>
                </div>
            }

            <div class="button-container">
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

                <button class="floating-button" (click)="toggle()">
                <p>NG DEV TOOL</p>
                </button>
            </div>
        </div>
  `,
    styles: [
        `
        .button-container {
            display: flex;
            align-items: center;
            background: black;
            padding: 0px 4px;
            border-radius: 20px;
        }
        .inspector-button {
            background: transparent;
            border: none;
            color: white;
        }

        .inspector-button:hover {
            color: #f98eee;
            cursor: pointer;
        }

        .plugin-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            text-align: center;
            padding: 20px;
        }
        .draggable-wrapper {
            font-family: 'Inter', sans-serif;
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9998;
        }
        .floating-button {
            padding: 0px 15px 0px 5px;
            border-radius: 13px;
            color: white;
            background-color: #000000ff;
            border: none;
            font-size: 12px;
            cursor: pointer;
            z-index: 10000;
        }
        .shell-container {
            position: fixed;
            background: #f8f8f8;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            z-index: 9999;
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
    plugins: Plugin[] =
        inject(NG_INAPP_DEV_TOOL_PLUGINS, { optional: true }) ?? [];

    // Set devtool detail/plugin panel closed for default
    hidden = true;

    // To manage inspecting ui and inspecting mode
    isInspecting = false;

    // We want to notify angular the changes mannually.
    // So inject change detectionRef to notify angular the events
    private cdr = inject(ChangeDetectorRef);

    // Inject renderer2 to safely manipulate dome elements
    private renderer = inject(Renderer2);

    ngOnInit(): void {
        this.cdr.detectChanges();

        setTimeout(() => {
            const initialRect =
                this.wrapperElement.nativeElement.getBoundingClientRect();

            // Set the position of the button initially
            this.onPositionChange({ x: initialRect.left, y: initialRect.top });
        });
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

    onPositionChange(buttonPos: Position): void {
        // Only want to set panal closed or container not exists
        if (this.hidden || !this.shellContainerElement) return;

        // Access native elements to change position
        const containerEl = this.shellContainerElement.nativeElement;
        const buttonEl = this.wrapperElement.nativeElement;

        // Get all the values from different objects to caluclate positions
        const gap = 20;
        const panelWidth = containerEl.offsetWidth;
        const panelHeight = containerEl.offsetHeight;
        const buttonWidth = buttonEl.offsetWidth;
        const buttonHeight = buttonEl.offsetHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Determine which edge the button is closest to.
        const buttonCenterX = buttonPos.x + buttonWidth / 2;
        const buttonCenterY = buttonPos.y + buttonHeight / 2;

        const distToTop = buttonCenterY;
        const distToBottom = viewportHeight - buttonCenterY;
        const distToLeft = buttonCenterX;
        const distToRight = viewportWidth - buttonCenterX;

        const minVerticalDist = Math.min(distToTop, distToBottom);
        const minHorizontalDist = Math.min(distToLeft, distToRight);

        let finalTop: number;
        let finalLeft: number;

        // Choose placement strategy based on the nearest edge.
        if (minVerticalDist <= minHorizontalDist) {
            // Vertically changing
            finalLeft = buttonCenterX - panelWidth / 2;

            if (distToTop < distToBottom) {
                finalTop = buttonPos.y + buttonHeight + gap; // Below
            } else {
                finalTop = buttonPos.y - panelHeight - gap; // Above
            }
        } else {
            // Horizontally changing
            finalTop = buttonCenterY - panelHeight / 2;

            if (distToLeft < distToRight) {
                finalLeft = buttonPos.x + buttonWidth + gap; // Right
            } else {
                finalLeft = buttonPos.x - panelWidth - gap; // Left
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

        // Render the final, safe position for the container
        this.renderer.setStyle(containerEl, 'top', `${finalTop}px`);
        this.renderer.setStyle(containerEl, 'left', `${finalLeft}px`);
    }
}
