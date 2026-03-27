/**
 * Lightweight observable store with localStorage persistence.
 * Modules use this to share and persist data across navigation.
 */

class Store {
  #state = {};
  #listeners = new Map();

  /**
   * Get a deep clone of a stored value.
   * @param {string} key
   * @param {*} [defaultValue]
   */
  get(key, defaultValue = undefined) {
    return key in this.#state
      ? structuredClone(this.#state[key])
      : defaultValue;
  }

  /**
   * Set a value, persist to localStorage, and notify subscribers.
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    this.#state[key] = value;
    this.#persist(key, value);
    const subs = this.#listeners.get(key);
    if (subs) subs.forEach(fn => fn(structuredClone(value)));
  }

  /**
   * Update a stored object by merging partial data.
   * @param {string} key
   * @param {Object} partial
   */
  update(key, partial) {
    const current = this.#state[key] ?? {};
    this.set(key, { ...current, ...partial });
  }

  /**
   * Subscribe to changes on a key.
   * @param {string} key
   * @param {Function} fn  Called with the new value on every set()
   * @returns {Function}   Unsubscribe function — call in unmount()
   */
  subscribe(key, fn) {
    if (!this.#listeners.has(key)) this.#listeners.set(key, new Set());
    this.#listeners.get(key).add(fn);
    return () => this.#listeners.get(key)?.delete(fn);
  }

  /**
   * Load persisted data from localStorage.
   * Call once during app init or per-key during module mount.
   * @param {string} key
   */
  hydrate(key) {
    try {
      const raw = localStorage.getItem(`dnd5e_${key}`);
      if (raw !== null) {
        this.#state[key] = JSON.parse(raw);
      }
    } catch {
      // Corrupted data — silently ignore, will overwrite on next set()
    }
  }

  /** Remove a key from state and localStorage. */
  delete(key) {
    delete this.#state[key];
    try { localStorage.removeItem(`dnd5e_${key}`); } catch { /* ignore */ }
    this.#listeners.get(key)?.forEach(fn => fn(undefined));
  }

  #persist(key, value) {
    try {
      localStorage.setItem(`dnd5e_${key}`, JSON.stringify(value));
    } catch {
      // Quota exceeded — silently ignore
    }
  }
}

// Singleton — import this instance in every module
export const store = new Store();
