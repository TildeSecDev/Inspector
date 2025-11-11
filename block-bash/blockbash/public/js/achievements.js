// --- Achievements Dropdown Logic ---
document.addEventListener('DOMContentLoaded', function () {
  const trophyBtn = document.getElementById('trophy-btn');
  const achievementsDropdown = document.getElementById('achievements-dropdown');
  const listDiv = document.getElementById('achievements-list');
  const popup = document.getElementById('achievement-popup');
  const popupBody = document.getElementById('achievement-popup-body');
  const popupClose = document.getElementById('achievement-popup-close');
  let achievements = [];
  let userAchievements = [];

  function fetchAchievements() {
    return fetch('/achievements.json').then(r => r.json());
  }
  function fetchUserAchievements() {
    // Use window.userId or username
    const userId = window.userId || document.querySelector('.client-id')?.textContent;
    return fetch(`/user/progress?userId=${encodeURIComponent(userId)}`)
      .then(r => r.json())
      .then(data => data.achievements || []);
  }
  async function renderAchievements() {
    achievements = await fetchAchievements();
    userAchievements = await fetchUserAchievements();
    listDiv.innerHTML = '';
    achievements.forEach(a => {
      const achieved = userAchievements.includes(a.name);
      const item = document.createElement('div');
      item.className = 'achievement-item';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.gap = '12px';
      item.style.margin = '8px 0';
      item.style.opacity = achieved ? '1' : '0.4';
      item.style.cursor = 'pointer';
      item.onclick = () => showAchievementPopup(a, achieved);
      // SVG icon
      const icon = document.createElement('img');
      icon.src = `/assets/achievements/${a.svg}`;
      icon.alt = a.name;
      icon.style.width = '36px';
      icon.style.height = '36px';
      icon.style.filter = achieved ? '' : 'grayscale(1)';
      item.appendChild(icon);
      // Name and desc
      const textDiv = document.createElement('div');
      textDiv.innerHTML = `<b>${a.name}</b><br><span style="font-size:0.95em;">${a.description}</span>`;
      item.appendChild(textDiv);
      listDiv.appendChild(item);
    });
  }
  function showAchievementPopup(a, achieved) {
    popupBody.innerHTML = `
      <img src="/assets/achievements/${a.svg}" alt="${a.name}" style="width:64px;height:64px;${achieved ? '' : 'filter:grayscale(1);'}"><br>
      <div style="font-size:1.3em;font-weight:bold;margin:12px 0;">${a.name}</div>
      <div style="margin-bottom:12px;">${a.description}</div>
      <div style="color:#888;font-size:0.95em;">Step/Task: ${a.step}</div>
      ${achieved ? '<div style="color:#63b22b;font-weight:bold;margin-top:12px;">Unlocked!</div>' : '<div style="color:#888;margin-top:12px;">Locked</div>'}
    `;
    popup.style.display = 'flex';
  }
  document.addEventListener('achievement-update', renderAchievements);
  if (trophyBtn && achievementsDropdown) {
    trophyBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      achievementsDropdown.classList.toggle('show');
      renderAchievements();
    });
    // Hide dropdown when clicking outside
    document.addEventListener('click', function (e) {
      if (!achievementsDropdown.contains(e.target) && e.target !== trophyBtn) {
        achievementsDropdown.classList.remove('show');
      }
      if (popup.style.display === 'flex' && !popup.contains(e.target)) {
        popup.style.display = 'none';
      }
    });
    popupClose.onclick = () => popup.style.display = 'none';
  }
});
