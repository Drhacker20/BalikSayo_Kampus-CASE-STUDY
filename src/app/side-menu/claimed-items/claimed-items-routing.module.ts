import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ClaimedItemsPage } from './claimed-items.page';

const routes: Routes = [
  {
    path: '',
    component: ClaimedItemsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClaimedItemsPageRoutingModule {}
