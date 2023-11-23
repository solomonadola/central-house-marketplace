// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "centralhousemarketplace.firebaseapp.com",
  projectId: "centralhousemarketplace",
  storageBucket: "centralhousemarketplace.appspot.com",
  messagingSenderId: "577830209078",
  appId: "1:577830209078:web:66c2d41f7fcee22baefa97",
  measurementId: "G-4EEDXHT6R0",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
