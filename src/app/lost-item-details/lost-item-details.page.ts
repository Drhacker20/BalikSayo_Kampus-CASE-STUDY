import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { auth } from '../firebase.config'; // Get current user

@Component({
  selector: 'app-lost-item-details',
  templateUrl: './lost-item-details.page.html',
  styleUrls: ['./lost-item-details.page.scss'],
  standalone: false
})
export class LostItemDetailsPage implements OnInit {

  item: any;
  currentUserId: string | null = null;
  isOwner: boolean = false; // Hide CLAIM button if true
  isClaimed: boolean = false;

  constructor(private navCtrl: NavController) {}

  ngOnInit() {
    // 🔑 Get logged in user's UID
    this.currentUserId = auth.currentUser?.uid || null;

    // 📦 Get passed item from router
    const nav = history.state;

    if (nav && nav.item) {
      const raw = nav.item;

      // Map to local item format
 this.item = {
  ...raw,
  image: raw.photo,
  name: raw.itemName,
  dateFound: raw.date,
  timeFound: raw.time,
  location: raw.location,
  type: raw.type,
  status: raw.status,
  description: raw.description,

  // Finder info
  reportedBy: raw.reportedBy,          // UID (keep for reference)
  reportedByName: raw.reportedByName || raw.reportedBy, // ✅ Use name
  uid: raw.uid
};


      // 🟦 Check if YOU are the owner
      // (You should not see CLAIM button)
      this.isOwner = this.currentUserId === this.item.uid;
      this.isClaimed = this.item.claimed === true;
    }
  }

  goBack() {
    this.navCtrl.back();
  }

  // 🎯 Claim Item
  claimItem() {
    if (!this.item) return;

    this.navCtrl.navigateForward('/chat-view', {
      state: {
        chatName: this.item?.reportedBy || "Reporter",

        // 🔹 Item Info
        itemId: this.item?.id,
        item: this.item,

        // 🔹 Claimer = current user who clicked CLAIM
        claimerId: this.currentUserId,

        // 🔹 Finder = owner / reporter of the post
        finderId: this.item?.uid,
       reportedByName: this.item?.name || this.item?.reportedBy // name field
      }
    });
  }
}
