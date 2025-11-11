const fs = require('fs');
const path = require('path');
const vm = require('vm');

async function run(){
  const enginePath = path.resolve(__dirname, '../electron-app/engine.js');
  const src = fs.readFileSync(enginePath, 'utf8');

  // Create a sandbox with a fake window so the engine attaches to window.NetworkEngine
  const sandbox = { window: {}, console, setTimeout, clearTimeout, Promise };
  vm.createContext(sandbox);
  try{
    vm.runInContext(src, sandbox, { filename: enginePath });
  }catch(e){
    console.error('Failed to evaluate engine.js:', e);
    process.exit(2);
  }

  const engine = sandbox.window.NetworkEngine;
  if (!engine || !engine.ping){
    console.error('NetworkEngine not found in engine.js sandbox');
    process.exit(3);
  }

  // Build a small topology: A - B - C
  const nodes = [
    { id: 'A', interfaces: [{ ip: '10.0.0.1' }], routes: [{ dest: '10.0.1.1', via: 'B' }] },
    { id: 'B', interfaces: [{ ip: '10.0.0.2' }] },
    { id: 'C', interfaces: [{ ip: '10.0.1.1' }] },
  ];
  const links = [ { from: 'A', to: 'B' }, { from: 'B', to: 'C' } ];

  console.log('Running ping from A -> 10.0.1.1 (should route via B -> C)');
  await new Promise(resolve => {
    engine.ping(nodes, links, 'A', '10.0.1.1', { onResult: (ok, msg)=>{
      console.log('Ping result:', ok, msg);
      resolve();
    }}).catch(err=>{ console.error('ping threw', err); resolve(); });
  });

  console.log('Running ping with low TTL (ttl=1) to cause TTL expired or unreachable');
  await new Promise(resolve => {
    engine.ping(nodes, links, 'A', '10.0.1.1', { onResult: (ok, msg)=>{
      console.log('Ping result (ttl=1):', ok, msg);
      resolve();
    }}, 1).catch(err=>{ console.error('ping threw', err); resolve(); });
  });

  console.log('Smoke test complete');
}

run().catch(e=>{ console.error('Test error', e); process.exit(1); });
