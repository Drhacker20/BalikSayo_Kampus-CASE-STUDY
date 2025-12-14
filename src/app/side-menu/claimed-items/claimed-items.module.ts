import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ClaimedItemsPageRoutingModule } from './claimed-items-routing.module';

import { ClaimedItemsPage } from './claimed-items.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ClaimedItemsPageRoutingModule
  ],
  declarations: [ClaimedItemsPage]
})
export class ClaimedItemsPageModule {}
