const { test, expect } = require('@playwright/test');

test.describe('Network Editor Persistence', () => {
  test('adds devices, links them, and preserves after reload', async ({ page }) => {
    await page.context().addCookies([{ name:'username', value:'tester', domain:'localhost', path:'/' }]);
    await page.goto('http://localhost:3000/editor');
    await page.locator('.canvas-tab[data-tab="network-editor"]').click();
    await page.evaluate(() => {
      const canvas = document.getElementById('network-drop-area') || document.querySelector('.network-editor-canvas');
      function addDevice(id,x,y,label){
        const d=document.createElement('div');
        d.className='network-device'; d.id=id; d.dataset.deviceType='network-device';
        d.innerHTML=`<div class="device-icon">📡</div><div class="device-label">${label}</div>`;
        Object.assign(d.style,{position:'absolute',left:x+'px',top:y+'px',width:'80px',height:'70px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#1f1f1f',border:'1px solid #444',borderRadius:'6px'});
        canvas.appendChild(d);
      }
      addDevice('t-router-1',40,40,'RTR1');
      addDevice('t-router-2',180,40,'RTR2');
      // Ensure SVG layer exists
      let svg = document.getElementById('network-connections-layer');
      if(!svg){
        svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.id='network-connections-layer';
        svg.style.position='absolute';
        svg.style.top='0'; svg.style.left='0'; svg.style.width='100%'; svg.style.height='100%';
        canvas.parentElement.appendChild(svg);
      }
      function createConnection(a,b){ const line=document.createElementNS('http://www.w3.org/2000/svg','line'); line.setAttribute('stroke','#4e5dc1'); line.setAttribute('stroke-width','2'); const id='conn-test-'+Date.now(); line.dataset.connId=id; svg.appendChild(line); const ar=a.getBoundingClientRect(), br=b.getBoundingClientRect(), pr=canvas.getBoundingClientRect(); const ax=ar.left-pr.left+ar.width/2, ay=ar.top-pr.top+ar.height/2, bx=br.left-pr.left+br.width/2, by=br.top-pr.top+br.height/2; line.setAttribute('x1',ax); line.setAttribute('y1',ay); line.setAttribute('x2',bx); line.setAttribute('y2',by); if(!window.networkState) window.networkState={ connections:[] }; if(!window.networkState.connections) window.networkState.connections=[]; window.networkState.connections.push({id,fromId:a.id,toId:b.id}); }
      const a=document.getElementById('t-router-1'); const b=document.getElementById('t-router-2'); createConnection(a,b);
      if (window.saveCanvasState) window.saveCanvasState('network-drop-area');
    });
    const initial = await page.locator('#network-drop-area .network-device').count();
    expect(initial).toBe(2);
    // Connection line count before reload
    const initialConnections = await page.locator('#network-connections-layer line').count();
    expect(initialConnections).toBeGreaterThanOrEqual(1);
    await page.reload();
    await page.locator('.canvas-tab[data-tab="network-editor"]').click();
    await page.waitForTimeout(300);
    const restored = await page.locator('#network-drop-area .network-device').count();
    expect(restored).toBeGreaterThanOrEqual(2);
    const restoredConnections = await page.locator('#network-connections-layer line').count();
    expect(restoredConnections).toBeGreaterThanOrEqual(1);
  });
});
