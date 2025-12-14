import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowseItemsPage } from './browse-items.page';

describe('BrowseItemsPage', () => {
  let component: BrowseItemsPage;
  let fixture: ComponentFixture<BrowseItemsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BrowseItemsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
