import { score } from '../src/scorer';
import { Finding } from '../src/analyzer';

function finding(sev: Finding['severity'], cat: Finding['category'] = 'code-exec'): Finding {
  return { file: 'x.ts', line: 1, category: cat, severity: sev, message: 'test', snippet: '' };
}

describe('scorer', () => {
  it('gives A for no findings', () => {
    const s = score([]);
    expect(s.grade).toBe('A');
    expect(s.score).toBe(100);
  });

  it('gives B for medium findings', () => {
    const s = score([finding('medium', 'network')]);
    expect(s.grade).toBe('B');
  });

  it('gives C for high finding', () => {
    const s = score([finding('high', 'filesystem')]);
    expect(s.grade).toBe('C');
  });

  it('gives F for critical finding', () => {
    const s = score([finding('critical', 'code-exec')]);
    expect(s.grade).toBe('F');
  });

  it('gives F for 3+ high findings', () => {
    const s = score([finding('high'), finding('high'), finding('high')]);
    expect(s.grade).toBe('F');
  });

  it('caps score at 0', () => {
    const many = Array(20).fill(null).map(() => finding('critical'));
    const s = score(many);
    expect(s.score).toBe(0);
  });
});
