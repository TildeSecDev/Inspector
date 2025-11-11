document.addEventListener('DOMContentLoaded', function () {
  const clientId = document.querySelector('.client-id');
  const profilePopup = document.getElementById('profile-popup');
  const profileClose = document.getElementById('profile-popup-close');

  if (clientId && profilePopup) {
    clientId.addEventListener('click', async function () {
      // Fetch user stats from backend
      const userId = window.userId || clientId.textContent;
      const res = await fetch(`/user/profile?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      // Update all stats fields from backend
      document.getElementById('profile-username').textContent = data.name || '';
      document.getElementById('profile-email').textContent = data.email || '';
      document.getElementById('profile-leaderboard').textContent = data.leaderboard || '-';
      let friendCount = data.friends?.length || 0;
      document.getElementById('profile-friends').textContent = friendCount;
      const friendList = document.getElementById('profile-friend-list');
      friendList.innerHTML = '';
      (data.friends || []).forEach(email => {
        const row = document.createElement('div');
        row.className = 'friend-row';
        row.innerHTML = `<span class="friend-email">${email}</span> <button class="remove-btn">Remove</button>`;
        const btn = row.querySelector('.remove-btn');
        btn.onclick = async () => {
          btn.disabled = true;
          const oldText = btn.textContent;
          btn.textContent = 'Removing...';
          try {
            const res = await fetch('/user/remove_friend', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({friendEmail: email})});
            if (res.ok) {
              row.remove();
              const newCount = --friendCount;
              document.getElementById('profile-friends').textContent = newCount;
            } else {
              btn.textContent = 'Failed';
              setTimeout(() => { btn.textContent = oldText; btn.disabled = false; }, 1000);
            }
          } catch (e) {
            btn.textContent = 'Failed';
            setTimeout(() => { btn.textContent = oldText; btn.disabled = false; }, 1000);
          }
        };
        friendList.appendChild(row);
      });
      document.getElementById('profile-time-overall').textContent = data.timeOverall || '0m';
      document.getElementById('profile-activities-started').textContent = data.activitiesStarted || '0';
      document.getElementById('profile-activities-completed').textContent = data.activitiesCompleted || '0';
      document.getElementById('profile-commands').textContent = data.commandsRan || '0';
      document.getElementById('profile-login').textContent = data.login ? new Date(data.login).toLocaleString() : '';
      document.getElementById('profile-picture').src = data.profilePicture || '/assets/images/default_profile.svg';
      // Time breakdown
      const breakdown = document.getElementById('profile-time-breakdown');
      breakdown.innerHTML = '';
      (data.timeBreakdown || []).forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.label}: ${item.time}`;
        breakdown.appendChild(li);
      });
      profilePopup.style.display = 'flex';
      // Profile picture upload logic
      const profilePic = document.getElementById('profile-picture');
      const fileInput = document.getElementById('profile-picture-input');
      if (profilePic && fileInput) {
        profilePic.onclick = () => fileInput.click();
        fileInput.onchange = async function() {
          if (!fileInput.files || !fileInput.files[0]) return;
          const formData = new FormData();
          formData.append('profilePicture', fileInput.files[0]);
          try {
            const res = await fetch('/user/profile_picture', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success && result.url) {
              profilePic.src = result.url;
            } else {
              alert('Failed to upload profile picture.');
            }
          } catch (e) {
            alert('Failed to upload profile picture.');
          }
        };
      }
      // Center the logout button
      const logoutBtn = document.getElementById('profile-logout');
      if (logoutBtn) {
        logoutBtn.onclick = async function() {
          await fetch('/auth/logout', { method: 'POST' });
          localStorage.clear();
          window.location.href = '/';
        };
        logoutBtn.setAttribute('type', 'button');
        logoutBtn.setAttribute('tabindex', '0');
        logoutBtn.style.cursor = 'pointer';
        logoutBtn.style.textDecoration = 'none';
        logoutBtn.style.fontWeight = 'bold';
        logoutBtn.style.background = '#ffe066';
        logoutBtn.style.color = '#232946';
        logoutBtn.style.border = 'none';
        logoutBtn.style.borderRadius = '6px';
        logoutBtn.style.padding = '10px 32px';
        logoutBtn.style.fontSize = '1.1em';
        logoutBtn.style.display = 'block';
        logoutBtn.style.margin = '0 auto';
        logoutBtn.onkeydown = function(e) {
          if (e.key === 'Enter' || e.key === ' ') this.click();
        };
      }
    });
    profileClose.onclick = () => profilePopup.style.display = 'none';
    document.addEventListener('click', function (e) {
      if (profilePopup.style.display === 'flex' && !profilePopup.contains(e.target) && e.target !== clientId) {
        profilePopup.style.display = 'none';
      }
    });
  }
});
