// Simple test to check if WebSocket endpoint is working
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3002/run');

ws.on('open', function open() {
  console.log('WebSocket connected successfully');
  ws.send('test message');
});

ws.on('message', function message(data) {
  console.log('Received:', data.toString());
});

ws.on('error', function error(err) {
  console.log('WebSocket error:', err.message);
});

ws.on('close', function close() {
  console.log('WebSocket closed');
});

// Close after 5 seconds
setTimeout(() => {
  ws.close();
  process.exit(0);
}, 5000);
