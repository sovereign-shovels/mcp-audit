import { Provider } from '../src/provider';

describe('provider', () => {
  it('constructs with config', () => {
    const p = new Provider({ name: 'test', endpoint: 'http://localhost:11434', model: 'm' });
    expect(p.config.name).toBe('test');
  });

  it('fromEnv uses defaults when env vars missing', () => {
    const p = Provider.fromEnv('MCP_AUDIT_TEST_', { name: 'local', endpoint: 'http://localhost:11434', model: 'llama3.2' });
    expect(p.config.name).toBe('local');
  });
});
