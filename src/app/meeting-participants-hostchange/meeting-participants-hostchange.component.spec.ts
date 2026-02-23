import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeetingParticipantsHostchangeComponent } from './meeting-participants-hostchange.component';

describe('MeetingParticipantsHostchangeComponent', () => {
  let component: MeetingParticipantsHostchangeComponent;
  let fixture: ComponentFixture<MeetingParticipantsHostchangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MeetingParticipantsHostchangeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MeetingParticipantsHostchangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
