// Minimal network engine for ARP and ICMP (ping) simulation
window.NetworkEngine = (function(){
  function findNodeByIp(nodes, ip){
    return nodes.find(n => (n.interfaces||[]).some(ifc => ifc.ip === ip));
  }

  // Utility: IPv4 string -> 32-bit integer
  function ipToInt(ip){
    if (!ip || typeof ip !== 'string') return null;
    const parts = ip.trim().split('.').map(Number);
    if (parts.length !== 4 || parts.some(p=>isNaN(p) || p<0 || p>255)) return null;
    return ((parts[0]<<24) >>> 0) + (parts[1]<<16) + (parts[2]<<8) + parts[3];
  }

  // Parse a CIDR like '10.0.1.0/24' or single IP '10.0.1.5' into {network, mask, size}
  function parseCIDR(spec){
    if (!spec || typeof spec !== 'string') return null;
    if (spec.includes('/')){
      const [net, bitsRaw] = spec.split('/');
      const bits = parseInt(bitsRaw,10);
      const netInt = ipToInt(net);
      if (netInt === null || isNaN(bits) || bits<0 || bits>32) return null;
      const mask = bits===0 ? 0 : (0xFFFFFFFF << (32-bits)) >>> 0;
      return { network: netInt & mask, mask, size: bits };
    } else {
      const ipInt = ipToInt(spec);
      if (ipInt === null) return null;
      return { network: ipInt, mask: 0xFFFFFFFF, size: 32 };
    }
  }

  function cidrMatch(cidrSpec, ip){
    const parsed = parseCIDR(cidrSpec);
    const ipInt = ipToInt(ip);
    if (!parsed || ipInt===null) return false;
    return (ipInt & parsed.mask) >>> 0 === (parsed.network & parsed.mask) >>> 0;
  }

  function arpResolve(nodes, links, srcId, dstIp){
    // Maintain a simple ARP-like reachability: search connected component for the IP
    const src = nodes.find(n=>n.id===srcId);
    if (!src) return null;
    const visited = new Set();
    const stack = [src.id];
    while(stack.length){
      const id = stack.pop(); if (visited.has(id)) continue; visited.add(id);
      const node = nodes.find(n=>n.id===id);
      if (!node) continue;
      if ((node.interfaces||[]).some(ifc=>ifc.ip===dstIp)) return node.id;
      // neighbors
      const nbrs = links.filter(l=>l.from===id).map(l=>l.to).concat(links.filter(l=>l.to===id).map(l=>l.from));
      nbrs.forEach(nid=>{ if (!visited.has(nid)) stack.push(nid); });
    }
    return null;
  }

  async function ping(nodes, links, srcId, dstIp, callbacks, ttl=64){
    // Minimal ping that respects TTL and static routes on nodes.
    if (ttl<=0){ if (callbacks && callbacks.onResult) callbacks.onResult(false, 'TTL expired'); return; }
    const src = nodes.find(n=>n.id===srcId);
    if (!src){ if (callbacks && callbacks.onResult) callbacks.onResult(false, 'Source not found'); return; }
    // Direct reachability
    const reachable = arpResolve(nodes, links, srcId, dstIp);
    if (reachable){ await new Promise(r=>setTimeout(r, 200)); if (callbacks && callbacks.onResult) callbacks.onResult(true, 'Reply from '+dstIp); return; }
    // Check static routes on src: use CIDR matching (supports single-IP and prefixes)
    const routes = src.routes || [];
    for (const rt of routes){
      // rt: { dest: '10.0.0.0/24' or '10.0.0.2', via: nodeId }
      if (!rt.dest || !rt.via) continue;
      try{
        if (cidrMatch(rt.dest, dstIp)){
          // forward to via
          await new Promise(r=>setTimeout(r, 150));
          return ping(nodes, links, rt.via, dstIp, callbacks, ttl-1);
        }
      }catch(e){ /* ignore malformed route spec */ }
    }
    // Not reachable
    await new Promise(r=>setTimeout(r, 200));
    if (callbacks && callbacks.onResult) callbacks.onResult(false, 'Destination unreachable');
  }

  return { arpResolve, ping };
})();
