// Run inproc-server.js inside a single cluster worker, to isolate the cost of the cluster setup.
// Usage: node perf-harness/cluster-wrap.js <inproc-server args...>
const cluster = require('node:cluster');
if (cluster.isPrimary) {
  cluster.fork();
} else {
  require('./inproc-server.js');
}
