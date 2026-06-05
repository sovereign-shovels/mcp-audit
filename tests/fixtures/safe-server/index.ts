import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({ name: 'safe-server', version: '1.0.0' });

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'read_file',
        description: 'Read a file from the allowed directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' }
          }
        }
      }
    ]
  };
});

// Safe: only reads from allowed directory
function readAllowedFile(filePath: string) {
  const allowedDir = '/tmp/allowed';
  if (!filePath.startsWith(allowedDir)) {
    throw new Error('Access denied');
  }
  return fs.readFileSync(filePath, 'utf-8');
}

// Safe: fetch to known endpoint
async function fetchData() {
  const response = await fetch('https://api.example.com/data');
  return response.json();
}

export { server };
