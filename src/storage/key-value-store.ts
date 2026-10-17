export type KeyValueStore = {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
};

export class MemoryStore implements KeyValueStore {
  private readonly data = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.data.set(key, structuredClone(value));
  }

  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }
}

function chromeStore(area: () => chrome.storage.StorageArea | undefined): KeyValueStore {
  return {
    async get<T>(key: string) {
      const storage = area();
      if (!storage) return undefined;
      const result = await storage.get(key);
      return result[key] as T | undefined;
    },
    async set<T>(key: string, value: T) {
      await area()?.set({ [key]: value });
    },
    async remove(key: string) {
      await area()?.remove(key);
    },
  };
}

// The area is read on each call so a test can swap the global `chrome` between them. Session
// storage is missing on some Chromium forks, which then simply forget dismissals sooner.
export const chromeLocalStore: KeyValueStore = chromeStore(() => chrome.storage.local);
export const chromeSessionStore: KeyValueStore = chromeStore(() => chrome.storage.session);
