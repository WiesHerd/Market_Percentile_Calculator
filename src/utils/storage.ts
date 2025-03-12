export const isLocalStorageAvailable = () => {
  try {
    if (typeof window === 'undefined') return false;
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

export const getFromStorage = (key: string): string | null => {
  if (!isLocalStorageAvailable()) {
    if (typeof window === 'undefined') {
      // Server-side rendering, return null silently
      return null;
    }
    console.log(`Local storage not available, returning default value for ${key}`);
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Error reading from storage for key ${key}:`, error);
    return null;
  }
};

export const saveToStorage = (key: string, value: any): void => {
  if (!isLocalStorageAvailable()) {
    if (typeof window === 'undefined') {
      // Server-side rendering, return silently
      return;
    }
    console.log(`Local storage not available, skipping save for ${key}`);
    return;
  }
  try {
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error(`Error saving to storage for key ${key}:`, error);
  }
}; 