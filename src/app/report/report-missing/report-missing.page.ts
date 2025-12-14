import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { auth, db } from '../../firebase.config';
import { collection, query, orderBy, onSnapshot, where, doc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-report-missing',
  templateUrl: './report-missing.page.html',
  styleUrls: ['./report-missing.page.scss'],
  standalone: false
})
export class ReportMissingPage implements OnInit, OnDestroy {

  selectedSegment: string = 'unclaimed';
  items: any[] = [];
  filteredItems: any[] = [];

  private unsubscribeItems: (() => void) | null = null;
  private authUnsubscribe: (() => void) | null = null;

  constructor(private ngZone: NgZone, private alertCtrl: AlertController, private router: Router) {}

  ngOnInit() {
    this.authUnsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) this.loadUserItems(user.uid);
    });
  }

  ngOnDestroy() {
    if (this.unsubscribeItems) this.unsubscribeItems();
    if (this.authUnsubscribe) this.authUnsubscribe();
  }

  // ==============================
  // 🔥 LOAD USER'S ITEMS FROM FIRESTORE
  // ==============================
loadUserItems(uid: string) {
  const itemsRef = collection(db, "missingItems");
  const q = query(itemsRef, where("uid", "==", uid), orderBy("createdAt", "desc"));

  if (this.unsubscribeItems) this.unsubscribeItems();

  this.unsubscribeItems = onSnapshot(
    q,
    (querySnapshot) => {
      this.ngZone.run(() => {
        this.items = querySnapshot.docs.map(doc => {
          const data = doc.data();
          let diffDays = 0;
          if (data['createdAt']?.toDate && typeof data['createdAt'].toDate === 'function') {
            const created = data['createdAt'].toDate();
            diffDays = Math.floor((new Date().getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          }

          return {
            id: doc.id,
            ...data,             
            name: data['itemName'],   // explicitly map for LostItemDetailsPage
            image: data['photo'],     // explicitly map for LostItemDetailsPage
            daysAgo: diffDays,
            claimed: !!data['claimedBy']
          };
        });

        this.filterItems();
      });
    },
    (error) => console.error("Error loading Firestore items:", error)
  );
}



  // ==============================
  // 🔹 SEGMENT SWITCH
  // ==============================
  setSegment(segment: string) {
    this.selectedSegment = segment;
    this.filterItems();
  }

  // ==============================
  // 🔹 FILTER ITEMS BASED ON SEGMENT
  // ==============================
  filterItems() {
    switch (this.selectedSegment) {
      case 'unclaimed':
        this.filteredItems = this.items.filter(i => !i.claimed);
        break;
      case 'claimed':
        this.filteredItems = this.items.filter(i => i.claimed);
        break;
      default:
        this.filteredItems = this.items;
    }
  }

  // ==============================
  // 🔹 OPEN ITEM DETAILS
  // ==============================
  openItemDetails(item: any) {
    this.router.navigate(['/lost-item-details'], {
      state: { item }
    });
  }

  // ==============================
// 🔹 EDIT ITEM (navigate to edit page)
// ==============================
editItem(item: any) {
  this.router.navigate(['/edit-lost-item'], { state: { item } });
}


  // ==============================
  // 🔹 REMOVE ITEM WITH CONFIRMATION DIALOG
  // ==============================
  async removeItem(item: any) {
    const alert = await this.alertCtrl.create({
      header: 'Remove Item',
      message: `Are you sure you want to remove "${item.name}"?`,
      mode: 'md',
      cssClass: 'custom-alert',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          handler: async () => {
            try {
              const docRef = doc(db, 'missingItems', item.id);
              await deleteDoc(docRef);
              console.log('Item removed successfully');
            } catch (err) {
              console.error('Error removing item:', err);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // ==============================
  // 📸 FILE UPLOAD LOGIC
  // ==============================
  preview: string | ArrayBuffer | null = null;

  triggerUpload() {
    const fileInput = document.getElementById('upload') as HTMLInputElement;
    fileInput?.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => this.preview = e.target?.result || null;
      reader.readAsDataURL(file);
    }
  }

  submitReport() {
    console.log('Report submitted!');
  }
}
