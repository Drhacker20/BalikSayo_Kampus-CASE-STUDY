import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { auth, db } from '../firebase.config';
import { collection, query, onSnapshot, orderBy, doc, getDoc, where } from 'firebase/firestore';

@Component({
  selector: 'app-conversations',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: false
})
export class ChatPage implements OnInit, OnDestroy {
  searchQuery: string = '';
  chats: any[] = [];
  filteredItems: any[] = [];
  currentUid: string | null = null;

  private unsubscribeChats: (() => void) | null = null;

  constructor(private navCtrl: NavController, private ngZone: NgZone) {}

  ngOnInit() {
    // ✅ Wait for currentUser to be ready
    this.currentUid = auth.currentUser?.uid || null;

    if (!this.currentUid) {
      // Listen for auth state changes if user is not yet initialized
      const unsubscribeAuth = auth.onAuthStateChanged(user => {
        if (user) {
          this.currentUid = user.uid;
          this.listenChats();
          unsubscribeAuth();
        }
      });
    } else {
      this.listenChats();
    }
  }

  ngOnDestroy() {
    if (this.unsubscribeChats) this.unsubscribeChats();
  }

  filterChats() {
    const queryStr = this.searchQuery.toLowerCase().trim();
    if (queryStr === '') {
      this.filteredItems = [...this.chats];
    } else {
      this.filteredItems = this.chats.filter(chat =>
        (chat.name || '').toLowerCase().includes(queryStr)
      );
    }
  }

  openChat(chat: any) {
    const participants = chat.participants || {};

    const finderId = participants.finderId || chat.reportedBy || null;
    const claimerId = participants.claimerId || chat.claimerId || null;

    this.navCtrl.navigateForward('/chat-view', {
      state: {
        chatName: chat.name,
        item: {
          id: chat.id || null,
          name: chat.name,
          reportedBy: chat.reportedBy || null,
          status: chat.status || 'Open',
          reportedByName: chat.reportedByName || null,
          reportedByAvatar: chat.avatar || null,
          reference: chat.itemRef || null
        },
        finderId,
        claimerId
      }
    });
  }

private listenChats() {
  if (!this.currentUid) return;

  const chatsRef = collection(db, 'chatList');
  const q = query(
    chatsRef,
    where('participantsArray', 'array-contains', this.currentUid),
    orderBy('lastTimestamp', 'desc')
  );

  this.unsubscribeChats = onSnapshot(q, async snapshot => {
    const chatList: any[] = [];

    for (const docSnap of snapshot.docs) {
      const chatData: any = docSnap.data() || {};
      const participants = chatData['participants'] || {};

      // Load meta info safely
      let meta: any = {};
      try {
        const metaRef = doc(db, `chatList/${docSnap.id}/meta/info`);
        const metaSnap = await getDoc(metaRef);
        if (metaSnap.exists()) meta = metaSnap.data();
      } catch (e) {
        meta = {};
      }

      // Determine who is the other user
      const otherUid =
        participants.finderId === this.currentUid
          ? participants.claimerId
          : participants.finderId;

      // Load other user info
      let otherUser: any = {};
      try {
        if (otherUid) {
          const userRef = doc(db, `users/${otherUid}`);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) otherUser = userSnap.data();
        }
      } catch (e) {
        otherUser = {};
      }

      // Determine display name
      const isCurrentUserFinder = participants.finderId === this.currentUid;
      const isCurrentUserClaimer = participants.claimerId === this.currentUid;

      let displayName = 'Unknown';
      if (isCurrentUserClaimer) {
        displayName = meta?.finderName || chatData.reportedByName || 'Finder';
      } else if (isCurrentUserFinder) {
        if (meta?.claimerIdentityUploaded && !meta?.claimerIdentityApproved) {
          displayName = '(Unverified Identity)';
        } else if (meta?.claimerIdentityUploaded && meta?.claimerIdentityApproved) {
          displayName = meta?.claimerIdentityName || 'Claimer';
        } else {
          displayName = 'Claimer';
        }
      }

      // Avatar fallback: otherUser.photoURL -> meta.avatar -> default
      const avatar =
        otherUser?.photoURL || chatData['avatar'] || 'assets/default-avatar.png';

      chatList.push({
        id: docSnap.id,
        name: displayName,
        message: chatData['lastMessage'] || '',
        time: chatData['lastTimestamp'] || null,
        avatar,
        reportedBy: chatData['reportedBy'] || null,
        status: chatData['status'] || 'Open',
        reportedByName: chatData['finderName'] || meta?.finderName || 'Finder',
        participants,
        itemRef: chatData['itemRef'] || null,
        isUnverified:
          isCurrentUserFinder &&
          meta?.claimerIdentityUploaded &&
          !meta?.claimerIdentityApproved
      });
    }

    // Update in Angular zone to trigger UI refresh
    this.ngZone.run(() => {
      this.chats = chatList;
      this.filterChats();
    });
  });
}

}
