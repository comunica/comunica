const fetchFn = globalThis.fetch;

export function fetch(...args) {
    return fetchFn(...args);
}
