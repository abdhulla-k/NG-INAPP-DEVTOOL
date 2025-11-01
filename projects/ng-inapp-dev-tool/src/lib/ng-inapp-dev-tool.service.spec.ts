import { TestBed } from '@angular/core/testing';

import { NgInappDevToolService } from './ng-inapp-dev-tool.service';

describe('NgInappDevToolService', () => {
  let service: NgInappDevToolService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NgInappDevToolService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
