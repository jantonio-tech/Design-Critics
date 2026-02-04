import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCvWsgyPtxRL_zhEvZxb7hJf4M7U93wBqY",
    authDomain: "dc-tracker-prestamype.firebaseapp.com",
    projectId: "dc-tracker-prestamype",
    storageBucket: "dc-tracker-prestamype.firebasestorage.app",
    messagingSenderId: "361814771154",
    appId: "1:361814771154:web:860d287f6cc8b984bb3eab",
    measurementId: "G-VZ5273YGQ3"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);


}

export default firebase;
