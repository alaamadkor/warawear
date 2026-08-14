import { doc, getDoc, setDoc, deleteDoc, collection, onSnapshot, query, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { Order, Customer } from '../store/useStore';

export async function saveOrderToFirestore(order: Order): Promise<void> {
  const docRef = doc(db, 'orders', order.id);
  await setDoc(docRef, order);
}

export async function updateOrderStatusInFirestore(orderId: string, status: Order['status']): Promise<void> {
  const docRef = doc(db, 'orders', orderId);
  await setDoc(docRef, { status }, { merge: true });
}

export async function updateOrderFieldsInFirestore(orderId: string, fields: Record<string, unknown>): Promise<void> {
  const docRef = doc(db, 'orders', orderId);
  await setDoc(docRef, fields, { merge: true });
}

export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  await deleteDoc(doc(db, 'orders', orderId));
}

export async function saveUnreadIdsToFirestore(ids: string[]): Promise<void> {
  const docRef = doc(db, 'unread', 'ids');
  await setDoc(docRef, { ids });
}

export async function loadAllOrdersFromFirestore(): Promise<Order[]> {
  const snapshot = await getDocs(query(collection(db, 'orders')));
  const orders: Order[] = [];
  snapshot.forEach((d) => orders.push(d.data() as Order));
  return orders;
}

export async function loadUnreadIdsFromFirestore(): Promise<string[]> {
  const docRef = doc(db, 'unread', 'ids');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data().ids || [];
  }
  return [];
}

export function listenOrders(callback: (orders: Order[]) => void): () => void {
  const q = query(collection(db, 'orders'));
  return onSnapshot(
    q,
    (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((d) => orders.push(d.data() as Order));
      callback(orders);
    },
    (error) => {
      console.error('❌ Firestore: onSnapshot orders ERROR', error);
    }
  );
}

export function listenUnreadIds(callback: (ids: string[]) => void): () => void {
  const docRef = doc(db, 'unread', 'ids');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data().ids || []);
      }
    },
    (error) => {
      console.error('❌ Firestore: onSnapshot unreadIds ERROR', error);
    }
  );
}

export async function saveCustomersToFirestore(customers: Customer[]): Promise<void> {
  const docRef = doc(db, 'data', 'customers');
  await setDoc(docRef, { customers, updatedAt: Date.now() });
}

export async function loadCustomersFromFirestore(): Promise<Customer[]> {
  const docRef = doc(db, 'data', 'customers');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data().customers || [];
  }
  return [];
}

export function listenCustomers(callback: (customers: Customer[]) => void): () => void {
  const docRef = doc(db, 'data', 'customers');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data().customers || []);
      }
    },
    (error) => {
      console.error('❌ Firestore: onSnapshot customers ERROR', error);
    }
  );
}
