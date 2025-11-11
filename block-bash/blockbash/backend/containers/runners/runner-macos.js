// runners/runner-macos.js
const { Client } = require('ssh2');
const Docker = require('dockerode');

const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' });

async function ensureMacOSContainer(username) {
  const image = process.env.MACOS_IMAGE || 'dockur/macos';
  try {
    await docker.pull(image, {});
  } catch (e) {
    console.warn('MacOS image pull failed:', e.message);
  }
  const container = await docker.createContainer({
    Image: image,
    Tty: true,
    HostConfig: {
      AutoRemove: false,
      Memory: parseInt(process.env.SANDBOX_MEMORY || '1073741824', 10), // 1GiB for macOS
      NanoCPUs: parseInt(process.env.SANDBOX_NANO_CPUS || '1000000000', 10), // 1 CPU
      PortBindings: { '22/tcp': [{ HostPort: '0' }] }, // Dynamic port for SSH
      CapDrop: ['ALL'],
      Privileged: false,
      NoNewPrivileges: true
    },
    Env: [`USER_NAME=${username}`]
  });
  await container.start();
  const inspect = await container.inspect();
  const sshPort = inspect.NetworkSettings.Ports['22/tcp'][0].HostPort;
  return { containerId: container.id, sshPort };
}

async function execInMacOS(username, command, onData, onExit) {
  const { containerId, sshPort } = await ensureMacOSContainer(username);
  const conn = new Client();
  conn.on('ready', () => {
    conn.exec(command, (err, stream) => {
      if (err) return onExit(null, err);
      stream.on('close', (code) => onExit(code));
      stream.on('data', (data) => onData(data.toString()));
      stream.stderr.on('data', (data) => onData(data.toString()));
    });
  }).connect({
    host: 'localhost',
    port: sshPort,
    username: 'inspector', // Assume user created in container
    password: 'password' // Placeholder; use key-based auth in prod
  });
}

module.exports = { ensureMacOSContainer, execInMacOS };
