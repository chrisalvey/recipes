// Check if Firebase SDK loaded
if (typeof firebase === 'undefined') {
    console.error('[DEBUG] Firebase SDK not loaded! Check if CDN is accessible.');
    alert('Firebase SDK failed to load. Check your internet connection and try again.');
} else {
    console.log('[DEBUG] Firebase SDK loaded successfully');
}

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
console.log('[DEBUG] Initializing Firebase...');
try {
    firebase.initializeApp(firebaseConfig);
    console.log('[DEBUG] Firebase initialized successfully');
} catch (error) {
    console.error('[DEBUG] Failed to initialize Firebase:', error);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
console.log('[DEBUG] Firebase services initialized');

// Current user state
let currentUser = null;

// Authentication state observer
console.log('[DEBUG] Setting up auth state observer...');
auth.onAuthStateChanged((user) => {
    console.log('[DEBUG] Auth state changed. User:', user ? (user.email || 'Anonymous') : 'null');
    currentUser = user;
    updateAuthUI(user);

    if (user) {
        console.log('[DEBUG] User signed in:', user.email || 'Anonymous');
        console.log('[DEBUG] User ID:', user.uid);
        // Trigger app initialization or reload data
        if (window.onAuthStateChanged) {
            window.onAuthStateChanged(user);
        }
    } else {
        console.log('[DEBUG] User signed out, attempting auto sign-in...');
        // DEV MODE: Auto sign-in anonymously (remove this when enabling manual sign-in)
        signInAnonymously();
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
        console.log('[DEBUG] Attempting anonymous sign-in...');
        await auth.signInAnonymously();
        console.log('[DEBUG] Anonymous sign-in successful');
    } catch (error) {
        console.error('[DEBUG] Error signing in anonymously:', error);
        console.error('[DEBUG] Error code:', error.code);
        console.error('[DEBUG] Error message:', error.message);

        // Show user-friendly error message
        const recipesList = document.getElementById('recipes-list');
        if (recipesList) {
            recipesList.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: red;">
                    <h3>Unable to connect to Firebase</h3>
                    <p>${error.message}</p>
                    <p style="font-size: 0.9rem; color: #666; margin-top: 1rem;">
                        Error code: ${error.code}<br>
                        Try refreshing the page or check your internet connection.
                    </p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Reload Page
                    </button>
                </div>
            `;
        }

        alert('Failed to connect to Firebase: ' + error.message + '\n\nTry refreshing the page.');
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
