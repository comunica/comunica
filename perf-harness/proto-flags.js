// Preload module (node -r) that sets the prototype flags from DEFAULT_PROTO for all requests, without instrumentation.
globalThis.__proto = JSON.parse(process.env.DEFAULT_PROTO ?? '{}');
