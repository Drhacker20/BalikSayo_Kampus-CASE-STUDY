import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SideMenuPage } from './side-menu.page';

const routes: Routes = [
  {
    path: '',
    component: SideMenuPage,
    children: [
      {
        path: 'browse-items',
        loadChildren: () =>
          import('./browse-items/browse-items.module').then(m => m.BrowseItemsPageModule)
      },
      {
        path: 'claimed-items',
        loadChildren: () =>
          import('./claimed-items/claimed-items.module').then(m => m.ClaimedItemsPageModule)
      },
      {
        path: 'admin-dashboard',
        loadChildren: () =>
          import('./admin-dashboard/admin-dashboard.module').then(m => m.AdminDashboardPageModule)
      },
      {
        path: '',
        redirectTo: 'browse-items',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SideMenuPageRoutingModule {}
