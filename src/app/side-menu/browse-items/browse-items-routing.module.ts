import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BrowseItemsPage } from './browse-items.page';

const routes: Routes = [
  {
    path: '',
    component: BrowseItemsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BrowseItemsPageRoutingModule {}
