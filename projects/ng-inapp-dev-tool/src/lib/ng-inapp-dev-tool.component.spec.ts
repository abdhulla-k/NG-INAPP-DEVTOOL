import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgInappDevToolComponent } from './ng-inapp-dev-tool.component';

describe('NgInappDevToolComponent', () => {
  let component: NgInappDevToolComponent;
  let fixture: ComponentFixture<NgInappDevToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgInappDevToolComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgInappDevToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
