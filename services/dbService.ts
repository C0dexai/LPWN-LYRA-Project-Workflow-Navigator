import type { ChatMessage, Container } from '../types';

const DB_NAME = 'LyraProjectDB';
const DB_VERSION = 1;
const SUGGESTIONS_STORE = 'suggestions';
const AGENT_CHATS_STORE = 'agent_chats';
const CONTAINERS_STORE = 'containers';
const CONTAINERS_KEY = 'all_containers';

let db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(SUGGESTIONS_STORE)) {
        dbInstance.createObjectStore(SUGGESTIONS_STORE, { keyPath: 'activityName' });
      }
      if (!dbInstance.objectStoreNames.contains(AGENT_CHATS_STORE)) {
        dbInstance.createObjectStore(AGENT_CHATS_STORE, { keyPath: 'agentName' });
      }
      if (!dbInstance.objectStoreNames.contains(CONTAINERS_STORE)) {
        dbInstance.createObjectStore(CONTAINERS_STORE, { keyPath: 'id' });
      }
    };
  });
};

export const initDB = async () => {
  try {
    await openDB();
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
};

// --- Suggestions ---

export const saveSuggestion = async (activityName: string, suggestion: string): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(SUGGESTIONS_STORE, 'readwrite');
  const store = transaction.objectStore(SUGGESTIONS_STORE);
  store.put({ activityName, suggestion, timestamp: Date.now() });
};

export const getSuggestion = async (activityName: string): Promise<string | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SUGGESTIONS_STORE, 'readonly');
    const store = transaction.objectStore(SUGGESTIONS_STORE);
    const request = store.get(activityName);
    request.onsuccess = () => {
      resolve(request.result?.suggestion ?? null);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

// --- Agent Chats ---

export const saveAgentChat = async (agentName: string, messages: ChatMessage[]): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(AGENT_CHATS_STORE, 'readwrite');
  const store = transaction.objectStore(AGENT_CHATS_STORE);
  store.put({ agentName, messages });
};

export const getAgentChat = async (agentName: string): Promise<ChatMessage[] | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AGENT_CHATS_STORE, 'readonly');
    const store = transaction.objectStore(AGENT_CHATS_STORE);
    const request = store.get(agentName);
    request.onsuccess = () => {
      resolve(request.result?.messages ?? null);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

// --- Containers ---

export const saveContainers = async (containers: Container[]): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(CONTAINERS_STORE, 'readwrite');
  const store = transaction.objectStore(CONTAINERS_STORE);
  store.put({ id: CONTAINERS_KEY, containers });
};

export const getContainers = async (): Promise<Container[] | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CONTAINERS_STORE, 'readonly');
    const store = transaction.objectStore(CONTAINERS_STORE);
    const request = store.get(CONTAINERS_KEY);
    request.onsuccess = () => {
      resolve(request.result?.containers ?? null);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};