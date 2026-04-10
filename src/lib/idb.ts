type StoreName = "vault";

const DB_NAME = "ciphervault";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("vault")) {
        db.createObjectStore("vault");
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export async function idbGet<T>(store: StoreName, key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const st = tx.objectStore(store);
    const req = st.get(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve((req.result as T) ?? null);
  });
}

export async function idbSet<T>(store: StoreName, key: string, value: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const st = tx.objectStore(store);
    const req = st.put(value as unknown, key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

export async function idbDel(store: StoreName, key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const st = tx.objectStore(store);
    const req = st.delete(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

