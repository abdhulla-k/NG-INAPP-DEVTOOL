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

@Component({
    selector: 'ng-inspector-overlay',
    standalone: true,
    imports: [CommonModule],
    template: ` <div #highlighter class="highlighter"></div> `,
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
            background-color: #f637e333;
            border: 1px solid #5a0051ff;
            border-radius: 3px;
            pointer-events: none;
            z-index: 9991;
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

    // Get hilighter to mange size and manipulate it
    @ViewChild('highlighter', { static: true })
    private highlighter!: ElementRef<HTMLElement>;

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

            //  Use the Renderer to apply the styles to our highlighter div
            this.renderer.setStyle(highlighterEl, 'width', `${rect.width}px`);
            this.renderer.setStyle(highlighterEl, 'height', `${rect.height}px`);
            this.renderer.setStyle(highlighterEl, 'top', `${rect.top}px`);
            this.renderer.setStyle(highlighterEl, 'left', `${rect.left}px`);
        }
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

        const sourcePath = this.findComponentSource(clickedElement);

        if (sourcePath) {
            console.log('Found component source:', sourcePath);

            // 2. Make the request to our local editor server
            const endpoint = 'http://localhost:4201/__open-in-editor';
            const url = `${endpoint}?file=${encodeURIComponent(sourcePath)}`;

            fetch(url).then(res => {
                if (!res.ok) {
                    console.error(`[DevTools] Failed to open file. Server responded with status ${res.status}`);
                }
            });

        } else {
            console.log('Could not find an Angular component source for this element.');
        }

        // Emit to close inpect mode from shell component
        this.inspectEnd.emit();
    }

    private findComponentSource(element: HTMLElement | null): string | null {
        if (!element) {
            return null;
        }
        const source = element.getAttribute('data-ng-source');
        if (source) {
            return source;
        }
        return this.findComponentSource(element.parentElement);
    }
}
