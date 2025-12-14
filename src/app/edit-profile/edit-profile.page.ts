import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Keyboard } from '@capacitor/keyboard';
import { Platform, AlertController } from '@ionic/angular';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { auth, db, storage } from '../firebase.config';
import { User, updateEmail, updatePassword, deleteUser, updateProfile } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
  standalone: false
})
export class EditProfilePage implements OnInit, OnDestroy {
  profileImage = 'assets/default-avatar.png';
  sanitizedProfileImage: SafeUrl = this.profileImage;
  firstName = '';
  lastName = '';
  email = '';
  role = '';
  joined = '';

  passwordType1 = 'password';
  passwordType2 = 'password';
  password1 = '';
  password2 = '';

  private currentUser: User | null = null;
  private selectedFile: File | null = null;
  private keyboardListeners: any[] = [];
  private unsubscribeUserDoc: (() => void) | null = null;

  constructor(
    private platform: Platform,
    private alertCtrl: AlertController,
    private ngZone: NgZone,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    document.body.style.height = '100vh';
    document.body.style.overflow = 'hidden';
    const ionApp = document.querySelector('ion-app') as HTMLElement;
    if (ionApp) ionApp.style.height = '100vh';

    this.keyboardListeners.push(
      Keyboard.addListener('keyboardWillShow', () => {
        document.body.style.height = '100vh';
        document.body.style.overflow = 'hidden';
      }),
      Keyboard.addListener('keyboardWillHide', () => {
        document.body.style.height = '';
        document.body.style.overflow = '';
      })
    );
  }

  ngOnDestroy() {
    this.keyboardListeners.forEach(listener => listener.remove());
    if (this.unsubscribeUserDoc) this.unsubscribeUserDoc();
  }

  async ionViewWillEnter() {
    await this.loadUserData();
  }

  // 🔹 Real-time subscription to Firestore user doc
  private async loadUserData() {
    const user = auth.currentUser;
    if (!user) return;
    this.currentUser = user;

    const userDocRef = doc(db, 'users', user.uid);

    // Unsubscribe previous listener if exists
    if (this.unsubscribeUserDoc) this.unsubscribeUserDoc();

    this.unsubscribeUserDoc = onSnapshot(userDocRef, (userSnap) => {
      this.ngZone.run(() => {
        if (userSnap.exists()) {
          const data = userSnap.data() as any;

          this.firstName = data.firstName ?? '';
          this.lastName = data.lastName ?? '';
          this.email = data.email ?? user.email ?? '';
          this.role = data.role ?? '';
          this.password1 = data.password ?? '';
          this.password2 = data.password ?? '';

          this.profileImage = data.photoURL || user.photoURL || 'assets/default-avatar.png';
          this.sanitizedProfileImage = this.sanitizer.bypassSecurityTrustUrl(this.profileImage);

          // handle createdAt safely
          let createdAt: Date;
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            createdAt = data.createdAt.toDate();
          } else if (typeof data.createdAt === 'string') {
            createdAt = new Date(data.createdAt);
          } else {
            createdAt = new Date(user.metadata.creationTime || Date.now());
          }

          this.joined = this.formatJoinDate(createdAt);
        }
      });
    }, (error) => console.error('Error loading user doc:', error));
  }

  private formatJoinDate(date: Date): string {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }

  togglePassword(field: number) {
    if (field === 1) this.passwordType1 = this.passwordType1 === 'password' ? 'text' : 'password';
    else if (field === 2) this.passwordType2 = this.passwordType2 === 'password' ? 'text' : 'password';
  }

  openFilePicker() {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.ngZone.run(() => {
          this.profileImage = e.target.result;
          this.sanitizedProfileImage = this.sanitizer.bypassSecurityTrustUrl(this.profileImage);
        });
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  async saveProfile() {
    if (!this.currentUser) return;
    try {
      let photoURL = this.profileImage;

      if (this.selectedFile) {
        const storageRef = ref(storage, `users/${this.currentUser.uid}/profile.jpg`);
        await uploadBytes(storageRef, this.selectedFile);
        photoURL = await getDownloadURL(storageRef);
      }

      const userDocRef = doc(db, 'users', this.currentUser.uid);
      await updateDoc(userDocRef, {
        firstName: this.firstName,
        lastName: this.lastName,
        role: this.role,
        photoURL: photoURL,
        password: this.password1
      });

      if (this.currentUser.email !== this.email) await updateEmail(this.currentUser, this.email);
      if (this.password1 && this.password1 === this.password2) await updatePassword(this.currentUser, this.password1);

      await updateProfile(this.currentUser, {
        displayName: `${this.firstName} ${this.lastName}`,
        photoURL: photoURL
      });

      this.profileImage = photoURL;
      this.sanitizedProfileImage = this.sanitizer.bypassSecurityTrustUrl(photoURL);

      const successAlert = await this.alertCtrl.create({
        header: 'Success',
        message: 'Profile updated successfully!',
        buttons: ['OK']
      });
      await successAlert.present();
    } catch (err) {
      console.error('❌ Profile update error:', err);
      const errorAlert = await this.alertCtrl.create({
        header: 'Error',
        message: 'Failed to update profile. Please try again.',
        buttons: ['OK']
      });
      await errorAlert.present();
    }
  }

  async deleteProfile() {
    if (!this.currentUser) return;
    const confirmAlert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: 'Are you sure you want to delete your account? This cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          handler: async () => {
            try {
              await deleteUser(this.currentUser!);
              const deletedAlert = await this.alertCtrl.create({
                header: 'Deleted',
                message: 'Account deleted!',
                buttons: ['OK']
              });
              await deletedAlert.present();
              window.location.href = '/login';
            } catch (err) {
              console.error('❌ Delete error:', err);
              const errorAlert = await this.alertCtrl.create({
                header: 'Error',
                message: 'Failed to delete account. Please try again.',
                buttons: ['OK']
              });
              await errorAlert.present();
            }
          }
        }
      ]
    });
    await confirmAlert.present();
  }

  goBack() {
    window.history.back();
  }
}
