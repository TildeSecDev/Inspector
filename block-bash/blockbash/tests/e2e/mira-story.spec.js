const { test, expect } = require('@playwright/test');

test.describe('Mira Story', () => {
  test('advances demo chapter dialogue', async ({ page }) => {
    // Load demo chapter directly
    const resp = await page.goto('/examples/mira/chapters/demo/demo.html');
    expect(resp.ok()).toBeTruthy();
    const banner = page.locator('.rpg-dialogue-banner .demo-dialogue-text');
    await expect(banner).toContainText('Agent');
    const nextBtn = page.locator('#demo-next-btn');
    await nextBtn.click();
    await expect(banner).toContainText('Drag the');
    await nextBtn.click();
    await expect(banner).toContainText('nmap');
  });

  test('workshop validation via HTTP endpoint', async ({ request }) => {
    // Step 1 part A: run airodump-ng -> expect flagRequired
    let res = await request.post('/ws/validate', {
      data: { lesson_id: 'mira', command: 'airodump-ng wlan0', step: 1 }
    });
    expect(res.ok()).toBeTruthy();
    let data = await res.json();
    expect(data.pass).toBeTruthy();
    expect(data.flagRequired || data.hint?.toLowerCase().includes('flag')).toBeTruthy();

    // Step 1 part B: submit flag
    res = await request.post('/ws/validate', {
      data: { lesson_id: 'mira', command: 'submit-flag SSID_FLAG{coffeeshop_spoofed}', step: 1 }
    });
    expect(res.ok()).toBeTruthy();
    data = await res.json();
    expect(data.pass).toBeTruthy();

    // Generic network scan acceptance (step 6)
    res = await request.post('/ws/validate', {
      data: { lesson_id: 'mira', command: 'nmap -sn 192.168.1.0/24', step: 6 }
    });
    expect(res.ok()).toBeTruthy();
    data = await res.json();
    expect(data.pass).toBeTruthy();
  });
});
