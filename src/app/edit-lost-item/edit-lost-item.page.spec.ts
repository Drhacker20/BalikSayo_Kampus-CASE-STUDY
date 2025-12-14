import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditLostItemPage } from './edit-lost-item.page';

describe('EditLostItemPage', () => {
  let component: EditLostItemPage;
  let fixture: ComponentFixture<EditLostItemPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EditLostItemPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
