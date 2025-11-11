document.addEventListener('DOMContentLoaded', function () {
  const leaderboardBtn = document.getElementById('leaderboard-btn');
  const leaderboardPopup = document.createElement('div');
  leaderboardPopup.className = 'leaderboard-popup';
  leaderboardPopup.innerHTML = `
    <div class="leaderboard-popup-content">
      <button class="leaderboard-popup-close">&times;</button>
      <h2>Leaderboard</h2>
      <div id="leaderboard-list"></div>
    </div>
  `;
  document.body.appendChild(leaderboardPopup);
  const closeBtn = leaderboardPopup.querySelector('.leaderboard-popup-close');
  const openPopup = async function () {
    leaderboardPopup.style.display = 'flex';
    // Fetch leaderboard data
    const res = await fetch('/leaderboard');
    const data = await res.json();
    const list = leaderboardPopup.querySelector('#leaderboard-list');
    list.innerHTML = '';
    data.forEach((user, i) => {
      const div = document.createElement('div');
      div.className = 'leaderboard-row';
      div.innerHTML = `<span class="rank">#${i+1}</span> <span class="name">${user.name}</span> <span class="points">${user.points} pts</span>`;
      list.appendChild(div);
    });
    setTimeout(() => closeBtn.focus(), 50);
  };
  leaderboardBtn.addEventListener('click', openPopup);
  const icon = leaderboardBtn.querySelector('img');
  if (icon) icon.addEventListener('click', openPopup);
  closeBtn.onclick = () => leaderboardPopup.style.display = 'none';
  document.addEventListener('click', function (e) {
    if (leaderboardPopup.style.display === 'flex' && !leaderboardPopup.contains(e.target) && e.target !== leaderboardBtn) {
      leaderboardPopup.style.display = 'none';
    }
  });
});
