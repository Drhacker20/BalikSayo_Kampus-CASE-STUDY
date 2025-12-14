import { Component, ElementRef, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { db } from '../firebase.config';
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

@Component({
  selector: 'app-all-items',
  templateUrl: './all-items.page.html',
  styleUrls: ['./all-items.page.scss'],
  standalone: false
})
export class AllItemsPage implements OnInit, OnDestroy {

  selectedSegment = 'today';
  items: any[] = [];
  filteredItems: any[] = [];

  private unsubscribeItems: (() => void) | null = null;

  constructor(
    private elementRef: ElementRef,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.loadItemsFromFirestore();
  }

  ngOnDestroy() {
    if (this.unsubscribeItems) this.unsubscribeItems();
  }

  // ================================
  // 🔹 TYPE ICONS
  // ================================
  typeIcons: { [key: string]: string } = {
    electronics: 'phone-portrait-outline',
    jewelry: 'diamond-outline',
    keys: 'key-outline',
    clothing: 'shirt-outline',
    others: 'cube-outline'
  };

  getTypeIcon(type: string) {
    return this.typeIcons[type?.toLowerCase()] || 'cube-outline';
  }

  // ==============================
  // 🔥 LOAD ITEMS FROM FIRESTORE
  // ==============================
loadItemsFromFirestore() {
  const itemsRef = collection(db, "missingItems");
  const q = query(itemsRef, orderBy("createdAt", "desc"));

  this.unsubscribeItems = onSnapshot(
    q,
    (querySnapshot) => {
      this.ngZone.run(() => {
        // Map doc data and cast properly
        this.items = querySnapshot.docs
          .map(doc => {
            const data = doc.data() as {
              status?: string;
              createdAt?: any;
              claimed?: boolean;
              [key: string]: any;
            };
            return { id: doc.id, ...data };
          })
          .filter(item => item.status === 'approved'); // now TypeScript knows status exists

        // Compute daysAgo safely
        this.items = this.items.map(item => {
          let diffDays = 0;
          if (item.createdAt?.toDate && typeof item.createdAt.toDate === 'function') {
            const created = item.createdAt.toDate();
            const now = new Date();
            diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          }
          return { ...item, daysAgo: diffDays };
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
  changeSegment(segment: string) {
    this.selectedSegment = segment;
    this.filterItems();
  }

  // ==============================
  // 🔹 FILTER ITEMS BASED ON SEGMENT
  // ==============================
 filterItems() {
  switch (this.selectedSegment) {
    case 'today':
      this.filteredItems = this.items.filter(
        i => i.daysAgo === 0 && i.claimed !== true
      );
      break;

    case 'more1day':
      this.filteredItems = this.items.filter(
        i => i.daysAgo >= 1 && i.claimed !== true // ✅ include 1 day ago
      );
      break;

    case 'claimed':
      this.filteredItems = this.items.filter(
        i => i.claimed === true
      );
      break;

    default:
      this.filteredItems = this.items.filter(
        i => i.claimed !== true
      );
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
  // 🔹 GO BACK
  // ==============================
  goBack() {
    this.router.navigate(['/tabs/home']);
  }
}
