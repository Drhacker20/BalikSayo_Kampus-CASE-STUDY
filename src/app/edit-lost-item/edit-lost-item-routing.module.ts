import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EditLostItemPage } from './edit-lost-item.page';

const routes: Routes = [
  {
    path: '',
    component: EditLostItemPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EditLostItemPageRoutingModule {}
