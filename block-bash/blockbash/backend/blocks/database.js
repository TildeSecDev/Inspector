const mysql = require('mysql2/promise');
const { Client } = require('pg');

async function executeDatabaseBlock(block) {
  switch (block.type) {
    case 'db-connect':
      // Example for MySQL
      if (block.inputs && block.inputs.connection_string) {
        const connection = await mysql.createConnection(block.inputs.connection_string);
        await connection.end();
        return { code: 0, stdout: 'Connected successfully' };
      }
      break;
    case 'db-query':
      // Example for PostgreSQL
      if (block.inputs && block.inputs.query && block.inputs.connection_string) {
        const client = new Client({ connectionString: block.inputs.connection_string });
        await client.connect();
        const res = await client.query(block.inputs.query);
        await client.end();
        return { code: 0, stdout: JSON.stringify(res.rows) };
      }
      break;
    case 'db-backup':
      // Implement backup logic as needed
      return { code: 0, stdout: 'Backup not implemented' };
    default:
      return { code: 1, stderr: 'Unknown database block type' };
  }
}

module.exports = { executeDatabaseBlock };