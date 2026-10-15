/**
 * IndexedDB storage utility for caching generated Veo MP4 video blobs
 * Keyed by lesson ID / SOP title to allow instant replays across visits.
 */

const DB_NAME = 'FieldTrainerVideoCache';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a video blob for a specific lesson/module ID.
 */
export async function saveVideoBlob(lessonId: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, lessonId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[videoCache] Could not save video to IndexedDB:', err);
  }
}

/**
 * Retrieve a cached video blob for a specific lesson/module ID.
 */
export async function getVideoBlob(lessonId: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(lessonId);

      req.onsuccess = () => {
        const result = req.result;
        if (result instanceof Blob) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[videoCache] Could not retrieve video from IndexedDB:', err);
    return null;
  }
}

/**
 * Delete a cached video for a specific lesson/module ID.
 */
export async function removeVideoBlob(lessonId: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(lessonId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[videoCache] Could not remove video from IndexedDB:', err);
  }
}

/**
 * Save a specific clip blob for a multi-step lesson demo.
 */
export async function saveClipBlob(lessonId: string, clipIndex: number, blob: Blob): Promise<void> {
  return saveVideoBlob(`${lessonId}__clip_${clipIndex}`, blob);
}

/**
 * Retrieve a specific clip blob for a multi-step lesson demo.
 */
export async function getClipBlob(lessonId: string, clipIndex: number): Promise<Blob | null> {
  return getVideoBlob(`${lessonId}__clip_${clipIndex}`);
}

/**
 * Remove all cached clips for a lesson.
 */
export async function removeAllLessonClips(lessonId: string, maxClips: number = 6): Promise<void> {
  await removeVideoBlob(lessonId);
  for (let i = 1; i <= maxClips; i++) {
    await removeVideoBlob(`${lessonId}__clip_${i}`);
  }
}
