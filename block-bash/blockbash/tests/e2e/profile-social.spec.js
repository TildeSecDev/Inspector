const { test, expect } = require('@playwright/test');

test.describe('Profile and Social APIs', () => {
  test('profile fetch + add/remove friend', async ({ request }) => {
    const ts = Date.now();
    const username = `pw_profile_${ts}`;
    const email = `${username}@example.com`;
    const password = 'Passw0rd!';

    // Register + login
  let res = await request.post('http://localhost:3000/auth/register', { data: { name: username, email, password, organisation: 'school' } });
    expect(res.ok()).toBeTruthy();
  res = await request.post('http://localhost:3000/auth/login', { data: { email, password } });
    expect(res.ok()).toBeTruthy();

    // Profile (by email or username)
  const profile = await request.get(`http://localhost:3000/user/profile?userId=${encodeURIComponent(email)}`);
    expect(profile.ok()).toBeTruthy();
    const body = await profile.json();
    expect(typeof body.name).toBe('string');
    expect(typeof body.email).toBe('string');

    // Leaderboard exists
  const lb = await request.get('http://localhost:3000/leaderboard');
    expect(lb.ok()).toBeTruthy();
    const arr = await lb.json();
    expect(Array.isArray(arr)).toBe(true);

    // Add/Remove friend using body.userId to avoid cookie dependence
    const friend = 'friend@example.com';
  let add = await request.post('http://localhost:3000/user/add_friend', { data: { userId: username, friendEmail: friend } });
    expect(add.ok()).toBeTruthy();
    let addBody = await add.json();
    expect(addBody.ok).toBeTruthy();

  let rem = await request.post('http://localhost:3000/user/remove_friend', { data: { userId: username, friendEmail: friend } });
    expect(rem.ok()).toBeTruthy();
    let remBody = await rem.json();
    expect(remBody.ok).toBeTruthy();
  });
});

