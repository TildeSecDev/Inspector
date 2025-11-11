let pty;
try {
  pty = require('node-pty-prebuilt-multiarch');
} catch (e) {
  pty = require('node-pty');
}
const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';
const term = pty.spawn(shell, [], { cols: 80, rows: 24 });
let output = '';
term.on('data', data => output += data);
term.write('echo test\r');
setTimeout(() => {
  term.kill();
  if (output.toLowerCase().includes('test')) {
    console.log('node-pty working');
  } else {
    console.error('node-pty failed');
    process.exit(1);
  }
}, 500);
