import {
    Directive,
    ElementRef,
    HostListener,
    OnInit,
    Output,
    EventEmitter
} from '@angular/core';

// Interface for positon
export interface Position {
    x: number;
    y: number;
}

@Directive({
    selector: '[draggable]',
    standalone: true,
})
export class DraggableDirective implements OnInit {
    // This will emit the new position in real-time when draging the button
    @Output() positionChange = new EventEmitter<Position>();

    // Define a variable to mangage draging and clicking
    // It is for communicating with component, is the element dragged/clicked
    public wasJustDragged = false;

    private element: HTMLElement;
    private isDragging = false;
    private dragThreshold = 5; // Min pixels moved to be considered a drag

    private startX = 0;
    private startY = 0;
    private offsetX = 0;
    private offsetY = 0;

    // Bind all methods with the directive's this.
    // Becouse we want to pass this functions as events callback below in host listener
    private onMouseMove = this.handleMouseMove.bind(this);
    private onMouseUp = this.handleMouseUp.bind(this);

    constructor(private el: ElementRef) {
        // Save the element ref passed to the constructor (automatically at the time of initialization of directive)
        // in a variable to use later
        this.element = this.el.nativeElement;
    }

    ngOnInit(): void {
        // Set default postion
        this.element.style.position = 'fixed';
        this.element.style.cursor = 'move';
    }

    // Listen for mouse move event using Function deccorator
    @HostListener('mousedown', ['$event'])
    private onMouseDown(event: MouseEvent): void {
        if (event.button === 0) {
            this.isDragging = true;
            this.wasJustDragged = false;

            this.startX = event.clientX;
            this.startY = event.clientY;

            const rect = this.element.getBoundingClientRect();
            this.offsetX = event.clientX - rect.left;
            this.offsetY = event.clientY - rect.top;

            // Listen mouse movement if mouse clicked on the element
            document.addEventListener('mousemove', this.onMouseMove);

            // Listen for mouse click reliese
            document.addEventListener('mouseup', this.onMouseUp);

            // Stop default behaviour
            event.preventDefault();
        }
    }

    private handleMouseMove(event: MouseEvent): void {
        if (!this.isDragging) return;

        // Check if we've moved past the drag threshold
        const movedX = Math.abs(event.clientX - this.startX);
        const movedY = Math.abs(event.clientY - this.startY);
        if (movedX > this.dragThreshold || movedY > this.dragThreshold) {
            this.wasJustDragged = true;
        }

        // Create an screen edge snapping effect for the button when dragging
        // Don't want to let users to drag from edge of the screen
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const elementWidth = this.element.offsetWidth;
        const elementHeight = this.element.offsetHeight;

        const gap = 20;

        // Calculate distances from the cursor to each edge
        const distToLeft = event.clientX;
        const distToRight = viewportWidth - event.clientX;
        const distToTop = event.clientY;
        const distToBottom = viewportHeight - event.clientY;

        // Find the minimum distance to a horizontal or vertical edge
        const minHorizontalDist = Math.min(distToLeft, distToRight);
        const minVerticalDist = Math.min(distToTop, distToBottom);

        let finalX: number;
        let finalY: number;

        if (minHorizontalDist < minVerticalDist) {
            // The Y position follows the mouse, but is clamped to the viewport
            finalY = event.clientY - this.offsetY;
            finalY = Math.max(0, Math.min(finalY, viewportHeight - elementHeight - gap));

            // Snap X to the nearest vertical edge
            if (distToLeft < distToRight) {
                finalX = gap; // Snap to left
            } else {
                finalX = viewportWidth - elementWidth - gap; // Snap to right
            }

        } else {
            finalX = event.clientX - this.offsetX;
            finalX = Math.max(gap, Math.min(finalX, viewportWidth - elementWidth - gap));

            if (distToTop < distToBottom) {
                finalY = gap;
            } else {
                finalY = viewportHeight - elementHeight - gap;
            }
        }

        // Apply the final snapped position
        this.element.style.left = `${finalX}px`;
        this.element.style.top = `${finalY}px`;
        this.element.style.bottom = 'auto';
        this.element.style.right = 'auto';

        // Emit the new position for the component to use
        this.positionChange.emit({ x: finalX, y: finalY });
    }

    private handleMouseUp(event: MouseEvent): void {
        if (this.isDragging) {
            this.isDragging = false;
            document.removeEventListener('mousemove', this.onMouseMove);
            document.removeEventListener('mouseup', this.onMouseUp);

            // We use a timeout to reset the flag, ensuring the click event
            // has a chance to read it first.
            setTimeout(() => { this.wasJustDragged = false; }, 0);
        }
    }
}