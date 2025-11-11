document.addEventListener('DOMContentLoaded', () => {
  const sidebarContent = document.getElementById('sidebar-content');
  const dropArea = document.getElementById('drop-area');
  const workshopContent = document.getElementById('workshop-content');
  const loadWorkshopButton = document.getElementById('load-workshop');
  const selectWorkshopButton = document.getElementById('select-workshop');
  const restartWorkshopButton = document.getElementById('restart-workshop');
  const workshopFileInput = document.getElementById('workshop-file-input');

  // Add null checks for all DOM elements before using them
  if (!sidebarContent) console.warn('sidebar-content element not found');
  if (!dropArea) console.warn('drop-area element not found');
  if (!workshopContent) console.warn('workshop-content element not found');
  if (!loadWorkshopButton) console.warn('load-workshop element not found');
  if (!selectWorkshopButton) console.warn('select-workshop element not found');
  if (!restartWorkshopButton) console.warn('restart-workshop element not found');
  if (!workshopFileInput) console.warn('workshop-file-input element not found');

  let draggedElement = null;
  let blockDefinitions = {};  // key: blockType
  let steps = [];
  let currentStepIndex = 0;

  // ---------------------------
  // Initialize rxvt terminal
  // ---------------------------
  const termContainer = document.getElementById('output-terminal');
  const term = new Terminal({
    theme: {
      background: '#1d1f21',
      foreground: '#c5c8c6',
      cursor: '#f8f8f0'
    },
    fontFamily: '"Fira Code", "Source Code Pro", monospace',
    fontSize: 14,
    cursorBlink: true
  });
  const fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open(termContainer);
  fitAddon.fit();

  // Show welcome message at startup
  function showWelcome() {
    term.clear();
    term.write("\x1b[1;35mWelcome to \x1b[1;34mTildeSec's Inspector Editor!\x1b[0m\r\n");
    term.write('$ ');
  }
  showWelcome();

  // Command buffer for interactive input via the terminal.
  let currentCommand = '';

  // Capture interactive input from rxvt terminal.
  term.onData((data) => {
    if (data === '\r') {
      // When Enter is pressed, run the command
      term.write('\r\n');
      runCommand(currentCommand);
      currentCommand = '';
    } else if (data === '\u007F') {
      // Handle backspace
      if (currentCommand.length > 0) {
        currentCommand = currentCommand.slice(0, -1);
        term.write('\b \b');
      }
    } else {
      currentCommand += data;
      term.write(data);
    }
  });



  // ---------------------------
  // Function to run a command via the server and output to the terminal.
  // ---------------------------
 /**
* Sends a shell command to the server and streams the output back to the terminal.
* @param {string} commandStr - The shell command to execute.
*/
function runCommand(commandStr) {
    if (commandStr.trim() === 'clear' || commandStr.trim() === 'cls') {
      showWelcome();
      return;
    }
    // Send the command to the backend endpoint '/run' using POST request
    fetch('/run', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: commandStr // The command to execute is sent as plain text
    })
    .then(response => {
      // Get a reader to read the response body as a stream
      const reader = response.body.getReader();
      
      // Decoder to convert the byte chunks into readable text
      const decoder = new TextDecoder();
      
      // Optional: Store all the output, in case you want to use it later
      let output = '';
      
      // Read the response stream recursively
      reader.read().then(function processText({ done, value }) {
        // If the stream has ended, write a prompt symbol and return
        if (done) {
          term.write('\r\n$ '); // Re-display shell prompt
          return;
        }

        // Decode the current chunk of data
        const chunk = decoder.decode(value, { stream: true });

        // Append the chunk to output (if needed for storage or logging)
        output += chunk;

        // Display the chunk directly in the terminal UI
        term.write(chunk);

        // Recursively read the next chunk
        reader.read().then(processText);
      });
    })
    .catch(err => {
      // Handle any errors (e.g., network or server issues) and display them
      term.write('\r\nError: ' + err.message + '\r\n$ ');
    });
}

  // ---------------------------
  // Load Blocks from blocks.json according to category.
  // ---------------------------
  function loadBlocksByCategory(category) {
    fetch('/blocks/blocks.json')
      .then(response => response.json())
      .then(blocks => {
        sidebarContent.innerHTML = '';
        blocks.filter(block => block['data-category'] === category)
          .forEach(block => {
            const blockElement = document.createElement('div');
            blockElement.className = 'block';
            blockElement.setAttribute('draggable', true);
            blockElement.dataset.blockType = block.blockType;
            // Build a content container with icon, name and info button.
            const content = document.createElement('div');
            content.className = 'block-content';

            const name = document.createElement('span');
            name.textContent = block.name;
            content.appendChild(name);

            const infoBtn = document.createElement('button');
            infoBtn.className = 'info-btn';
            infoBtn.innerHTML = '<i class="fa fa-info-circle"></i>';
            infoBtn.onclick = (e) => {
              e.stopPropagation();
              showBlockInfo(block);
            };
            content.appendChild(infoBtn);

            blockElement.appendChild(content);
            // Save template for later when dropped.
            blockElement.dataset.template = block.innerHTML;
            // Set drag start.
            blockElement.addEventListener('dragstart', (e) => {
              e.dataTransfer.setData('text/plain', JSON.stringify({
                type: block.blockType,
                template: block.innerHTML
              }));
            });
            sidebarContent.appendChild(blockElement);
          });
      })
      .catch(err => console.error('Error loading blocks:', err));
  }

  // ---------------------------
  // Show block info popup.
  // ---------------------------
  function showBlockInfo(block) {
    const match = block.innerHTML.match(/<p class="explanation">(.*?)<\/p>/);
    const explanationText = match ? match[1] : 'No explanation available';
    const popup = document.createElement('div');
    popup.className = 'info-popup';
    popup.innerHTML = `
      <div class="popup-content">
        <h3>${block.name}</h3>
        <p>${explanationText}</p>
        <button onclick="this.parentElement.parentElement.remove()">Close</button>
      </div>
    `;
    document.body.appendChild(popup);
  }

  // ---------------------------
  // Drop area: allow blocks to be dropped.
  // ---------------------------
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const block = document.createElement('div');
      block.className = 'block';
      block.dataset.blockType = data.type;
      block.innerHTML = data.template;
      // Immediately reveal any input fields.
      const details = block.querySelector('.block-details');
      if (details) {
        details.style.display = 'block';
      }
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerHTML = '×';
      deleteBtn.onclick = () => block.remove();
      block.appendChild(deleteBtn);
      dropArea.appendChild(block);
    } catch (err) {
      console.error('Error handling drop:', err);
    }
  });

  // ---------------------------
  // Category selection handling.
  // ---------------------------
  document.querySelectorAll('.sidebar-category').forEach(category => {
    category.addEventListener('click', () => {
      const categoryType = category.dataset.category;
      if (categoryType === 'filesystem') {
        // You can implement file system loading here.
      } else {
        loadBlocksByCategory(categoryType);
      }
    });
  });

  // ---------------------------
  // Workshop Button Handlers (unchanged as before)
  // ---------------------------
  if (loadWorkshopButton && workshopFileInput) {
    loadWorkshopButton.addEventListener('click', () => {
      workshopFileInput.click();
    });
  }

  function findFileInZip(zip, targetName) {
    // Search zip.files keys for any file whose name ends with the targetName.
    for (let filename in zip.files) {
      if (filename.endsWith(targetName)) {
        return zip.file(filename);
      }
    }
    return null;
  }

  if (workshopFileInput) {
    workshopFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
  
      // If the uploaded file extension is .TildeSec, treat it as a zip archive.
      // (You might also change the file extension on disk or just treat it as ZIP.)
      JSZip.loadAsync(file)
        .then(zip => {
          // Read manifest.json from the root of the zip.
          const manifestFile = zip.file("manifest.json") || findFileInZip(zip, "manifest.json");
          if (!manifestFile) {
            throw new Error("manifest.json not found in zip archive.");
          }
          return manifestFile.async("string")
            .then(manifestStr => {
              const manifest = JSON.parse(manifestStr);
              return { zip, manifest };
            });
        })
        .then(({ zip, manifest }) => {
          // Apply custom CSS if specified in manifest.
          if (manifest.assets && manifest.assets.css) {
            let cssFile = zip.file(manifest.assets.css) || findFileInZip(zip, manifest.assets.css);
            if (cssFile) {
              cssFile.async("string")
                .then(cssContent => {
                  const style = document.createElement('style');
                  style.textContent = cssContent;
                  document.head.appendChild(style);
                })
                .catch(err => console.error(`Error loading CSS file ${manifest.assets.css}:`, err));
            } else {
              console.error(`CSS file ${manifest.assets.css} not found in zip.`);
            }
          }
          // Apply custom JS if specified in manifest.
          if (manifest.assets && manifest.assets.js) {
            let jsFile = zip.file(manifest.assets.js) || findFileInZip(zip, manifest.assets.js);
            if (jsFile) {
              jsFile.async("string")
                .then(jsContent => {
                  const script = document.createElement('script');
                  script.textContent = jsContent;
                  document.body.appendChild(script);
                })
                .catch(err => console.error(`Error loading JS file ${manifest.assets.js}:`, err));
            } else {
              console.error(`JS file ${manifest.assets.js} not found in zip.`);
            }
          }
          // Begin loading workshop steps sequentially.
          if (manifest.steps && manifest.steps.length > 0) {
            loadWorkshopStep(zip, manifest.steps, 0);
          } else {
            workshopContent.innerHTML = "<p>No steps defined in the workshop manifest.</p>";
          }
        })
        .catch(err => {
          console.error("Error loading workshop:", err);
        });
    });
  }
  
  /**
   * Loads and renders a workshop step.
   * @param {JSZip} zip - The loaded zip archive.
   * @param {Array<string>} steps - List of step file paths from the manifest.
   * @param {number} index - The current step index.
   */
  function loadWorkshopStep(zip, steps, index) {
    if (index >= steps.length) {
      workshopContent.innerHTML = "<p>Workshop completed!</p>";
      return;
    }
    
    // Try to locate the step file by its exact path then search by suffix.
    let stepFile = zip.file(steps[index]) || findFileInZip(zip, steps[index]);
    if (!stepFile) {
      console.error(`Step file ${steps[index]} not found in zip.`);
      workshopContent.innerHTML = `<p>Step file ${steps[index]} not found in workshop archive.</p>`;
      return;
    }
    
    stepFile.async("string")
      .then(stepStr => {
        const stepData = JSON.parse(stepStr);
        // Render the step content into the workshop area.
        workshopContent.innerHTML = `
          <h2>Step ${stepData.stepNumber}: ${stepData.title}</h2>
          <p>${stepData.description}</p>
          ${stepData.image ? `<img src="${stepData.image}" alt="Step ${stepData.stepNumber} Image">` : ''}
          <div id="workshop-hints">${stepData.hints ? stepData.hints.join("<br>") : ""}</div>
          <button id="next-step">Next Step</button>
        `;
        // Setup Next Step navigation.
        const nextStepBtn = document.getElementById('next-step');
        nextStepBtn.addEventListener('click', () => {
          loadWorkshopStep(zip, steps, index + 1);
        });
      })
      .catch(err => {
        console.error("Error loading workshop step:", err);
      });
  }

  selectWorkshopButton.addEventListener('click', showWorkshopSelectionPopup);

  restartWorkshopButton.addEventListener('click', () => {
    steps = [];
    currentStepIndex = 0;
    workshopContent.innerHTML = '';
    restartWorkshopButton.disabled = true;
  });

  function showWorkshopSelectionPopup() {
    // (Workshop selection popup logic as before)
    // ...
  }

  // Initially load the "general" category blocks.
  loadBlocksByCategory('general');
});