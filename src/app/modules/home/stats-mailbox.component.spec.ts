import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StatsMailboxComponent } from './stats-mailbox.component';

describe('StatsMailboxComponent', () => {
  let component: StatsMailboxComponent;
  let fixture: ComponentFixture<StatsMailboxComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StatsMailboxComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StatsMailboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
