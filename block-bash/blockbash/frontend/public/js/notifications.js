// --- Notification Dropdown Logic ---
document.addEventListener('DOMContentLoaded', () => {
  // Find the notification button (replace Save Button)
  const notificationBtn = document.querySelector('header .button-container button img[src="/assets/images/notification.svg"]')?.parentElement;
  if (!notificationBtn) return;

  // Create dropdown container
  let dropdown = document.createElement('div');
  dropdown.id = 'notification-dropdown';
  dropdown.style.position = 'absolute';
  dropdown.style.top = '60px';
  dropdown.style.right = '0';
  dropdown.style.width = '340px';
  dropdown.style.maxHeight = '400px';
  dropdown.style.overflowY = 'auto';
  dropdown.style.background = '#fff';
  dropdown.style.boxShadow = '0 8px 32px #0003';
  dropdown.style.borderRadius = '10px';
  dropdown.style.display = 'none';
  dropdown.style.zIndex = '1000';
  dropdown.style.padding = '0.5em 0';
  dropdown.style.fontSize = '1em';
  dropdown.style.minHeight = '60px';
  dropdown.style.color = '#222';
  dropdown.style.transition = 'opacity 0.2s';
  document.body.appendChild(dropdown);

  // Toggle dropdown
  notificationBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    if (dropdown.style.display === 'block') {
      loadNotifications();
    }
  });
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== notificationBtn && dropdown.style.display === 'block') {
      dropdown.style.display = 'none';
    }
  });

  // Fetch and render notifications
  async function loadNotifications() {
  dropdown.innerHTML = `<div style="text-align:center;color:#888;padding:1em;">${window.i18n?.t('notifications.loading','Loading...')}</div>`;
    try {
      const res = await fetch('/user/notifications');
      const notifications = await res.json();
      if (!Array.isArray(notifications) || notifications.length === 0) {
        dropdown.innerHTML = `<div style="text-align:center;color:#888;padding:1em;">${window.i18n?.t('notifications.none','No notifications')}</div>`;
        return;
      }
      dropdown.innerHTML = '';
      notifications.forEach((notif, idx) => {
        const row = document.createElement('div');
        row.className = 'notification-row';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';
        row.style.padding = '10px 18px';
        row.style.borderBottom = '1px solid #eee';
        row.style.gap = '10px';
        // Friend request notification special handling
        if (notif.type === 'friend') {
          row.innerHTML = `<span style="flex:1;cursor:pointer;">${notif.text || notif.message || ''} ${window.i18n?.t('notifications.friend.clickInstruction','click to accept or deny')}</span>` +
            `<button class="delete-notif-btn" style="background:#e74c3c;color:#fff;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;">${window.i18n?.t('notifications.delete','Delete')}</button>`;
          row.querySelector('span').onclick = () => showFriendRequestPopup(notif, idx);
        } else {
          row.innerHTML = `<span style="flex:1;">${notif.text || notif.message || JSON.stringify(notif)}</span>` +
            `<button class="delete-notif-btn" style="background:#e74c3c;color:#fff;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;">${window.i18n?.t('notifications.delete','Delete')}</button>`;
        }
        row.querySelector('.delete-notif-btn').onclick = async (e) => {
          e.stopPropagation();
          await fetch('/user/notifications/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idx })
          });
          loadNotifications();
        };
        dropdown.appendChild(row);
      });

      // Friend request popup logic
      function showFriendRequestPopup(notif, notifIdx) {
        // Remove any existing popup
        let popup = document.getElementById('friend-request-popup');
        if (popup) popup.remove();
        popup = document.createElement('div');
        popup.id = 'friend-request-popup';
        popup.style.position = 'fixed';
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.background = '#fff';
        popup.style.boxShadow = '0 8px 32px #0003';
        popup.style.borderRadius = '12px';
        popup.style.padding = '32px 32px 24px 32px';
        popup.style.zIndex = '2000';
        popup.style.minWidth = '320px';
  popup.innerHTML = `<div style="text-align:center;color:#888;padding:1em;">${window.i18n?.t('notifications.loading','Loading...')}</div>`;
        document.body.appendChild(popup);
        // Extract sender email/name from notif (assume notif.senderEmail or notif.senderName)
        const sender = notif.senderEmail || notif.senderName || (notif.text ? notif.text.split(' ')[0] : '');
        fetch(`/user/profile?userId=${encodeURIComponent(sender)}`)
          .then(r => r.json())
          .then(data => {
            popup.innerHTML = `
              <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
                <img src="${data.profilePicture || '/assets/images/default_profile.svg'}" alt="Profile Picture" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">
                <div style="font-size:1.2em;font-weight:bold;">${data.name || sender}</div>
                <div style="color:#666;">${window.i18n?.t('profile.points','Points:')} <b>${data.points || 0}</b></div>
                <div style="color:#666;">${window.i18n?.t('profile.leaderboardPosition','Leaderboard Position:')} <b>${data.leaderboard || '-'}</b></div>
                <div style="display:flex;gap:18px;margin-top:18px;">
                  <button id="accept-friend-btn" style="background:#63b22b;color:#fff;border:none;border-radius:6px;padding:8px 22px;font-size:1em;cursor:pointer;">${window.i18n?.t('notifications.accept','Accept')}</button>
                  <button id="deny-friend-btn" style="background:#e74c3c;color:#fff;border:none;border-radius:6px;padding:8px 22px;font-size:1em;cursor:pointer;">${window.i18n?.t('notifications.deny','Deny')}</button>
                </div>
                <button id="close-friend-popup" style="margin-top:18px;background:#eee;border:none;border-radius:6px;padding:6px 18px;font-size:0.95em;cursor:pointer;">${window.i18n?.t('notifications.close','Close')}</button>
              </div>
            `;
            document.getElementById('close-friend-popup').onclick = () => popup.remove();
            document.getElementById('deny-friend-btn').onclick = async () => {
              await fetch('/user/notifications/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idx: notifIdx })
              });
              popup.remove();
              loadNotifications();
            };
            document.getElementById('accept-friend-btn').onclick = async () => {
              await fetch('/user/add_friend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friendEmail: sender })
              });
              await fetch('/user/notifications/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idx: notifIdx })
              });
              popup.remove();
              loadNotifications();
            };
          });
      }
    } catch (e) {
      dropdown.innerHTML = `<div style="text-align:center;color:#e74c3c;padding:1em;">${window.i18n?.t('notifications.failed','Failed to load notifications')}</div>`;
    }
  }
});
