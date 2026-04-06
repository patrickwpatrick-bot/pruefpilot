/**
 * storage.ts — Abstraction over localStorage
 * Handles JSON serialization, defaults, and quota errors
 */

class StorageError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'StorageError'
  }
}

/**
 * Get a value from localStorage with type safety
 * @param key Storage key
 * @param defaultValue Default value if key doesn't exist or error occurs
 * @returns The stored value or default
 */
export function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue
    return JSON.parse(item) as T
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.warn(`Invalid JSON in localStorage key "${key}":`, err)
    }
    return defaultValue
  }
}

/**
 * Set a value in localStorage
 * @param key Storage key
 * @param value Value to store (will be JSON serialized)
 * @throws StorageError if quota exceeded or storage unavailable
 */
export function setStorage<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value)
    localStorage.setItem(key, serialized)
  } catch (err) {
    if (err instanceof Error && err.name === 'QuotaExceededError') {
      throw new StorageError('localStorage quota exceeded', 'QUOTA_EXCEEDED')
    }
    if (err instanceof Error && err.message.includes('private')) {
      throw new StorageError('localStorage not available (private mode?)', 'NOT_AVAILABLE')
    }
    throw new StorageError('Failed to store value', 'UNKNOWN')
  }
}

/**
 * Remove a value from localStorage
 * @param key Storage key
 */
export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (err) {
    console.warn(`Failed to remove localStorage key "${key}":`, err)
  }
}

/**
 * Clear all items with a given prefix
 * @param prefix String prefix to match
 */
export function clearStorageByPrefix(prefix: string): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (err) {
    console.warn('Failed to clear storage by prefix:', err)
  }
}

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Type-safe storage hooks for React
 */
export interface UseStorageOptions<T> {
  defaultValue: T
  serialize?: (value: T) => string
  deserialize?: (value: string) => T
}

export function useStorage<T>(key: string, options: UseStorageOptions<T>) {
  const defaultValue = options.defaultValue
  const serialize = options.serialize || JSON.stringify
  const deserialize = options.deserialize || JSON.parse

  return {
    get: (): T => {
      try {
        const item = localStorage.getItem(key)
        return item ? deserialize(item) : defaultValue
      } catch {
        return defaultValue
      }
    },
    set: (value: T): void => {
      try {
        localStorage.setItem(key, serialize(value))
      } catch (err) {
        console.warn(`Failed to set storage key "${key}":`, err)
      }
    },
    remove: (): void => {
      try {
        localStorage.removeItem(key)
      } catch (err) {
        console.warn(`Failed to remove storage key "${key}":`, err)
      }
    },
  }
}

export default {
  get: getStorage,
  set: setStorage,
  remove: removeStorage,
  clearByPrefix: clearStorageByPrefix,
  isAvailable: isStorageAvailable,
  useStorage,
  StorageError,
}
