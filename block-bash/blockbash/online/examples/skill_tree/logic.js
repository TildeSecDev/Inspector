// Skill Tree logic: fetch user progress and render interactive skill map

async function fetchSkillTreeData() {
  // Load all skills, requirements, achievements from progress.json
  const res = await fetch('/examples/progress.json');
  return res.json();
}

async function fetchUserProgress() {
  let userId = window.userId || localStorage.getItem('userId');
  if (!userId) return { achievements: [], progress: {} };
  const res = await fetch(`/user/progress?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) return { achievements: [], progress: {} };
  return res.json();
}

function renderSkillTree(skills, userAchievements) {
  const container = document.createElement('div');
  container.className = 'skill-tree-container';

  // Group skills by topic
  const topics = {};
  skills.forEach(skill => {
    if (!topics[skill.topic]) topics[skill.topic] = [];
    topics[skill.topic].push(skill);
  });

  Object.entries(topics).forEach(([topic, topicSkills]) => {
    const topicDiv = document.createElement('div');
    topicDiv.className = 'skill-topic';

    const title = document.createElement('div');
    title.className = 'skill-topic-title';
    title.textContent = topic;
    topicDiv.appendChild(title);

    const row = document.createElement('div');
    row.className = 'skill-row';

    topicSkills.forEach(skill => {
      const node = document.createElement('div');
      node.className = 'skill-node';
      // Mark achieved
      const achieved = (skill.achievements || []).some(a => userAchievements.includes(a));
      if (achieved) node.classList.add('achieved');
      // If not achieved, mark as locked
      if (!achieved) node.classList.add('locked');
      node.textContent = skill.name;

      // Tooltip with requirements and achievements
      const tooltip = document.createElement('div');
      tooltip.className = 'skill-tooltip';
      tooltip.innerHTML =
        `<b>Requirements:</b><br>${(skill.tasks || []).map(t => '- ' + t).join('<br>')}` +
        `<br><br><b>Achievements:</b><br>${(skill.achievements || []).map(a => '- ' + a).join('<br>')}`;
      node.appendChild(tooltip);

      row.appendChild(node);
    });

    topicDiv.appendChild(row);
    container.appendChild(topicDiv);
  });

  // Replace the RPG panel with the skill tree
  const rpgPanel = document.querySelector('.rpg-panel');
  if (rpgPanel) {
    rpgPanel.innerHTML = '';
    rpgPanel.appendChild(container);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const skillData = await fetchSkillTreeData();
  const user = await fetchUserProgress();
  renderSkillTree(skillData.skills, user.achievements || []);
});
