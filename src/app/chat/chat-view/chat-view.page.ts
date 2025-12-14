import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { NavController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IonicSafeString } from '@ionic/angular';


// Firebase
import { auth, db } from '../../firebase.config';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';

@Component({
  selector: 'app-chat-view',
  templateUrl: './chat-view.page.html',
  styleUrls: ['./chat-view.page.scss'],
  standalone: false
})
export class ChatViewPage implements OnInit, OnDestroy {
  chatName: string = 'Chat';
  chatText: string = '';
  selectedImages: string[] = [];
  messages: any[] = [];

  finderId: string | null = null;
  claimerId: string | null = null;

 chatMeta: {
  claimerIdentityUploaded?: boolean;
  claimerIdentityName?: string | null;
  claimerIdentityApproved?: boolean;
  participants?: { claimerId?: string; finderId?: string };
  createdAt?: any;
  status?: string;
  finderName?: string; // ✅ ADD THIS LINE
  handoverCompleted?: boolean;     // ← NEW FIELD
  handoverCompletedAt?: any;
} = {};


  userRole: 'claimer' | 'finder' = 'claimer';
  itemData: any;
  currentUid: string | null = null;

  private unsubscribeMessages: (() => void) | null = null;
  private unsubscribeMeta: (() => void) | null = null;

  constructor(
    private navCtrl: NavController,
    private router: Router,
    private alertCtrl: AlertController,
    private sanitizer: DomSanitizer,
    private ngZone: NgZone
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.chatName = navigation.extras.state['chatName'] || 'Reporter';
      this.itemData = navigation.extras.state['item'];
      this.finderId = navigation.extras.state['finderId'];
      this.claimerId = navigation.extras.state['claimerId'];
      // Assign reportedByName safely
this.itemData.reportedByName =
  this.itemData?.reportedByName || this.itemData?.reportedBy || 'Finder';

    }
  }

  async ngOnInit() {
    this.currentUid = auth.currentUser?.uid || null;
    if (!this.itemData?.id) return;

    this.userRole = this.currentUid === this.finderId ? 'finder' : 'claimer';

    await this.ensureChatMetaAndRoot();
    this.listenChatMeta();
    this.listenMessages();
  }

  ngOnDestroy() {
    this.unsubscribeMessages?.();
    this.unsubscribeMeta?.();
  }

  goBack() {
    this.navCtrl.back();
  }

  get identityConfirmed(): boolean {
    return !!this.chatMeta.claimerIdentityUploaded;
  }

  get claimerValidated(): boolean {
    return !!this.chatMeta.claimerIdentityApproved;
  }

  confirmIdentity() {
    this.uploadIdentity();
  }

  private rootChatDocRef() {
    return doc(db, `chatList/${this.itemData.id}`);
  }

  private chatMetaDocRef() {
    return doc(db, `chatList/${this.itemData.id}/meta/info`);

  }

  private messagesCollectionRef() {
    return collection(db, `chatList/${this.itemData.id}/messages`);
  }

private async ensureChatMetaAndRoot() {
  const rootRef = this.rootChatDocRef();
  const metaRef = this.chatMetaDocRef();
  const rootSnap = await getDoc(rootRef);
  const metaSnap = await getDoc(metaRef);

  const finderId = this.finderId;
  const claimerId = this.claimerId;

  // ------------------------
  // Fixed participants
  // ------------------------
  const rootDataSnap = rootSnap.exists() ? rootSnap.data() : {};

  const fixedParticipants = {
  finderId: finderId || rootDataSnap?.['participants']?.['finderId'] || this.finderId,
  claimerId: claimerId || rootDataSnap?.['participants']?.['claimerId'] || this.claimerId
};

// This is the correct, clean finder display name
const actualFinderName = this.itemData?.reportedByName || 'Finder';


await setDoc(rootRef, { 
  participants: fixedParticipants,
  finderName: actualFinderName
}, { merge: true });

await setDoc(metaRef, { 
  participants: fixedParticipants,
  finderName: actualFinderName
}, { merge: true });


  const participantsArray = [fixedParticipants.finderId, fixedParticipants.claimerId].filter(Boolean);

  // ------------------------
  // Root Chat Doc
  // ------------------------
  const rootData = {
  chatId: this.itemData.id,
  name: actualFinderName,
  avatar: this.itemData?.reportedByAvatar || 'assets/default-avatar.png',
  reportedBy: finderId, // UID for internal reference
  claimerId: fixedParticipants.claimerId,
  status: this.itemData?.status || 'Open',
  participantsArray,
  itemRef: this.itemData?.reference || null,
  lastMessage: '',
  lastTimestamp: serverTimestamp(),
  createdAt: rootSnap.exists() ? rootSnap.data()?.['createdAt'] || serverTimestamp() : serverTimestamp(),
  participants: fixedParticipants
};



  await setDoc(rootRef, rootData, { merge: true });

  // ------------------------
  // Meta Doc
  // ------------------------
const finderName = this.itemData?.reportedByName || 'Finder';
const metaData = {
  claimerIdentityUploaded: metaSnap.exists() ? metaSnap.data()?.['claimerIdentityUploaded'] || false : false,
  claimerIdentityApproved: metaSnap.exists() ? metaSnap.data()?.['claimerIdentityApproved'] || false : false,
  claimerIdentityName: metaSnap.exists() ? metaSnap.data()?.['claimerIdentityName'] || null : null,
  participants: fixedParticipants,
  createdAt: metaSnap.exists() ? metaSnap.data()?.['createdAt'] || serverTimestamp() : serverTimestamp(),
  status: this.itemData?.status || 'Open',
  initialized: metaSnap.exists() ? metaSnap.data()?.['initialized'] || false : false,
  finderName // ✅ Use name, not UID
};


  await setDoc(metaRef, metaData, { merge: true });

  // Generate fixed codes ONLY if missing
const fixedClaimerCode = metaSnap.exists() && metaSnap.data()['claimerFullCode']
  ? metaSnap.data()['claimerFullCode']
  : Math.floor(1000 + Math.random() * 9000).toString();

const fixedFinderCode = metaSnap.exists() && metaSnap.data()['finderFullCode']
  ? metaSnap.data()['finderFullCode']
  : Math.floor(1000 + Math.random() * 9000).toString();

await setDoc(metaRef, {
  claimerFullCode: fixedClaimerCode,
  finderFullCode: fixedFinderCode,
}, { merge: true });

}


private listenChatMeta() {
  const metaRef = this.chatMetaDocRef();
  this.unsubscribeMeta = onSnapshot(metaRef, (snap) => {
    this.ngZone.run(() => {
      if (!snap.exists()) return;
      const data = snap.data();

      // 🔥 Proper merge (NEW values overwrite old values)
    this.chatMeta = {
  ...this.chatMeta,
  claimerIdentityUploaded: data['claimerIdentityUploaded'],
  claimerIdentityName: data['claimerIdentityName'] || null,
  claimerIdentityApproved: data['claimerIdentityApproved'],
  participants: data['participants'],
  createdAt: data['createdAt'],
  status: data['status'],
  finderName:
    (data['finderName'] && data['finderName'].length < 20 ? data['finderName'] : null) ||
    this.itemData?.reportedByName ||
    'Finder',
  handoverCompleted: data['handoverCompleted'] || false,     // ← FIXED: MAY COMMA NA!
  handoverCompletedAt: data['handoverCompletedAt'] || null    // ← DAGDAG NA RIN PARA SURE
};
      // ----------------------------
      // FIX participants auto-fill
      // ----------------------------
      const participantsData = data['participants'];

      if (participantsData) {
        const p = participantsData;

      if (!p['claimerId'] && this.claimerId) {
  const updated = {
    ...p,
    claimerId: this.claimerId
  };

  updateDoc(this.chatMetaDocRef(), {
    participants: updated,
    finderName: this.chatMeta.finderName // 🔥 preserve name
  });

  updateDoc(this.rootChatDocRef(), {
    participants: updated,
    finderName: this.chatMeta.finderName // 🔥 preserve name
  });
}

      }
// UPDATE CHAT NAME PROPERLY
if (this.userRole === 'finder') {
  // Finder always sees the Claimer's name only
  const claimerName = this.chatMeta.claimerIdentityName;

  if (claimerName && this.chatMeta.claimerIdentityApproved) {
    this.chatName = claimerName; // ✅ approved claimer name
  } else if (this.chatMeta.claimerIdentityUploaded && !this.chatMeta.claimerIdentityApproved) {
    this.chatName = 'Unverified Identity'; // uploaded pero hindi approved
  } else {
    this.chatName = 'Claimer'; // fallback
  }
} else {
  // Claimer sees Finder's real name
  this.chatName =
    this.chatMeta.finderName || this.itemData?.reportedByName || 'Finder';
}


    });
  });
}


  private listenMessages() {
    const messagesRef = this.messagesCollectionRef();
    const q = query(messagesRef, orderBy('time', 'asc'));

    this.unsubscribeMessages = onSnapshot(q, async (snapshot) => {
      this.ngZone.run(async () => {
        this.messages = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const time = data['time'] as Timestamp | null;
          const ts = time?.toMillis?.() ?? Date.now();

          return {
            id: docSnap.id,
            text: data['text'],
            sender: data['sender'],
            rawTime: new Date(ts),
            relativeTime: this.computeRelativeTime(new Date(ts)),
            showExact: false
          };
        });

        if (this.messages.length === 0) {
          const metaRef = this.chatMetaDocRef();
          const metaSnap = await getDoc(metaRef);

          if (metaSnap.exists() && !metaSnap.data()?.['initialized']) {
            await addDoc(messagesRef, {
              text: `Hello po, ikaw ba yung nakakita ng ${this.itemData?.name || 'item'}?`,
              sender: this.claimerId,
              time: serverTimestamp()
            });
            await addDoc(messagesRef, {
              text: `Yes po, that’s right. Please confirm your identity first.`,
              sender: this.finderId,
              time: serverTimestamp()
            });

            await updateDoc(metaRef, { initialized: true }).catch(() =>
              setDoc(metaRef, { initialized: true }, { merge: true })
            );
          }
        }
      });
    });
  }

  toggleShowExactTime(index: number) {
    if (!this.messages[index]) return;
    this.messages[index].showExact = !this.messages[index].showExact;
    if (this.messages[index].showExact) {
      const d = this.messages[index].rawTime;
      this.messages[index].exactTime = d ? d.toLocaleString() : '';
    }
  }

  private computeRelativeTime(dateObj?: Date | null): string {
    if (!dateObj) return '';
    const now = Date.now();
    const diff = now - dateObj.getTime();
    const sec = Math.floor(diff / 1000);

    if (sec < 5) return 'now';
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    return `${Math.floor(hr / 24)}d`;
  }
  // ============================================================================
  async uploadIdentity() {
    if (this.userRole !== 'claimer') return;

    const alertBox = await this.alertCtrl.create({
      header: 'Confirm Your Identity',
      inputs: [{ name: 'fullName', type: 'text', placeholder: 'Full Name' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Upload Photo',
          handler: (data) => {
            const fullName = (data.fullName || '').trim();
            if (!fullName) {
              this.showToast('Please enter your full name.');
              return false;
            }

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.click();

            fileInput.onchange = () => {
              const file = fileInput.files?.[0];
              if (!file) {
                this.showToast('No file selected.');
                return;
              }

              const reader = new FileReader();
              reader.onload = async () => {
                const dataUrl = reader.result as string;

                await addDoc(this.messagesCollectionRef(), {
                  text: `<b>Identity Submitted:</b><br>${fullName}<br><img src="${dataUrl}" width="140"/><br><i>(awaiting verification by finder)</i>`,
                  sender: this.currentUid,
                  time: serverTimestamp()
                });

                // Update meta only; do NOT change root chat name yet
                await setDoc(
                  this.chatMetaDocRef(),
                  {
                    claimerIdentityUploaded: true,
                    claimerIdentityName: fullName
                  },
                  { merge: true }
                );

                this.chatMeta.claimerIdentityUploaded = true;
                this.chatMeta.claimerIdentityName = fullName;

                this.showToast('Identity uploaded. Please wait for finder to approve.');
              };

              reader.readAsDataURL(file);
            };

            return true;
          }
        }
      ]
    });

    await alertBox.present();
  }

  async confirmClaimerIdentity() {
    if (this.userRole !== 'finder') return;

    const confirm = await this.alertCtrl.create({
      header: 'Approve Identity?',
      message: 'Do you confirm that the uploaded identity matches the claimer?',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Yes, Approve',
          handler: async () => {
            await setDoc(this.chatMetaDocRef(), { claimerIdentityApproved: true }, { merge: true });

            await addDoc(this.messagesCollectionRef(), {
              text: `<b>Claimer Identity Verified ✅</b><br>You may now proceed to handover.`,
              sender: this.currentUid,
              time: serverTimestamp()
            });

            const metaSnap = await getDoc(this.chatMetaDocRef());
            const claimerName = metaSnap.data()?.['claimerIdentityName'] || 'Claimer';

            // Update root chat name AFTER approval
            await setDoc(
              this.rootChatDocRef(),
              {
                name: claimerName,
                lastMessage: `Claimer identity verified`,
                lastTimestamp: serverTimestamp()
              },
              { merge: true }
            );

            await setDoc(
  this.rootChatDocRef(),
  { participants: this.chatMeta.participants },
  { merge: true }
);


            this.showToast('Claimer identity approved.');
          }
        }
      ]
    });

    await confirm.present();
  }
  // ============================================================================
  // Messaging
  // ============================================================================
  pickImage() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.click();

    fileInput.onchange = () => {
      const files = fileInput.files;
      if (files) {
        for (let i = 0; i < files.length; i++) {
          this.addImage(files[i]);
        }
      }
    };
  }

  addImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImages.push(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeImage(index: number) {
    this.selectedImages.splice(index, 1);
  }

  async sendMessage() {
    if (this.userRole === 'claimer') {
      const uploaded = !!this.chatMeta.claimerIdentityUploaded;
      const approved = !!this.chatMeta.claimerIdentityApproved;

      if (!uploaded) return this.showToast('Please upload your identity before sending messages.');
      if (!approved) return this.showToast('Please wait for finder approval.');
    }

    if (!this.chatText && this.selectedImages.length === 0) return;

    const senderId = this.currentUid;

    if (this.chatText.trim()) {
      await addDoc(this.messagesCollectionRef(), {
        text: this.chatText,
        sender: senderId,
        time: serverTimestamp()
      });

      await setDoc(
        this.rootChatDocRef(),
        {
          lastMessage: this.chatText,
          lastTimestamp: serverTimestamp()
        },
        { merge: true }
      );
    }

    if (this.selectedImages.length > 0) {
      for (const img of this.selectedImages) {
        await addDoc(this.messagesCollectionRef(), {
          text: `<img src="${img}" class="sent-image"/>`,
          sender: senderId,
          time: serverTimestamp()
        });

        await setDoc(
          this.rootChatDocRef(),
          {
            lastMessage: '[Image]',
            lastTimestamp: serverTimestamp()
          },
          { merge: true }
        );
      }
    }

    this.chatText = '';
    this.selectedImages = [];
  }
  

async startHandoverValidation() {
  const metaRef = this.chatMetaDocRef();
  let metaSnap = await getDoc(metaRef);

  if (!metaSnap.exists() || !metaSnap.data()?.['claimerFullCode'] || !metaSnap.data()?.['finderFullCode']) {
    const c1 = Math.floor(1000 + Math.random() * 9000).toString().padStart(4, '0');
    const c2 = Math.floor(1000 + Math.random() * 9000).toString().padStart(4, '0');
    await setDoc(metaRef, { claimerFullCode: c1, finderFullCode: c2 }, { merge: true });
    metaSnap = await getDoc(metaRef);
  }

  const data = metaSnap.data()!;
  const claimerCode = (data['claimerFullCode'] || '0000') as string;
  const finderCode = (data['finderFullCode'] || '0000') as string;

  const myCode = this.userRole === 'claimer' ? claimerCode : finderCode;
  const otherCode = this.userRole === 'claimer' ? finderCode : claimerCode;
  const partial = otherCode.substring(0, 2);

  const alert = await this.alertCtrl.create({
    header: this.userRole === 'claimer' ? 'Confirm Reception' : 'Confirm Handover',
    message: '',
    cssClass: 'handover-grab-style',
    inputs: [
      {
        name: 'code',
        type: 'tel',
        value: partial,                    // Pre-fill ang first 2 digits
        placeholder: `${partial} _ _`,     // Visual guide
        attributes: { 
          maxlength: 4, 
          inputmode: 'numeric',
          autocomplete: 'off'
        }
      }
    ],
    buttons: [
      { text: 'Cancel', role: 'cancel', cssClass: 'btn-cancel' },
      {
        text: 'Verify',
        cssClass: 'btn-verify',
        handler: (v) => {
          const entered = (v.code || '').trim();
          if (entered === otherCode) {
            this.finishHandoverSuccess();
            return true;
          } else {
            this.showCodeError();
            return false;
          }
        }
      }
    ]
  });

  await alert.present();

  // INJECT ANG EXACT DESIGN NA GUSTO MO — KAGAYA NG GRAB!
  const messageEl = document.querySelector('.handover-grab-style .alert-message');
  if (messageEl) {
    messageEl.innerHTML = `
      <div style="text-align:center; padding:32px 24px; font-family:system-ui,-apple-system,sans-serif">
        <div style="color:#666; font-size:15px; margin-bottom:8px">
          Your 4-digit verification code
        </div>
        <div style="font-size:56px; font-weight:900; color:#111; letter-spacing:12px; margin:28px 0;
                    background:#f0faff; padding:28px 20px; border-radius:24px;
                    box-shadow:0 12px 35px rgba(0,180,255,0.25); border:3px solid #00d4ff">
          ${myCode}
        </div>

        <div style="color:#555; font-size:16px; margin:40px 0 16px; font-weight:600">
          Enter the last 2 digits:
        </div>

        

        <div style="background:#e8f5ff; color:#0066cc; padding:20px; border-radius:20px; 
                    font-size:15px; font-weight:500; line-height:1.6; border:2px solid #b3e0ff">
          Ask the other person for their missing 2 digits to complete the handover
        </div>
      </div>
    `;
  }
}

async finishHandoverSuccess() {
  const metaRef = this.chatMetaDocRef();
  const rootRef = this.rootChatDocRef();

  // Read current meta data
  const metaSnap = await getDoc(metaRef);
  const meta = metaSnap.exists() ? metaSnap.data() : {};

  // 1) Mark **only this user** as verified
  const updateData: any = {};

  if (this.userRole === 'claimer') {
    updateData.claimerVerifiedHandover = true;
  } else {
    updateData.finderVerifiedHandover = true;
  }

  await setDoc(metaRef, updateData, { merge: true });

  // 2) Check if BOTH have verified
  const claimerDone =
  meta['claimerVerifiedHandover'] || updateData['claimerVerifiedHandover'];

const finderDone =
  meta['finderVerifiedHandover'] || updateData['finderVerifiedHandover'];

  if (!claimerDone || !finderDone) {
    // Not both → show banner only to the verifying user
    await addDoc(this.messagesCollectionRef(), {
      text: `<b>Verification Completed</b><br>You have successfully entered your code. Waiting for the other user.`,
      sender: this.currentUid,
      time: serverTimestamp()
    });

    this.showToast("Step verified. Waiting for the other party.");
    return;
  }

  // 3) If BOTH have verified → full handover completion
  await setDoc(metaRef, {
    status: 'Completed',
    handoverCompleted: true,
    handoverCompletedAt: serverTimestamp(),
    handoverCompletedBy: this.currentUid
  }, { merge: true });

  await setDoc(rootRef, {
    status: 'Completed',
    lastMessage: 'Handover successfully verified',
    lastTimestamp: serverTimestamp()
  }, { merge: true });

  // Add success message
  await addDoc(this.messagesCollectionRef(), {
    text: `<b>Handover Success</b><br>The item has been securely handed over.`,
    sender: this.currentUid,
    time: serverTimestamp()
  });

  // Update item as claimed
  const itemRef = doc(db, "missingItems", this.itemData.id);
  await setDoc(itemRef, {
    claimed: true,
    claimedAt: serverTimestamp(),
    claimedBy: this.claimerId
  }, { merge: true });

  this.showToast("Handover Completed Successfully!");
}


  async showCodeError() {
    const alertBox = await this.alertCtrl.create({
      header: 'Incorrect Code',
      message: 'The code entered does not match. Please try again.',
      buttons: ['OK']
    });
    await alertBox.present();
  }

  async showToast(message: string) {
    const alertBox = await this.alertCtrl.create({
      header: 'Notice',
      message,
      buttons: ['OK']
    });
    await alertBox.present();
  }
}
