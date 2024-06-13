import { LRUCache } from "lru-cache";

const options = {
max: 500,

// for use with tracking overall storage size
maxSize: 5000,
sizeCalculation: () => {
    return 1
},

// for use when you need to clean up something when objects
// are evicted from the cache
dispose: () => {
},

// how long to live in ms
ttl: 1000 * 60 * 5,

// return stale items before removing from cache?
allowStale: false,

updateAgeOnGet: false,
updateAgeOnHas: false,
}

const cache:Cache = new LRUCache(options);
export default cache

interface Cache {
  get(key: string): any;
  set(key: string, value: any): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
  keys(): Iterable<string>;
  values(): Iterable<any>;
}
