const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function loadEngine(){
  const enginePath = path.resolve(__dirname, '../electron-app/engine.js');
  const src = fs.readFileSync(enginePath, 'utf8');
  const sandbox = { window: {}, console, setTimeout, clearTimeout, Promise };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: enginePath });
  const eng = sandbox.window.NetworkEngine;
  if (!eng) throw new Error('NetworkEngine not found');
  return eng;
}

async function testCIDR(){
  const engine = loadEngine();
  // internal helpers are not exported; exercise via parse-like behavior by calling ping with CIDR routes
  const nodes = [ { id:'A', interfaces:[{ip:'10.0.0.1'}], routes:[{dest:'10.0.1.0/24', via:'B'}] },
                  { id:'B', interfaces:[] },
                  { id:'C', interfaces:[{ip:'10.0.1.5'}] } ];
  const links = [ { from:'B', to:'C' } ]; // B connected to C, A not connected

  // Default TTL should succeed because A -> via B -> C
  let ok1, msg1;
  await new Promise(resolve=>{
    engine.ping(nodes, links, 'A', '10.0.1.5', { onResult: (ok,msg)=>{ ok1=ok; msg1=msg; resolve(); } });
  });
  assert.strictEqual(ok1, true, 'CIDR routed ping should succeed');

  // TTL=1 should expire because forwarding requires at least 2 hops
  let ok2, msg2;
  await new Promise(resolve=>{
    engine.ping(nodes, links, 'A', '10.0.1.5', { onResult: (ok,msg)=>{ ok2=ok; msg2=msg; resolve(); } }, 1);
  });
  assert.strictEqual(ok2, false, 'Ping with ttl=1 should fail (TTL expired or unreachable)');
  assert.ok(/TTL|expired|TTL expired/i.test(msg2) || /unreachable/i.test(msg2), 'Expected TTL expired or unreachable message');
}

async function testArpResolve(){
  const engine = loadEngine();
  const nodes = [ { id:'X', interfaces:[{ip:'1.1.1.1'}] }, { id:'Y', interfaces:[{ip:'2.2.2.2'}] }, { id:'Z', interfaces:[] } ];
  const links = [ { from:'X', to:'Z' } ];
  // X connected to Z, but not to Y
  const r1 = engine.arpResolve(nodes, links, 'X', '1.1.1.1');
  assert.strictEqual(r1, 'X');
  const r2 = engine.arpResolve(nodes, links, 'X', '2.2.2.2');
  assert.strictEqual(r2, null);
}

async function runAll(){
  console.log('Running engine unit tests...');
  await testArpResolve();
  console.log('arpResolve tests passed');
  await testCIDR();
  console.log('CIDR and ping routing tests passed');
  console.log('All tests passed');
}

runAll().catch(e=>{ console.error('Tests failed:', e); process.exit(1); });
