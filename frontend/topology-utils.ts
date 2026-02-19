/**
 * Utility functions for topology management and YAML generation
 * This module provides the core transformations needed by the frontend
 */

/**
 * Converts frontend topology JSON to containerlab YAML format
 * @param {Object} topology - Frontend topology object
 * @returns {string} YAML string ready for containerlab
 */
export function topologyToYaml(topology: any): string {
  // Build YAML string
  let yaml = `name: ${topology.name}\n\ntopology:\n`;

  // Add nodes
  yaml += `  nodes:\n`;
  topology.nodes.forEach((node: any) => {
    yaml += `    ${node.id}:\n`;
    yaml += `      kind: ${node.kind}\n`;
    if (node.image) {
      yaml += `      image: ${node.image}\n`;
    }

    // Add exec commands if present
    if (node.properties.exec && node.properties.exec.length > 0) {
      yaml += `      exec:\n`;
      node.properties.exec.forEach((cmd: any) => {
        yaml += `        - ${escapeYamlString(cmd)}\n`;
      });
    }

    // Add environment variables if present
    if (
      node.properties.env &&
      Object.keys(node.properties.env).length > 0
    ) {
      yaml += `      env:\n`;
      Object.entries(node.properties.env).forEach(([key, value]) => {
        yaml += `        ${key}: ${escapeYamlString(value)}\n`;
      });
    }

    // Add binds/volumes if present
    if (node.properties.binds && node.properties.binds.length > 0) {
      yaml += `      binds:\n`;
      node.properties.binds.forEach((bind: any) => {
        yaml += `        - ${escapeYamlString(bind)}\n`;
      });
    }
  });

  // Add links
  if (topology.links && topology.links.length > 0) {
    yaml += `  links:\n`;
    topology.links.forEach((link: any) => {
      const sourceEndpoint = `${link.source.deviceId}:${link.source.interface}`;
      const targetEndpoint = `${link.target.deviceId}:${link.target.interface}`;
      yaml += `    - endpoints: ["${sourceEndpoint}", "${targetEndpoint}"]\n`;
    });
  }

  return yaml;
}

/**
 * Validates topology against schema
 * @param {Object} topology - Topology object to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateTopology(topology: any): { valid: boolean; errors: string[] } {
  const errors = [];

  // Check required fields
  if (!topology.name) {
    errors.push("Topology name is required");
  }

  if (!topology.nodes || topology.nodes.length === 0) {
    errors.push("At least one node is required");
  }

  // Validate nodes
  const nodeIds = new Set();
  topology.nodes?.forEach((node: any) => {
    if (!node.id) errors.push(`Node missing id`);
    if (!node.kind) errors.push(`Node ${node.id} missing kind`);
    if (!node.name) errors.push(`Node ${node.id} missing name`);

    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}`);
    }
    nodeIds.add(node.id);
  });

  // Validate links
  topology.links?.forEach((link: any, idx: number) => {
    if (!link.source?.deviceId) {
      errors.push(`Link ${idx} missing source deviceId`);
    }
    if (!link.source?.interface) {
      errors.push(`Link ${idx} missing source interface`);
    }
    if (!link.target?.deviceId) {
      errors.push(`Link ${idx} missing target deviceId`);
    }
    if (!link.target?.interface) {
      errors.push(`Link ${idx} missing target interface`);
    }

    // Check if linked devices exist
    if (!nodeIds.has(link.source?.deviceId)) {
      errors.push(`Link ${idx} references non-existent source device`);
    }
    if (!nodeIds.has(link.target?.deviceId)) {
      errors.push(`Link ${idx} references non-existent target device`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Escapes strings for YAML output
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeYamlString(str: any): string {
  if (!str) return '""';

  // Check if string needs quoting
  if (
    /[:#\[\]\{\},&*!|>'"%@`]/.test(str) ||
    /^\s|\s$/.test(str) ||
    str.includes(": ")
  ) {
    // Use single quotes and escape single quotes
    return `'${str.replace(/'/g, "''")}'`;
  }

  return str;
}

/**
 * Generates unique node ID based on name
 * @param {string} name - Node name
 * @param {Set} existingIds - Set of existing IDs
 * @returns {string} Unique node ID
 */
export function generateNodeId(name: any, existingIds: Set<any> = new Set()): string {
  let id = name.toLowerCase().replace(/\s+/g, "-");
  let counter = 1;

  while (existingIds.has(id)) {
    id = `${name.toLowerCase().replace(/\s+/g, "-")}-${counter}`;
    counter++;
  }

  return id;
}

/**
 * Generates unique link ID based on endpoints
 * @param {string} sourceId - Source device ID
 * @param {string} targetId - Target device ID
 * @param {Set} existingIds - Set of existing IDs
 * @returns {string} Unique link ID
 */
export function generateLinkId(sourceId: any, targetId: any, existingIds: Set<any> = new Set()): string {
  let id = `link-${sourceId}-${targetId}`;
  let counter = 1;

  while (existingIds.has(id)) {
    id = `link-${sourceId}-${targetId}-${counter}`;
    counter++;
  }

  return id;
}

/**
 * Creates a new node from template
 * @param {Object} template - Device template
 * @param {Set} existingIds - Set of existing node IDs
 * @returns {Object} New node object
 */
export function createNodeFromTemplate(template: any, existingIds: Set<any> = new Set()): any {
  const nodeId = generateNodeId(template.name, existingIds);

  return {
    id: nodeId,
    name: template.name,
    kind: template.kind,
    image: template.image,
    properties: JSON.parse(JSON.stringify(template.properties)),
    ui: {
      ...template.ui,
      position: template.ui.defaultPosition || { x: 0, y: 0 },
    },
    configurableFields: template.configurableFields,
  };
}

/**
 * Updates node properties while maintaining structure
 * @param {Object} node - Node to update
 * @param {Object} updates - Property updates
 * @returns {Object} Updated node
 */
export function updateNode(node: any, updates: any): any {
  return {
    ...node,
    ...updates,
    properties: {
      ...node.properties,
      ...updates.properties,
    },
  };
}

/**
 * Exports topology as JSON file
 * @param {Object} topology - Topology object
 * @param {string} filename - Output filename
 */
export function exportTopologyJson(topology: any, filename: string): void {
  const jsonString = JSON.stringify(topology, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  downloadFile(blob, filename);
}

/**
 * Exports topology as YAML file
 * @param {Object} topology - Topology object
 * @param {string} filename - Output filename
 */
export function exportTopologyYaml(topology: any, filename: string): void {
  const yamlString = topologyToYaml(topology);
  const blob = new Blob([yamlString], { type: "text/yaml" });
  downloadFile(blob, `${filename}.yml`);
}

/**
 * Helper function to download file
 * @param {Blob} blob - File content as blob
 * @param {string} filename - Filename
 */
function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Checks if a node has duplicate interface assignments
 * @param {Object} topology - Topology object
 * @returns {Object} { hasDuplicates: boolean, duplicates: string[] }
 */
export function checkInterfaceDuplicates(topology: any) {
  const interfaceUsage: Record<string, boolean> = {};
  const duplicates: string[] = [];

  topology.links?.forEach((link: any) => {
    const sourceKey = `${link.source.deviceId}:${link.source.interface}`;
    const targetKey = `${link.target.deviceId}:${link.target.interface}`;

    if (interfaceUsage[sourceKey]) {
      duplicates.push(`${sourceKey} already connected`);
    }
    if (interfaceUsage[targetKey]) {
      duplicates.push(`${targetKey} already connected`);
    }

    interfaceUsage[sourceKey] = true;
    interfaceUsage[targetKey] = true;
  });

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates,
  };
}

/**
 * Suggests available interfaces for a node
 * @param {Object} topology - Topology object
 * @param {string} nodeId - Node ID
 * @param {Object} node - Node object
 * @returns {string[]} Array of available interface names
 */
export function getAvailableInterfaces(topology: any, nodeId: any, node: any): string[] {
  const usedInterfaces = new Set();

  topology.links?.forEach((link: any) => {
    if (link.source.deviceId === nodeId) {
      usedInterfaces.add(link.source.interface);
    }
    if (link.target.deviceId === nodeId) {
      usedInterfaces.add(link.target.interface);
    }
  });

  // Generate available interfaces based on device kind
  const baseInterfaces =
    node.kind === "rare"
      ? ["ethernet1", "ethernet2", "ethernet3", "ethernet4", "ethernet5", "ethernet6", "ethernet7", "ethernet8"]
      : ["eth0", "eth1", "eth2", "eth3", "eth4", "eth5"];

  return baseInterfaces.filter((iface) => !usedInterfaces.has(iface));
}
