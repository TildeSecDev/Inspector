document.addEventListener('DOMContentLoaded', function () {
  const searchBtn = document.getElementById('search-btn');
  const searchPopup = document.createElement('div');
  searchPopup.className = 'search-popup';
  searchPopup.innerHTML = `
    <div class="search-popup-content">
      <button class="search-popup-close">&times;</button>
      <h2>Find Friends</h2>
      <input id="search-user-input" type="text" placeholder="Search users by name or email..." style="width:100%;margin-bottom:12px;">
      <div id="search-user-list"></div>
    </div>
  `;
  document.body.appendChild(searchPopup);
  const closeBtn = searchPopup.querySelector('.search-popup-close');
  const username = window.userId || document.querySelector('.client-id')?.textContent || '';
  let currentFriends = [];

  async function loadFriends() {
    if (!username) return [];
    try {
      const res = await fetch(`/user/profile?userId=${encodeURIComponent(username)}`);
      const data = await res.json();
      currentFriends = data.friends || [];
    } catch {
      currentFriends = [];
    }
  }

  searchBtn.onclick = async function () {
    await loadFriends();
    searchPopup.style.display = 'flex';
    document.getElementById('search-user-input').value = '';
    document.getElementById('search-user-list').innerHTML = '';
    setTimeout(() => document.getElementById('search-user-input').focus(), 50);
  };

  closeBtn.onclick = () => searchPopup.style.display = 'none';

  document.addEventListener('click', function (e) {
    if (searchPopup.style.display === 'flex' && !searchPopup.contains(e.target) && e.target !== searchBtn) {
      searchPopup.style.display = 'none';
    }
  });

  document.getElementById('search-user-input').addEventListener('input', async function () {
    const q = this.value.trim();
    if (!q) {
      document.getElementById('search-user-list').innerHTML = '';
      return;
    }
    const res = await fetch(`/user/search?q=${encodeURIComponent(q)}`);
    const users = await res.json();
    const list = document.getElementById('search-user-list');
    list.innerHTML = '';

    users.forEach(user => {
      const div = document.createElement('div');
      div.className = 'search-user-row';
      let isFriend = currentFriends.includes(user.email);
      const btnClass = isFriend ? 'remove-friend-btn' : 'add-friend-btn';
      const btnLabel = isFriend ? 'Remove' : 'Add';
      div.innerHTML = `<span class="name">${user.name}</span> <span class="email">${user.email}</span> <button class="${btnClass}">${btnLabel}</button>`;
      const btn = div.querySelector('button');
      btn.onclick = async () => {
        btn.disabled = true;
        const original = btn.textContent;
        btn.textContent = isFriend ? 'Removing...' : 'Adding...';
        try {
          const url = isFriend ? '/user/remove_friend' : '/user/add_friend';
          const res = await fetch(url, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({friendEmail:user.email})});
          if (res.ok) {
            if (isFriend) {
              currentFriends = currentFriends.filter(f => f !== user.email);
              btn.textContent = 'Add';
              btn.className = 'add-friend-btn';
              isFriend = false;
            } else {
              currentFriends.push(user.email);
              btn.textContent = 'Remove';
              btn.className = 'remove-friend-btn';
              isFriend = true;
            }
            btn.disabled = false;
          } else {
            btn.textContent = 'Failed';
            setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1000);
          }
        } catch (e) {
          btn.textContent = 'Failed';
          setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1000);
        }
      };
      list.appendChild(div);
    });
  });
});
