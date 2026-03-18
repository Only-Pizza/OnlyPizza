import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, onSnapshot, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyB3o8kaVED0jpu0hK7OmsvH2SGYhW3HLEM",
  authDomain: "only-pizzas.firebaseapp.com",
  projectId: "only-pizzas",
  storageBucket: "only-pizzas.firebasestorage.app",
  messagingSenderId: "452048702431",
  appId: "1:452048702431:web:2d696d06f9dfca3f3c526a",
  measurementId: "G-S4TF1XE18S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// SUGGESTED ADMIN CREDENTIALS:
// Email: onlypizzas@gmail.com 
// Password: pizzasimperial123

// --- IMGBB CONFIG ---
const IMGBB_API_KEY = "ea6a31b8d4d6e7ef9c7c19cd8d6c4d44";

async function uploadToImgBB(file) {
  if (!IMGBB_API_KEY || IMGBB_API_KEY === "TU_API_KEY_AQUI") {
    console.warn("ImgBB API Key no configurada. Usando fallback.");
    return null;
  }

  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    return data.data.url;
  } catch (err) {
    console.error("Error subiendo a ImgBB:", err);
    return null;
  }
}

// --- DATABASE SERVICE (Firebase Implementation) ---
const DB = {
  // Pizzas
  async getPizzas() {
    try {
      const q = query(collection(db, "pizzas"), orderBy("name"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error("Error cargando pizzas:", err);
      return [];
    }
  },

  async deletePizza(id) {
    try {
      const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await deleteDoc(doc(db, "pizzas", id));
      return true;
    } catch (err) {
      console.error("Error eliminando pizza:", err);
      return false;
    }
  },

  async savePizzas(pizzas) {
    // Note: This app edits individual pizzas, but we keep this for compatibility
    // In Firestore, we usually update specific docs.
    console.warn("savePizzas called. Recommended: Use individual doc updates.");
  },

  async addPizza(pizzaData, imageFile) {
    let imageUrl = pizzaData.image || null;

    if (imageFile) {
      const uploadedUrl = await uploadToImgBB(imageFile);
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const docRef = await addDoc(collection(db, "pizzas"), {
      ...pizzaData,
      image: imageUrl,
      timestamp: new Date().toISOString()
    });
    return docRef.id;
  },

  async updatePizza(id, pizzaData, imageFile) {
    try {
      let imageUrl = pizzaData.image;

      if (imageFile) {
        const uploadedUrl = await uploadToImgBB(imageFile);
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const pizzaRef = doc(db, "pizzas", id);
      await updateDoc(pizzaRef, {
        ...pizzaData,
        image: imageUrl,
        lastUpdate: new Date().toISOString()
      });
      return true;
    } catch (err) {
      console.error("Error actualizando pizza:", err);
      return false;
    }
  },

  // Orders
  async getOrders() {
    // Only get orders that are NOT archived (active dashboard)
    const q = query(
      collection(db, "orders"),
      where("archived", "==", false),
      orderBy("timestamp", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async addOrder(order) {
    const newOrder = {
      ...order,
      orderNumber: 'OP-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      timestamp: new Date().toISOString(),
      status: 'Recibido',
      archived: false // Default to not archived
    };
    const docRef = await addDoc(collection(db, "orders"), newOrder);
    return { ...newOrder, id: docRef.id };
  },

  async updateOrderStatus(id, status) {
    const orderRef = doc(db, "orders", id);
    await updateDoc(orderRef, { status });
  },

  // Listen for real-time changes (Tracking)
  listenToOrder(orderId, callback) {
    // Sanitización extra: eliminar espacios y normalizar mayúsculas
    const sanitizedId = orderId.trim().toUpperCase().replace(/\s+/g, '');
    
    // Try by OrderNumber
    const q = query(collection(db, "orders"), where("orderNumber", "==", sanitizedId));

    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      }
    });
  },

  // Daily Close Logic
  async closeDaySales() {
    try {
      const q = query(
        collection(db, "orders"),
        where("status", "==", "Entregada"),
        where("archived", "==", false)
      );
      const snapshot = await getDocs(q);
      const deliveredOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (deliveredOrders.length === 0) return { success: false, message: "No hay pedidos marcados como 'Entregada' para cerrar." };

      const totalSales = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      // Simple product breakdown by parsing "details"
      const productCounts = {};
      deliveredOrders.forEach(o => {
        const lines = (o.details || "").split('\n');
        lines.forEach(line => {
          const match = line.match(/(?:•\s*)?(\d+)x\s*(.+)/i);
          if (match) {
            const qty = parseInt(match[1]);
            const name = match[2].trim().toUpperCase();
            productCounts[name] = (productCounts[name] || 0) + qty;
          } else if (line.trim()) {
            // Fallback for lines without "Nx " format
            const name = line.trim().toUpperCase();
            productCounts[name] = (productCounts[name] || 0) + 1;
          }
        });
      });

      const dailyRecord = {
        date: new Date().toISOString(),
        orderCount: deliveredOrders.length,
        totalSales: totalSales,
        productRanking: productCounts, // Store the breakdown
        orderIds: deliveredOrders.map(o => o.id)
      };

      // 1. Create history record
      await addDoc(collection(db, "daily_history"), dailyRecord);

      // 2. Mark orders as archived
      const { writeBatch } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const batch = writeBatch(db);
      deliveredOrders.forEach(o => {
        const ref = doc(db, "orders", o.id);
        batch.update(ref, { archived: true });
      });
      await batch.commit();

      return { success: true, total: totalSales, count: deliveredOrders.length };
    } catch (err) {
      console.error("Error in closeDaySales:", err);
      throw err;
    }
  },

  async getDailyHistory() {
    const q = query(collection(db, "daily_history"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Offers
  async getOffers() {
    try {
      const q = query(collection(db, "offers"), orderBy("order"));
      const snapshot = await getDocs(q);
      const offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // If no offers exist, return defaults but don't save them yet
      if (offers.length === 0) {
        return [
          { id: 'off1', title: 'COMBO PAREJAS', desc: 'Pide 2 pizzas medianas y paga solo una. Válido de lunes a miércoles, ideal para una noche especial en casa.', tag: 'VÁLIDO LUN–MIÉ', discount: '2X1', featured: true, order: 1 },
          { id: 'off2', title: 'RETIRO EN LOCAL', desc: 'Descuento exclusivo al retirar en local. Sin costo de despacho adicional.', tag: 'TODO EL MES', discount: '30%', featured: false, order: 2 },
          { id: 'off3', title: 'BEBIDA + PIZZA', desc: 'Con cualquier pizza XXL te regalamos una bebida de 1.5L. ¡Sin costo!', tag: 'FINES DE SEMANA', discount: 'GRATIS', featured: false, order: 3 },
          { id: 'off4', title: 'COMBO FAMILIA', desc: '3 pizzas grandes + 2 bebidas 1.5L + postre de la casa por un precio especial. El combo perfecto para reuniones.', tag: '$27.990 CLP', discount: 'COMBO\nFAMILIA', featured: false, order: 4, fullWidth: true }
        ];
      }
      return offers;
    } catch (err) {
      console.error("Error cargando ofertas:", err);
      return [];
    }
  },

  async updateOffer(id, data) {
    try {
      const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await setDoc(doc(db, "offers", id), data, { merge: true });
      return true;
    } catch (err) {
      console.error("Error actualizando oferta:", err);
      return false;
    }
  },

  // Settings
  async getSettings() {
    try {
      const snapshot = await getDocs(collection(db, "settings"));
      const settings = {};
      snapshot.forEach(doc => { settings[doc.id] = doc.data(); });
      return settings;
    } catch (err) {
      console.error("Error cargando settings:", err);
      return {};
    }
  },

  async updateSetting(id, data) {
    try {
      const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await setDoc(doc(db, "settings", id), data, { merge: true });
      return true;
    } catch (err) {
      console.error("Error actualizando setting:", err);
      return false;
    }
  },

  // Helpers
  formatDate(isoString) {
    return new Date(isoString).toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  formatTime(isoString) {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('es-CL', {
        timeZone: 'America/Santiago',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (e) {
      console.error("Error formatting time:", e);
      return '--:--';
    }
  },

  // Auth (Firebase Auth)
  auth: {
    async login(email, pass) {
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        return true;
      } catch (err) {
        console.error("Login Error:", err.message);
        return false;
      }
    },
    isLoggedIn() {
      return !!auth.currentUser;
    },
    async logout() {
      await signOut(auth);
    },
    onAuthStateChanged(callback) {
      return onAuthStateChanged(auth, callback);
    }
  }
};

const Store = DB;
export { Store, DB, auth, db, uploadToImgBB };
window.Store = Store; // For debugging and non-module compatibility if needed
