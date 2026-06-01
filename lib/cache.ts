export function createCache<T>() {
  const store = new Map<string, T>();
  return {
    get: (key: string) => store.get(key),
    set: (key: string, value: T) => {
      store.set(key, value);
    },
  };
}
