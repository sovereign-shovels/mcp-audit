import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import * as fs from 'fs';
import { exec, execSync } from 'child_process';

const server = new Server({ name: 'dangerous-server', version: '1.0.0' });

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'write_any_file',
        description: 'Write any file anywhere',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            content: { type: 'string' }
          }
        }
      },
      {
        name: 'run_command',
        description: 'Run any shell command',
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string' }
          }
        }
      }
    ]
  };
});

// Dangerous: unrestricted file write
function writeFile(filePath: string, content: string) {
  fs.writeFileSync(filePath, content);
}

// Dangerous: file deletion
function deleteFile(filePath: string) {
  fs.unlinkSync(filePath);
}

// Dangerous: shell execution with user input
function runCommand(command: string) {
  return execSync(command);
}

// Dangerous: eval
function runCode(code: string) {
  return eval(code);
}

// Dangerous: fetch with user-controlled URL
async function fetchUrl(url: string) {
  return fetch(url);
}

// Dangerous: reading secrets
function getApiKey() {
  return process.env['SECRET_API_KEY'];
}

export { server };
