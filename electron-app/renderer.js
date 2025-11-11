// Simple renderer glue to interact with preload-exposed electronAPI
const openBtn = document.getElementById('openBtn');
const saveBtn = document.getElementById('saveBtn');
const aboutBtn = document.getElementById('aboutBtn');
const editor = document.getElementById('editor');
const openedPath = document.getElementById('openedPath');
const platformSpan = document.getElementById('platform');

(async () => {
  if (window.electronAPI) {
    platformSpan.textContent = window.electronAPI.platform;
    window.electronAPI.onFileOpened((data) => {
      if (data && data.content !== undefined) {
        editor.value = data.content;
        openedPath.textContent = data.path || '(untitled)';
      }
    });
  }
})();

openBtn.addEventListener('click', async () => {
  if (!window.electronAPI) return alert('Native API not available');
  const res = await window.electronAPI.openFile();
  if (!res) return;
  if (res.error) return alert('Error opening file: ' + res.error);
  editor.value = res.content || '';
  openedPath.textContent = res.path || '(untitled)';
});

saveBtn.addEventListener('click', async () => {
  const path = openedPath.textContent === '(none)' ? null : openedPath.textContent;
  if (!path) return alert('No file opened. Use Open to pick a file to save.');
  const content = editor.value;
  const res = await window.electronAPI.saveFile({ path, content });
  if (res && res.ok) alert('Saved.'); else alert('Save failed: ' + (res && res.error));
});

aboutBtn.addEventListener('click', () => {
  alert('Inspector — Standalone Electron app\n\nBuilt for demonstration.');
});
