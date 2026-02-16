import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZoomDemoComponent } from './zoom-demo.component';

describe('ZoomDemoComponent', () => {
  let component: ZoomDemoComponent;
  let fixture: ComponentFixture<ZoomDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ZoomDemoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ZoomDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
