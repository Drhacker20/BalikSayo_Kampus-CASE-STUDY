import { Component, ViewChild, NgZone, OnInit } from '@angular/core';
import { IonPopover, ToastController } from '@ionic/angular';
import { db } from '../../firebase.config';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';

interface User {
  uid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  photoURL?: string;
}

interface MissingItem {
  id: string;
  itemName: string;
  location: string;
  date: string;
  reportedBy: string;
  status: 'pending' | 'approved' | 'declined';
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  standalone: false
})
export class AdminDashboardPage implements OnInit {

  @ViewChild('actionPopover') actionPopover!: IonPopover;

  selectedSegment = 'users';
  selectedUser: User | null = null;

  users: User[] = [];
  pendingItems: MissingItem[] = [];

  constructor(private toastCtrl: ToastController, private ngZone: NgZone) {}

  ngOnInit() {
    this.loadUsers();
    this.loadPendingItems();
  }

  // ==========================
  // 🔹 FETCH USERS
  // ==========================
  loadUsers() {
    const usersRef = collection(db, 'users');
    onSnapshot(usersRef, snapshot => {
      this.ngZone.run(() => {
        this.users = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            uid: data.uid,
            name: `${data.firstName.trim()} ${data.lastName.trim()}`,
            email: data.email,
            role: data.role,
            status: data.status || 'Active',
            photoURL: data.photoURL || ''
          };
        });
      });
    });
  }

  // ==========================
  // 🔹 FETCH PENDING ITEMS
  // ==========================
  loadPendingItems() {
    const itemsRef = collection(db, 'missingItems');
    const q = query(itemsRef, orderBy('createdAt', 'desc'));
    onSnapshot(q, snapshot => {
      this.ngZone.run(() => {
        this.pendingItems = snapshot.docs
          .map(doc => {
            const data = doc.data() as any;
            return {
              id: doc.id,
              itemName: data.itemName,
              location: data.location,
              date: data.date,
              reportedBy: data.reportedBy,
              status: data.status || 'pending'
            };
          })
          .filter(item => item.status === 'pending'); // only pending
      });
    });
  }

  // ==========================
  // 🔹 SEGMENT SWITCH
  // ==========================
  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
  }

  // ==========================
  // 🔹 POPUP USER ACTIONS
  // ==========================
  openPopover(ev: Event, user: User) {
    this.selectedUser = user;
    this.actionPopover.event = ev;
    this.actionPopover.present();
  }

  // ==========================
  // 🔹 SUSPEND USER
  // ==========================
  async suspendUser() {
    if (!this.selectedUser) return;
    const userRef = doc(db, 'users', this.selectedUser.uid);
    await updateDoc(userRef, { status: 'Suspended' });
    this.showToast(`${this.selectedUser.name} has been suspended`);
    this.actionPopover.dismiss();
  }

  // ==========================
  // 🔹 REMOVE SUSPENSION
  // ==========================
  async removeSuspension() {
    if (!this.selectedUser) return;
    const userRef = doc(db, 'users', this.selectedUser.uid);
    await updateDoc(userRef, { status: 'Active' });
    this.showToast(`Suspension removed from ${this.selectedUser.name}`);
    this.actionPopover.dismiss();
  }

  // ==========================
  // 🔹 APPROVE ITEM
  // ==========================
  async approveItem(item: MissingItem) {
    try {
      const itemRef = doc(db, 'missingItems', item.id);
      await updateDoc(itemRef, { status: 'approved' });
      this.showToast(`${item.itemName} approved`);
    } catch (err) {
      console.error('Error approving item:', err);
      this.showToast('Failed to approve item');
    }
  }

  // ==========================
  // 🔹 REJECT ITEM
  // ==========================
  async rejectItem(item: MissingItem) {
    try {
      const itemRef = doc(db, 'missingItems', item.id);
      await updateDoc(itemRef, { status: 'declined' });
      this.showToast(`${item.itemName} declined`);
    } catch (err) {
      console.error('Error declining item:', err);
      this.showToast('Failed to decline item');
    }
  }

  // ==========================
  // 🔹 SHOW TOAST
  // ==========================
  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'dark'
    });
    await toast.present();
  }
}
