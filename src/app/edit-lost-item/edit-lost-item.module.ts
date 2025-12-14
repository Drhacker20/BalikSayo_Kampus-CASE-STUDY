import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EditLostItemPageRoutingModule } from './edit-lost-item-routing.module';

import { EditLostItemPage } from './edit-lost-item.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EditLostItemPageRoutingModule
  ],
  declarations: [EditLostItemPage]
})
export class EditLostItemPageModule {}
