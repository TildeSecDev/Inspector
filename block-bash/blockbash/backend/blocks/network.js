const { spawn } = require('child_process');
const fs = require('fs');

// NOTE: Make sure the backend process has permission to run tshark (may require root or group membership).
// Only expose packet capture functionality to trusted/privileged users!

// List available interfaces using `tshark -D`
function listTsharkInterfaces() {
  return new Promise((resolve, reject) => {
    const tshark = spawn('tshark', ['-D']);
    let output = '';
    tshark.stdout.on('data', (data) => {
      output += data.toString();
    });
    tshark.stderr.on('data', (data) => {
      // Ignore warnings about permissions
    });
    tshark.on('close', (code) => {
      if (code === 0 || output) {
        // Parse output: "1. eth0\n2. wlan0\n..."
        const interfaces = output
          .split('\n')
          .filter(Boolean)
          .map(line => {
            const match = line.match(/^\d+\.\s+([^\s]+)/);
            return match ? match[1] : null;
          })
          .filter(Boolean);
        resolve(interfaces);
      } else {
        reject(new Error('Failed to list interfaces'));
      }
    });
  });
}

// Capture packets using tshark
function capturePackets({ iface, packetCount = 10, displayFilter = '', outputFile = 'capture.json' }) {
  return new Promise((resolve, reject) => {
    const args = ['-i', iface, '-c', String(packetCount), '-T', 'json'];
    if (displayFilter) {
      args.push('-Y', displayFilter);
    }
    const tshark = spawn('tshark', args);

    let rawData = '';
    tshark.stdout.on('data', (data) => {
      rawData += data.toString();
    });
    tshark.stderr.on('data', (data) => {
      // Optionally collect errors
    });
    tshark.on('close', (code) => {
      if (!rawData) {
        return reject(new Error('No data captured'));
      }
      try {
        const parsedData = JSON.parse(rawData);
        fs.writeFileSync(outputFile, JSON.stringify(parsedData, null, 2));
        resolve({ code, outputFile, packets: parsedData });
      } catch (err) {
        reject(new Error('Failed to parse JSON from tshark: ' + err.message));
      }
    });
  });
}

// Helper: Format packet data for user-friendly visualization
function formatPacketsForVisualization(packets) {
  // Return a summary: array of { time, src, dst, protocol, info }
  return packets.map(pkt => {
    const frame = pkt._source?.layers || {};
    return {
      time: frame['frame.time'] || '',
      src: frame['ip.src'] || frame['eth.src'] || '',
      dst: frame['ip.dst'] || frame['eth.dst'] || '',
      protocol: frame['frame.protocols'] || '',
      info: frame['frame.len'] ? `Length: ${frame['frame.len']}` : ''
    };
  });
}

// Example block handler for network blocks
async function executeNetworkBlock(block) {
  switch (block.type) {
    case 'list-interfaces':
      return await listTsharkInterfaces();
    case 'tshark-capture':
      // block.inputs: { iface, packetCount, displayFilter, outputFile }
      if (!block.inputs || !block.inputs.iface) {
        throw new Error('Interface is required');
      }
      return await capturePackets({
        iface: block.inputs.iface,
        packetCount: block.inputs.packetCount || 10,
        displayFilter: block.inputs.displayFilter || '',
        outputFile: block.inputs.outputFile || 'capture.json'
      });
    case 'wireshark':
      // Visual Wireshark block: capture and return formatted data for frontend visualization
      if (!block.inputs || !block.inputs.iface) {
        throw new Error('Interface is required');
      }
      const result = await capturePackets({
        iface: block.inputs.iface,
        packetCount: block.inputs.packetCount || 20,
        displayFilter: block.inputs.displayFilter || '',
        outputFile: block.inputs.outputFile || 'wireshark_capture.json'
      });
      // Format for frontend visualization
      return {
        summary: formatPacketsForVisualization(result.packets),
        raw: result.packets
      };
    default:
      throw new Error('Unknown network block type');
  }
}

// In your backend route/controller (not in this file):
// Example usage:
// const { executeNetworkBlock } = require('./backend/blocks/network');
// app.post('/api/network-block', async (req, res) => {
//   // --- AUTHENTICATION/AUTHORIZATION CHECK ---
//   if (!req.user || !req.user.isAdmin) {
//     return res.status(403).json({ error: 'Unauthorized' });
//   }
//   try {
//     const result = await executeNetworkBlock(req.body.block);
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

module.exports = {
  listTsharkInterfaces,
  capturePackets,
  executeNetworkBlock,
  formatPacketsForVisualization
};