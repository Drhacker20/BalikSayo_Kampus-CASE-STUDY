import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BrowseItemsPageRoutingModule } from './browse-items-routing.module';

import { BrowseItemsPage } from './browse-items.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BrowseItemsPageRoutingModule
  ],
  declarations: [BrowseItemsPage]
})
export class BrowseItemsPageModule {}
