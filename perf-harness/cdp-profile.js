// Start/stop the V8 CPU profiler of a process over the inspector protocol.
// Usage: node cdp-profile.js <inspector-port> <out-file> <command...>
// Profiles while running the given command, within one inspector session.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const [ port, out, ...command ] = process.argv.slice(2);
(async() => {
  const [ { webSocketDebuggerUrl } ] = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    pending.get(msg.id)?.(msg);
  });
  const send = (method, params = {}) => new Promise((resolve) => {
    pending.set(++id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
  await send('Profiler.enable');
  await send('Profiler.setSamplingInterval', { interval: 100 });
  await send('Profiler.start');
  spawnSync(command[0], command.slice(1), { stdio: 'inherit' });
  const { result } = await send('Profiler.stop');
  fs.writeFileSync(out, JSON.stringify(result.profile));
  ws.close();
})();
