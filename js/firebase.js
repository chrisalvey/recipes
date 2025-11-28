// Firebase Configuration
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZtzD-Ggjt5wfV6dstM0AVSh63qGe1oas",
  authDomain: "recipes-63053.firebaseapp.com",
  projectId: "recipes-63053",
  storageBucket: "recipes-63053.firebasestorage.app",
  messagingSenderId: "704130371134",
  appId: "1:704130371134:web:1f3d857d77206cd75b8b6f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Current user state
let currentUser = null;

// Authentication state observer
auth.onAuthStateChanged((user) => {
    currentUser = user;
    updateAuthUI(user);

    if (user) {
        console.log('User signed in:', user.email || 'Anonymous');
        // Trigger app initialization or reload data
        if (window.onAuthStateChanged) {
            window.onAuthStateChanged(user);
        }
    } else {
        console.log('User signed out');
    }
});

// Update authentication UI
function updateAuthUI(user) {
    const signInBtn = document.getElementById('sign-in-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    const userEmail = document.getElementById('user-email');

    if (user) {
        signInBtn.style.display = 'none';
        signOutBtn.style.display = 'block';
        userEmail.textContent = user.email || 'Anonymous User';
    } else {
        signInBtn.style.display = 'block';
        signOutBtn.style.display = 'none';
        userEmail.textContent = '';
    }
}

// Sign in with Google
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
    } catch (error) {
        console.error('Error signing in with Google:', error);
        alert('Failed to sign in with Google: ' + error.message);
    }
}

// Sign in anonymously
async function signInAnonymously() {
    try {
        await auth.signInAnonymously();
    } catch (error) {
        console.error('Error signing in anonymously:', error);
        alert('Failed to sign in: ' + error.message);
    }
}

// Sign out
async function signOut() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Error signing out:', error);
        alert('Failed to sign out: ' + error.message);
    }
}

// Get current user ID
function getCurrentUserId() {
    return currentUser ? currentUser.uid : null;
}

// Check if user is authenticated
function isAuthenticated() {
    return currentUser !== null;
}

// Initialize auth event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const signInBtn = document.getElementById('sign-in-btn');
    const signOutBtn = document.getElementById('sign-out-btn');

    if (signInBtn) {
        signInBtn.addEventListener('click', () => {
            // Show options for Google or Anonymous sign-in
            if (confirm('Sign in with Google? (Cancel for Anonymous sign-in)')) {
                signInWithGoogle();
            } else {
                signInAnonymously();
            }
        });
    }

    if (signOutBtn) {
        signOutBtn.addEventListener('click', signOut);
    }
});
