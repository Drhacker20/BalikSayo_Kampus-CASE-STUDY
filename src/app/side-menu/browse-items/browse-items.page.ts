import { Component, OnInit, ViewEncapsulation, NgZone } from '@angular/core';
import { db } from '../../firebase.config';
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

@Component({
  selector: 'app-browse-items',
  templateUrl: './browse-items.page.html',
  styleUrls: ['./browse-items.page.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class BrowseItemsPage implements OnInit {

  allItems: any[] = [];
  items: any[] = [];

  selectedCategory: string = 'all';
  selectedLocation: string = 'all';

  private unsubscribeItems: (() => void) | null = null;

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    this.loadItemsFromFirestore();
  }

  ngOnDestroy(): void {
    if (this.unsubscribeItems) this.unsubscribeItems();
  }

  // 🔥 REALTIME FETCH
 loadItemsFromFirestore() {
  const itemsRef = collection(db, "missingItems");
  const q = query(itemsRef, orderBy("createdAt", "desc"));

  this.unsubscribeItems = onSnapshot(q, snapshot => {
    this.ngZone.run(() => {

      this.allItems = snapshot.docs
        .map(doc => {
          const data = doc.data() as any;
          return { 
            id: doc.id, 
            ...data, 
            reportedByName: data.reportedByName || data.reportedBy
          };
        })
        // ✅ Only approved and unclaimed items
        .filter(item => item.status === 'approved' && !item.claimed);

      // Format date
      this.allItems = this.allItems.map(item => {
        let displayDate = "";
        if (item.createdAt?.toDate) {
          const dateObj = item.createdAt.toDate();
          displayDate = dateObj.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
          });
        }
        return { ...item, displayDate };
      });

      this.filterItems();

    });
  });
}


  // 🔍 FILTERS
  filterItems() {
    this.items = this.allItems.filter(item => {
      const type = (item.type || "").toLowerCase();
      const categoryMatch =
        this.selectedCategory === "all" ||
        type === this.selectedCategory.toLowerCase();

      const location = (item.location || "").toLowerCase();
      const locationMatch =
        this.selectedLocation === "all" ||
        location.includes(this.selectedLocation.toLowerCase());

      return categoryMatch && locationMatch;
    });
  }

  clearFilters() {
    this.selectedCategory = 'all';
    this.selectedLocation = 'all';
    this.filterItems();
  }
}
