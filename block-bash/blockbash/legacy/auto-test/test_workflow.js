// Automated workflow test for Inspector RPG terminal validation
// Usage: node auto-test/test_workflow.js

const WebSocket = require('ws');
const assert = require('assert');

const WS_URL = 'ws://localhost:3002/run';
const ACTIVITY = 'rpg';
const COMMAND = 'ls';
const USERNAME = 'testuser';

let validationReceived = false;
let timeoutId = null;

function runTest() {
  const ws = new WebSocket(WS_URL, {
    headers: {
      Cookie: `username=${USERNAME}`
    }
  });

  function logWithTime(...args) {
    const now = new Date().toISOString();
    console.log(`[${now}]`, ...args);
  }

  ws.on('open', () => {
    logWithTime('[test] WebSocket opened');
    // Set activity
    ws.send(JSON.stringify({ type: 'set-activity', activity: ACTIVITY }));
    setTimeout(() => {
      logWithTime('[test] Sending command:', COMMAND);
      ws.send(COMMAND);
    }, 200);
    // Add a timeout to fail if no validation result is received
    timeoutId = setTimeout(() => {
      if (!validationReceived) {
        logWithTime('Test failed: Timeout waiting for validation result');
        ws.terminate();
        process.exit(2);
      }
    }, 12000); // 12 seconds
  });

  ws.on('message', (data) => {
    logWithTime('[test] Message from server:', data.toString());
    // Try to parse JSON validation message
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'validation') {
        validationReceived = true;
        clearTimeout(timeoutId);
        logWithTime('[test] Validation result:', msg.data);
        assert('pass' in msg.data, 'Validation result missing pass property');
        ws.close();
      }
    } catch (e) {
      // Not JSON, just shell output
      logWithTime('[test] Non-JSON shell output:', data.toString());
    }
  });

  ws.on('close', () => {
    logWithTime('[test] WebSocket closed');
    if (!validationReceived) {
      clearTimeout(timeoutId);
      logWithTime('Test failed: Did not receive validation result');
      process.exit(1);
    } else {
      clearTimeout(timeoutId);
      logWithTime('Test passed: Validation result received');
      process.exit(0);
    }
  });

  ws.on('error', (err) => {
    clearTimeout(timeoutId);
    logWithTime('WebSocket error:', err);
    process.exit(1);
  });
}

runTest();
