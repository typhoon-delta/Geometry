// Kho khoá–giá trị trong IndexedDB của trình duyệt (bản 1.5): chứa được hàng trăm MB, dùng cho bản nháp có ảnh lớn,
// lịch sử bản nháp và hàng chờ lưu lên kho bài khi mất mạng. Mọi hàm không bao giờ ném lỗi: trình duyệt chặn lưu
// trữ (chế độ riêng tư, file:// ở vài trình duyệt) thì get trả về undefined, set trả về false.
const DB = 'hinh-hoc-dong';
const STORE = 'kv';
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbp;
}

function run(mode, fn) {
  return open().then((db) => new Promise((resolve) => {
    if (!db) return resolve(undefined);
    try {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(mode === 'readonly' ? req.result : true);
      tx.onerror = tx.onabort = () => resolve(mode === 'readonly' ? undefined : false);
    } catch {
      resolve(mode === 'readonly' ? undefined : false);
    }
  }));
}

export const idbGet = (key) => run('readonly', (s) => s.get(key));
export const idbSet = (key, value) => run('readwrite', (s) => s.put(value, key));
export const idbDel = (key) => run('readwrite', (s) => s.delete(key));
