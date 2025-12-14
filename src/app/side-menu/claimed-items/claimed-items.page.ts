import { Component, OnInit, ViewEncapsulation, NgZone } from '@angular/core';
import { db } from '../../firebase.config';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';

@Component({
  selector: 'app-claimed-items',
  templateUrl: './claimed-items.page.html',
  styleUrls: ['./claimed-items.page.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class ClaimedItemsPage implements OnInit {

  claimedItems: any[] = [];

  constructor(private ngZone: NgZone) { }

  ngOnInit() {
    this.loadClaimedItems();
  }

  async loadClaimedItems() {
    const itemsRef = collection(db, 'missingItems');
    const q = query(itemsRef, where('claimed', '==', true));

    onSnapshot(q, async snapshot => {
      this.ngZone.run(async () => {
        const items = await Promise.all(snapshot.docs.map(async docSnap => {
          const data = docSnap.data() as any;

          // Kunin ang name ng claimedBy mula sa users collection
          let claimedByName = '';
          if (data.claimedBy) {
            const userRef = doc(db, 'users', data.claimedBy);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data() as any;
              claimedByName = `${userData.firstName} ${userData.lastName}`.trim();
            }
          }

          // Kunin ang reportedByName kung wala, fallback sa reportedBy
          const reportedByName = data.reportedByName || data.reportedBy;

          // Format dates
          const foundDate = data.createdAt?.toDate?.()
            ? data.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : data.date;

          const claimedDate = data.claimedAt?.toDate?.()
            ? data.claimedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '';

          return {
            name: data.itemName,
            category: data.type,
            location: data.location,
            foundDate,
            reportedBy: reportedByName,
            claimedBy: claimedByName,
            claimedDate,
            image: data.photo || 'assets/placeholder.png'
          };
        }));

        // Sort by claimedDate newest first
        this.claimedItems = items.sort((a, b) =>
          new Date(b.claimedDate).getTime() - new Date(a.claimedDate).getTime()
        );
      });
    });
  }
}
