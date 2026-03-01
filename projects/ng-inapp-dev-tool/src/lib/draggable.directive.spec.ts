import { DraggableDirective } from './draggable.directive';
import { ElementRef } from '@angular/core';

describe('DraggableDirective', () => {
  it('should create an instance', () => {
    const mockElementRef = new ElementRef(document.createElement('div'));
    const directive = new DraggableDirective(mockElementRef);
    expect(directive).toBeTruthy();
  });
});
