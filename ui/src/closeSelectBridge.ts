// ui/src/closeSelectBridge.ts
// Listens to messages from client Lua to hide/show the entire select UI.

function setDisplay(show: boolean) {
  const root = document.getElementById('root');
  if (root) root.style.display = show ? 'block' : 'none';
}

// Default: show UI
setDisplay(true);

// Handle messages from client
window.addEventListener('message', (e: MessageEvent) => {
  const data = e.data || {};
  switch (data.action) {
    case 'closeSelect':
      // Hide the whole UI when creator scene starts
      setDisplay(false);
      break;
    case 'openSelect':
      // Show it again when character menu should be visible
      setDisplay(true);
      break;
  }
});
