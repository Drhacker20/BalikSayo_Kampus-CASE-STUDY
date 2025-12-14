import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClaimedItemsPage } from './claimed-items.page';

describe('ClaimedItemsPage', () => {
  let component: ClaimedItemsPage;
  let fixture: ComponentFixture<ClaimedItemsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ClaimedItemsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
