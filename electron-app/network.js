// Lightweight network editor + simulation stub
const canvas = document.getElementById('topology');
const inspector = document.getElementById('inspector');
const hackingLog = document.getElementById('hackingLog');
const saveBtn = document.getElementById('saveNet');
const loadBtn = document.getElementById('loadNet');
const simulateBtn = document.getElementById('simulateBtn');
const backBtn = document.getElementById('back');

canvas.width = canvas.clientWidth || 900;
canvas.height = 600;
const ctx = canvas.getContext('2d');

let nodes = []; // {id,type,x,y,label}
// nodes now include interfaces and services: interfaces: [{name,ip}], services: [{port,proto,name}], compromised:bool
let links = []; // {from,to}
let selected = null;
let nextId = 1;
let linking = { active:false, from:null };

function log(msg){ hackingLog.textContent += '['+new Date().toLocaleTimeString()+'] '+msg+'\n'; hackingLog.scrollTop = hackingLog.scrollHeight; }

// palette drag handling
document.querySelectorAll('.device').forEach(d => {
  d.addEventListener('dragstart', (e)=>{ e.dataTransfer.setData('text/device', d.dataset.type); });
});

canvas.addEventListener('dragover', (e)=>{ e.preventDefault(); });
canvas.addEventListener('drop', (e)=>{
  e.preventDefault();
  const type = e.dataTransfer.getData('text/device');
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left; const y = e.clientY - rect.top;
  if (type){ addNode(type,x,y); draw(); }
});

canvas.addEventListener('click', (e)=>{
  const p = getMousePos(e);
  const node = nodes.find(n=>Math.hypot(n.x-p.x,n.y-p.y) < 24);
  if (node) { selected = node; showInspector(node); renderInterfaces(node); } else { selected = null; inspector.innerHTML='No device selected'; renderInterfaces(null); }
  draw();
});

// link by dragging from node to node
canvas.addEventListener('mousedown', (e)=>{
  const p = getMousePos(e);
  const node = nodes.find(n=>Math.hypot(n.x-p.x,n.y-p.y) < 24);
  if (node){ linking.active=true; linking.from=node.id; }
});
canvas.addEventListener('mouseup', (e)=>{
  if (!linking.active) return;
  const p = getMousePos(e);
  const target = nodes.find(n=>Math.hypot(n.x-p.x,n.y-p.y) < 24);
  if (target && target.id !== linking.from){ links.push({ from: linking.from, to: target.id }); draw(); log('Linked '+linking.from+' -> '+target.id); }
  linking.active=false; linking.from=null;
});
canvas.addEventListener('mousemove', (e)=>{
  if (!linking.active) return;
  // draw temporary line overlay
  draw();
  const p = getMousePos(e);
  const fromNode = nodes.find(n=>n.id===linking.from);
  if (fromNode){ ctx.strokeStyle='#888'; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(fromNode.x, fromNode.y); ctx.lineTo(p.x,p.y); ctx.stroke(); ctx.setLineDash([]); }
});

function getMousePos(e){ const r=canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

function addNode(type,x,y){ const n={ id: nextId++, type, x, y, label:type+'-'+(nextId-1), config:{} }; nodes.push(n); log('Added '+type); }

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // links
  ctx.strokeStyle='#444'; ctx.lineWidth=2;
  links.forEach(l=>{
    const a = nodes.find(n=>n.id===l.from); const b = nodes.find(n=>n.id===l.to);
    if (!a||!b) return;
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
  });
  // nodes
  nodes.forEach(n=>{
    ctx.beginPath(); ctx.fillStyle = (selected&&selected.id===n.id)?'#ffd':'#fff'; ctx.strokeStyle='#333'; ctx.lineWidth=1.5;
    ctx.arc(n.x,n.y,20,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#000'; ctx.font='12px monospace'; ctx.textAlign='center'; ctx.fillText(n.label, n.x, n.y+35);
  });
}

function showInspector(node){ inspector.innerHTML = `<div><strong>${node.label}</strong> (${node.type})</div><div class="small">ID: ${node.id}</div><div style="margin-top:8px"><label>Label: <input id="lbl" value="${node.label}"></label></div><div style="margin-top:8px"><button id="linkBtn">Link to selected</button> <button id="removeBtn">Remove</button></div>`;
  document.getElementById('lbl').addEventListener('input', (e)=>{ node.label=e.target.value; draw(); });
  document.getElementById('removeBtn').addEventListener('click', ()=>{ nodes = nodes.filter(n=>n.id!==node.id); links = links.filter(l=>l.from!==node.id && l.to!==node.id); selected=null; inspector.innerHTML='No device selected'; draw(); log('Removed node'); });
  document.getElementById('linkBtn').addEventListener('click', ()=>{
    if (!selected) return alert('Select a node to be source first (click)');
    const targetId = prompt('Enter target node id to link to:');
    const t = parseInt(targetId);
    if (!isNaN(t) && nodes.find(n=>n.id===t)) { links.push({ from:selected.id, to:t }); draw(); log('Linked '+selected.id+' -> '+t); }
  });
}

function renderInterfaces(node){
  const el = document.getElementById('interfaces');
  if (!node) { el.innerHTML = 'Select a device to view interfaces'; return; }
  node.interfaces = node.interfaces || [{ name: 'eth0', ip: '' }];
  node.services = node.services || [];
  node.routes = node.routes || [];
  let html = '<div class="small">';
  node.interfaces.forEach((iface, idx)=>{
    html += `<div> <input data-idx="${idx}" class="iface-ip" value="${iface.ip||''}" placeholder="IP (e.g. 10.0.0.1)"> <span class="small">${iface.name}</span></div>`;
  });
  html += `<div style="margin-top:6px"><button id="addIface">Add Interface</button></div>`;
  html += '<div style="margin-top:8px"><strong>Services</strong></div>';
  node.services.forEach((s,si)=>{ html += `<div class="small" data-si="${si}">${s.name||'service'} - ${s.port}/${s.proto} ${s.open?'<em>open</em>':'<em>closed</em>'} <button class="svc-edit" data-si="${si}">Edit</button> <button class="svc-rm" data-si="${si}">Remove</button></div>`; });
  // Routes UI
  html += '<div style="margin-top:8px"><strong>Static Routes</strong></div>';
  node.routes.forEach((r,ri)=>{ html += `<div class="small" data-ri="${ri}">dest: <code>${r.dest}</code> via: <code>${r.via}</code> <button class="route-edit" data-ri="${ri}">Edit</button> <button class="route-rm" data-ri="${ri}">Remove</button></div>`; });
  html += `<div style="margin-top:6px"><button id="addRoute">Add Route</button></div>`;
  html += '</div>';
  el.innerHTML = html;
  // wire events
  el.querySelectorAll('.iface-ip').forEach(i=>{
    i.addEventListener('input', (e)=>{
      const idx = parseInt(e.target.dataset.idx); node.interfaces[idx].ip = e.target.value; draw();
    });
  });
  document.getElementById('addIface').addEventListener('click', ()=>{ node.interfaces.push({ name: 'eth'+node.interfaces.length, ip: '' }); renderInterfaces(node); });
  // service edit/remove
  el.querySelectorAll('.svc-rm').forEach(b=>{ b.addEventListener('click', (ev)=>{ const si=parseInt(ev.target.dataset.si); node.services.splice(si,1); renderInterfaces(node); }); });
  el.querySelectorAll('.svc-edit').forEach(b=>{ b.addEventListener('click', (ev)=>{ const si=parseInt(ev.target.dataset.si); const s=node.services[si]; const name=prompt('Service name', s.name||''); if (name===null) return; const port=parseInt(prompt('Port', s.port||80)); if (isNaN(port)) return alert('Invalid port'); const open = confirm('Open?'); s.name=name; s.port=port; s.open=open; renderInterfaces(node); }); });
  // Route remove/edit handlers
  el.querySelectorAll('.route-rm').forEach(b=>{ b.addEventListener('click', (ev)=>{ const ri=parseInt(ev.target.dataset.ri); node.routes.splice(ri,1); renderInterfaces(node); }); });
  el.querySelectorAll('.route-edit').forEach(b=>{ b.addEventListener('click', (ev)=>{ const ri=parseInt(ev.target.dataset.ri); const r=node.routes[ri]; const dest = prompt('Destination (CIDR or IP)', r.dest||''); if (dest===null) return; // choose via
    // Build via selection prompt listing nodes
    const viaList = nodes.map(n=>`${n.id}:${n.label}`).join('\n');
    const viaRaw = prompt('Via node id (choose from)\n'+viaList, r.via||''); if (viaRaw===null) return; const via = viaRaw.trim(); if (!nodes.find(n=>String(n.id)===String(via))) return alert('Invalid via node id'); r.dest = dest; r.via = via; renderInterfaces(node); }); });
  document.getElementById('addRoute').addEventListener('click', ()=>{
    const dest = prompt('Destination (CIDR or single IP), e.g. 10.0.1.0/24 or 10.0.1.5'); if (dest===null) return;
    const viaList = nodes.map(n=>`${n.id}:${n.label}`).join('\n');
    const viaRaw = prompt('Via node id (choose from)\n'+viaList, nodes[0] ? String(nodes[0].id) : ''); if (viaRaw===null) return; const via = viaRaw.trim(); if (!nodes.find(n=>String(n.id)===String(via))){ alert('Invalid via node id'); return; }
    node.routes.push({ dest: dest.trim(), via }); renderInterfaces(node);
  });
}

// simple simulate: pick a random link and animate a dot
function simulate(){
  if (links.length===0){ log('No links to simulate'); return; }
  const l = links[Math.floor(Math.random()*links.length)];
  const a = nodes.find(n=>n.id===l.from), b = nodes.find(n=>n.id===l.to);
  if (!a||!b) return;
  log(`Simulating packet from ${a.label} -> ${b.label}`);
  let t=0; const steps=60; const anim = setInterval(()=>{
    t++; const x = a.x + (b.x-a.x)*(t/steps); const y = a.y + (b.y-a.y)*(t/steps);
    draw(); ctx.fillStyle='red'; ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2); ctx.fill();
    if (t>=steps){ clearInterval(anim); log('Packet delivered'); // hacking event
      // small simulated attack detection
      if (Math.random()<0.2){ log('Hacking tool detected suspicious traffic — launching analysis'); hackingLog.style.background='#220'; }
    }
  }, 16);
}

simulateBtn.addEventListener('click', ()=>simulate());

// ICMP / ARP simulation using engine
async function pingFromSelected(){
  if (!selected) return alert('Select a source node first');
  const targetIp = prompt('Enter destination IP to ping:');
  if (!targetIp) return;
  log('Pinging '+targetIp+' from '+selected.label);
  const srcId = selected.id;
  await window.NetworkEngine.ping(nodes, links, srcId, targetIp, { onResult:(ok,msg)=>{ log(msg); } });
}

// Port scanner
async function portScanSelected(){
  if (!selected) return alert('Select a node to target');
  // pick ip from first interface
  const ip = (selected.interfaces && selected.interfaces[0] && selected.interfaces[0].ip) || '';
  if (!ip) return alert('Selected node has no IP');
  log('Port scan on '+ip+'...');
  // Fake results based on services
  const services = selected.services || [];
  await new Promise(r=>setTimeout(r,500));
  if (services.length===0){ log('No open ports found'); } else { services.forEach(s=> log(`Port ${s.port}/${s.proto} - ${s.open? 'open':'closed'}`)); }
}

async function exploitSelected(){
  if (!selected) return alert('Select a node to exploit');
  const ip = (selected.interfaces && selected.interfaces[0] && selected.interfaces[0].ip) || '';
  if (!ip) return alert('Selected node has no IP');
  log('Attempting exploit against '+ip+'...');
  await new Promise(r=>setTimeout(r,800));
  // simplistic: if service with port 22 open -> compromise
  const ssh = (selected.services||[]).find(s=>s.port===22 && s.open);
  if (ssh){ selected.compromised = true; log('Exploit succeeded: '+selected.label+' compromised'); } else { log('Exploit failed'); }
}

document.getElementById('scanBtn').addEventListener('click', ()=>portScanSelected());
document.getElementById('exploitBtn').addEventListener('click', ()=>exploitSelected());

saveBtn.addEventListener('click', async ()=>{
  const data = { nodes, links }; const res = await window.electronAPI.saveNetwork({ defaultPath:'network.json', data });
  if (res && res.ok) log('Saved network to '+res.path); else if (res && res.error) log('Save error: '+res.error);
});

loadBtn.addEventListener('click', async ()=>{
  const res = await window.electronAPI.loadNetwork();
  if (res && res.ok){ nodes = res.data.nodes||[]; links = res.data.links||[]; nextId = (nodes.reduce((m,n)=>Math.max(m,n.id),0)||0)+1; draw(); log('Loaded network '+res.path); }
  else if (res && res.error) log('Load error: '+res.error);
});

backBtn.addEventListener('click', ()=>{ window.location.href = 'index.html'; });

// initial draw
draw();

// respond to postMessage commands (from preload forwarding tray/menu events)
window.addEventListener('message', (ev)=>{
  if (!ev.data) return;
  if (ev.data.type === 'simulate') simulate();
  if (ev.data.type === 'navigate' && ev.data.where === 'network') { /* already here */ }
});
