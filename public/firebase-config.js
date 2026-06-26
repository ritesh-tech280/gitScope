// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBexa3DoxfSAPYh5-iQhI5SWXTeukLbtWM",
  authDomain: "gitscope-ddd5d.firebaseapp.com",
  projectId: "gitscope-ddd5d",
  storageBucket: "gitscope-ddd5d.firebasestorage.app",
  messagingSenderId: "42438851300",
  appId: "1:42438851300:web:eb1a8bb3819bd3ea2a0af1",
  measurementId: "G-546JM16F0V"
};

// Initialize Firebase using compatibility library loaded via CDN
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
}