import { test as base } from '@playwright/test';

export const test = base.extend<{ mockFriendRequest: () => Promise<void> }>({
  mockFriendRequest: async ({ page }, use) => {
    async function applyMocks(){
      await page.route('**/user/notifications', route => {
        route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify([{ type:'friend', text:'friend@example.com' }]) });
      });
      await page.route('**/user/profile**', route => {
        route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ name:'Friend User', points:5, leaderboard:12 }) });
      });
    }
    await use(async () => { await applyMocks(); });
  }
});

export const expect = test.expect;
