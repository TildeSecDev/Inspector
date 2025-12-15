import Docker from 'dockerode';

export interface LabConfig {
  name: string;
  services: ServiceConfig[];
}

export interface ServiceConfig {
  name: string;
  image: string;
  ports?: Record<string, string>;
  environment?: Record<string, string>;
  command?: string;
}

export interface LabStatus {
  running: boolean;
  services: { name: string; status: string; ports: string[] }[];
}

/**
 * Lab runtime for managing local Docker containers
 * SAFETY: Only allows localhost and 127.0.0.1 connections
 */
export class LabRuntime {
  private docker: Docker;
  private runningContainers: Map<string, string> = new Map(); // service name -> container id

  constructor() {
    this.docker = new Docker();
  }

  /**
   * Start a lab environment
   */
  async startLab(config: LabConfig): Promise<void> {
    console.log(`Starting lab: ${config.name}`);

    for (const service of config.services) {
      await this.startService(service);
    }
  }

  private async startService(service: ServiceConfig): Promise<void> {
    // Port mapping with localhost enforcement
    const portBindings: Record<string, any> = {};
    const exposedPorts: Record<string, any> = {};

    if (service.ports) {
      for (const [containerPort, hostPort] of Object.entries(service.ports)) {
        portBindings[containerPort] = [{ HostIp: '127.0.0.1', HostPort: hostPort }];
        exposedPorts[containerPort] = {};
      }
    }

    const container = await this.docker.createContainer({
      Image: service.image,
      name: `inspectortwin-${service.name}`,
      Env: service.environment ? Object.entries(service.environment).map(([k, v]) => `${k}=${v}`) : [],
      Cmd: service.command ? service.command.split(' ') : undefined,
      HostConfig: {
        PortBindings: portBindings,
        NetworkMode: 'bridge', // Isolated network
      },
      ExposedPorts: exposedPorts,
    });

    await container.start();
    this.runningContainers.set(service.name, container.id);
    console.log(`Service ${service.name} started`);
  }

  /**
   * Stop the lab environment
   */
  async stopLab(): Promise<void> {
    for (const [serviceName, containerId] of this.runningContainers.entries()) {
      try {
        const container = this.docker.getContainer(containerId);
        await container.stop();
        await container.remove();
        console.log(`Service ${serviceName} stopped`);
      } catch (error) {
        console.error(`Failed to stop service ${serviceName}:`, error);
      }
    }

    this.runningContainers.clear();
  }

  /**
   * Get status of lab
   */
  async getStatus(): Promise<LabStatus> {
    const services: { name: string; status: string; ports: string[] }[] = [];

    for (const [serviceName, containerId] of this.runningContainers.entries()) {
      try {
        const container = this.docker.getContainer(containerId);
        const info = await container.inspect();

        const ports: string[] = [];
        if (info.NetworkSettings.Ports) {
          for (const [containerPort, bindings] of Object.entries(info.NetworkSettings.Ports)) {
            if (bindings) {
              for (const binding of bindings as any[]) {
                ports.push(`${binding.HostIp}:${binding.HostPort}`);
              }
            }
          }
        }

        services.push({
          name: serviceName,
          status: info.State.Status,
          ports,
        });
      } catch (error) {
        services.push({
          name: serviceName,
          status: 'error',
          ports: [],
        });
      }
    }

    return {
      running: services.length > 0,
      services,
    };
  }

  /**
   * Perform safety checks on container configuration
   */
  static validateConfig(config: LabConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const isAllowedHost = (value: string) => {
      // Allow localhost/127.0.0.1 or RFC1918 192.168.x.x
      if (value === 'localhost' || value === '127.0.0.1') return true;
      const m = value.match(/^192\.168\.(\d{1,3})\.(\d{1,3})$/);
      if (!m) return false;
      const [a, b] = [Number(m[1]), Number(m[2])];
      return a >= 0 && a <= 255 && b >= 0 && b <= 255;
    };

    for (const service of config.services) {
      // Ensure only localhost bindings
      if (service.ports) {
        for (const hostPort of Object.values(service.ports)) {
          // If user provided hostPort like "127.0.0.1:8000" or "192.168.x.x:8000", validate host; otherwise treat as port number
          const parts = hostPort.split(':');
          if (parts.length === 2) {
            const [host, port] = parts;
            if (!isAllowedHost(host)) {
              errors.push(`Service ${service.name}: External IP binding not allowed (${host}). Use localhost/127.0.0.1/192.168.x.x only.`);
            }
            if (Number.isNaN(Number(port))) {
              errors.push(`Service ${service.name}: Host port must be numeric (${hostPort}).`);
            }
          } else if (parts.length === 1) {
            if (Number.isNaN(Number(parts[0]))) {
              errors.push(`Service ${service.name}: Host port must be numeric (${hostPort}).`);
            }
          } else {
            errors.push(`Service ${service.name}: Invalid port mapping format (${hostPort}).`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
