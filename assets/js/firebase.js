import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyARKv0Qn-y-S4xPR1pQo4p1gxsM3WoPFHA",
  authDomain: "humapet-fea25.firebaseapp.com",
  projectId: "humapet-fea25",
  storageBucket: "humapet-fea25.firebasestorage.app",
  messagingSenderId: "474837072244",
  appId: "1:474837072244:web:51c6ccf22ed8fa12ab9421",
  measurementId: "G-XSMJJS9YSK"
};

const firebaseReady = Object.values(firebaseConfig).every((value) => (
  typeof value === "string" && value.trim() && !value.startsWith("COLE_")
));

let app = null;
let auth = null;
let db = null;

if (firebaseReady) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  console.info("HumaPet Social: Firebase conectado com sucesso.");
} else {
  console.info("HumaPet Social: Firebase ainda não configurado. Modo local/mockado ativo.");
}

export { app, auth, db, firebaseReady, firebaseConfig };