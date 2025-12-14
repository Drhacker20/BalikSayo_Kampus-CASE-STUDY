import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular';
import { updateDoc, doc } from 'firebase/firestore';
import { auth, db, storage } from '../firebase.config';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

@Component({
  selector: 'app-edit-lost-item',
  templateUrl: './edit-lost-item.page.html',
  styleUrls: ['./edit-lost-item.page.scss'],
  standalone: false
})
export class EditLostItemPage implements OnInit {

  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  item: any;
  itemId = '';

  // Form fields
  itemName = '';
  selectedType = '';
  otherType = '';
  selectedLocation = '';
  otherLocation = '';
  description = '';
  photo: string | null = null;  
  oldPhotoURL = '';

  // Date/Time
  showPicker = false;
  selectedDateTime = '';
  formattedDate = '';
  formattedTime = '';
  maxDateTime = '';

  constructor(
    private router: Router,
    private alertCtrl: AlertController,
    private navCtrl: NavController
  ) {}

  ngOnInit() {
    // 📌 Get passed item using router navigation state
    const nav = this.router.getCurrentNavigation();
    this.item = nav?.extras?.state?.['item'];

    if (!this.item) {
      console.error("NO ITEM FOUND");
      return;
    }

    console.log("Loaded item:", this.item);

    this.itemId = this.item.id;

    // Load values into form
    this.itemName = this.item.itemName;
    this.selectedType = this.item.type;
    this.selectedLocation = this.item.location;
    this.description = this.item.description;

    this.photo = this.item.photo;
    this.oldPhotoURL = this.item.photo;

    // date/time
    this.formattedDate = this.item.date;
    this.formattedTime = this.item.time;

    this.setMaxDateTime();
  }

  // Max datetime
  setMaxDateTime() {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    this.maxDateTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  }

  togglePicker() {
    this.showPicker = !this.showPicker;
  }

  closePicker() {
    this.showPicker = false;
  }

  updateDateTime() {
    const date = new Date(this.selectedDateTime);

    this.formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    this.formattedTime = date.toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit'
    });
  }

  // Photo input
  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => this.photo = reader.result as string;
      reader.readAsDataURL(file);
    }
  }

  goBack() {
    this.navCtrl.back();
  }

  // SAVE UPDATE
async saveChanges() {
  const typeToSave = this.selectedType === 'others' ? this.otherType : this.selectedType;
  const locationToSave = this.selectedLocation === 'others' ? this.otherLocation : this.selectedLocation;

  if (!this.itemName || !typeToSave || !locationToSave) {
    const alert = await this.alertCtrl.create({
      header: 'Missing Info',
      message: 'Please complete all required fields.',
      buttons: ['OK']
    });
    return alert.present();
  }

  // 🔥 Confirmation before saving
  const confirm = await this.alertCtrl.create({
    header: 'Confirm Update',
    message: 'Are you sure you want to save these changes?',
    mode: 'md',
    cssClass: 'custom-alert',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Yes, Update',
        handler: async () => {
          
          let finalPhotoURL = this.oldPhotoURL;

          // Upload new image if changed
          if (this.photo && this.photo !== this.oldPhotoURL) {
            const storageRef = ref(storage, `missingItems/${Date.now()}_${this.itemName}.png`);
            await uploadString(storageRef, this.photo, 'data_url');
            finalPhotoURL = await getDownloadURL(storageRef);
          }

          // Update Firestore
          await updateDoc(doc(db, 'missingItems', this.itemId), {
            itemName: this.itemName,
            type: typeToSave,
            location: locationToSave,
            description: this.description,
            photo: finalPhotoURL,
            date: this.formattedDate,
            time: this.formattedTime
          });

          const success = await this.alertCtrl.create({
            header: 'Success',
            message: 'Item updated successfully!',
            buttons: ['OK']
          });

          await success.present();
          this.goBack();
        }
      }
    ]
  });

  await confirm.present();
}


  onTypeChange() {
    if (this.selectedType !== 'others') this.otherType = '';
  }

  onLocationChange() {
    if (this.selectedLocation !== 'others') this.otherLocation = '';
  }
}
