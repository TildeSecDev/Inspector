// Loads tasks.json and renders topic cards. On click, loads the topic's .TildeSec file.

async function fetchTasksData() {
  const res = await fetch('/examples/tasks.json');
  return res.json();
}

async function fetchProgressData() {
  const res = await fetch('/examples/progress.json');
  return res.json();
}

const TASK_TOPICS = [
  {
    name: "Information Gathering",
    TildeSec: "information_gathering",
    description: "Discover hosts, scan networks, and enumerate services.",
  },
  {
    name: "Vulnerability Analysis",
    TildeSec: "vulnerability_analysis",
    description: "Identify and analyze vulnerabilities in systems.",
  },
  {
    name: "Web Application Analysis",
    TildeSec: "web_application_analysis",
    description: "Test and secure web applications.",
  },
  {
    name: "Database Assessment",
    TildeSec: "database_assessment",
    description: "Assess and secure database systems.",
  },
  {
    name: "Password Attacks",
    TildeSec: "password_attacks",
    description: "Crack and audit passwords and authentication.",
  },
  {
    name: "Wireless Attacks",
    TildeSec: "wireless_attacks",
    description: "Analyze and attack wireless networks.",
  },
  {
    name: "Reverse Engineering",
    TildeSec: "reverse_engineering",
    description: "Analyze binaries and reverse engineer software.",
  },
  {
    name: "Exploitation Tools",
    TildeSec: "exploitation_tools",
    description: "Use and understand exploitation frameworks.",
  },
  {
    name: "Sniffing & Spoofing",
    TildeSec: "sniffing_spoofing",
    description: "Capture and manipulate network traffic.",
  },
  {
    name: "Post Exploitation",
    TildeSec: "post_exploitation",
    description: "Maintain access and cover tracks after exploitation.",
  },
  {
    name: "Forensics",
    TildeSec: "forensics",
    description: "Analyze evidence and recover data.",
  },
  {
    name: "Reporting Tools",
    TildeSec: "reporting_tools",
    description: "Document findings and generate reports.",
  },
  {
    name: "Social Engineering Tools",
    TildeSec: "social_engineering_tools",
    description: "Simulate and defend against social engineering.",
  }
];

// Helper to check which .TildeSec files exist
async function getAvailableTaskCerrfs() {
  // Fetch the list of .TildeSec files from the server
  const res = await fetch('/ws/list_TildeSec?type=task');
  if (!res.ok) return [];
  return await res.json(); // returns array of { name: "information_gathering.TildeSec", ... }
}

function renderTopics(availableTopics) {
  // Remove any RPG overlays, banners, and text
  const rpgOverlay = document.getElementById('rpg-menu-overlay');
  if (rpgOverlay) rpgOverlay.remove();

  // Remove RPG panel content
  const rpgPanel = document.querySelector('.rpg-panel');
  if (rpgPanel) {
    rpgPanel.innerHTML = '';
  }

  // Remove RPG text and hints if present
  const rpgText = document.getElementById('rpg-text');
  if (rpgText) rpgText.remove();
  const rpgHints = document.getElementById('rpg-hints');
  if (rpgHints) rpgHints.remove();

  // Create the tasks container
  const container = document.createElement('div');
  container.className = 'tasks-container';

  // Add a heading
  const title = document.createElement('div');
  title.className = 'tasks-title';
  title.textContent = 'Select a Topic';
  container.appendChild(title);

  // Topic list (scrollable)
  const list = document.createElement('div');
  list.className = 'topic-list';

  availableTopics.forEach(topic => {
    const card = document.createElement('div');
    card.className = 'topic-card';

    const tTitle = document.createElement('div');
    tTitle.className = 'topic-title';
    tTitle.textContent = topic.name;
    card.appendChild(tTitle);

    const descDiv = document.createElement('div');
    descDiv.className = 'topic-description';
    descDiv.textContent = topic.description;
    card.appendChild(descDiv);

    card.onclick = () => {
      const TildeSecName = topic.TildeSec;
      const workshopContainer = window.parent && window.parent.document.getElementById('workshop-container')
        ? window.parent.document.getElementById('workshop-container')
        : document.getElementById('workshop-container');
      if (workshopContainer) {
        fetch(`/ws/workshop?lesson_id=${TildeSecName}`)
          .then(res => res.json())
          .then(data => {
            if (data.indexHtml) {
              workshopContainer.innerHTML = data.indexHtml;
              document.querySelectorAll('link[data-rpg-style],script[data-rpg-logic]').forEach(e => e.remove());
              setTimeout(() => {
                if (data.hasStyle) {
                  const style = document.createElement('link');
                  style.rel = 'stylesheet';
                  style.href = `/ws/workshop_asset?lesson_id=${TildeSecName}&file=style.css`;
                  style.setAttribute('data-rpg-style', '1');
                  document.head.appendChild(style);
                }
                if (data.hasLogic) {
                  const script = document.createElement('script');
                  script.src = `/ws/workshop_asset?lesson_id=${TildeSecName}&file=logic.js`;
                  script.setAttribute('data-rpg-logic', '1');
                  document.body.appendChild(script);
                }
              }, 0);
            } else {
              workshopContainer.innerHTML = '<div>Failed to load topic workshop.</div>';
            }
          })
          .catch(() => {
            workshopContainer.innerHTML = '<div>Workshop load error.</div>';
          });
      }
    };

    list.appendChild(card);
  });

  container.appendChild(list);

  // Replace the RPG panel or main container with the tasks selector
  if (rpgPanel) {
    rpgPanel.appendChild(container);
  } else {
    document.body.innerHTML = '';
    document.body.appendChild(container);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Get available .TildeSec files from the server
  const TildeSecFiles = await getAvailableTaskCerrfs();
  // Map to topic objects
  const availableTopics = TASK_TOPICS.filter(topic =>
    TildeSecFiles.some(f => f.name.replace('.TildeSec', '') === topic.TildeSec)
  );
  renderTopics(availableTopics);
});
