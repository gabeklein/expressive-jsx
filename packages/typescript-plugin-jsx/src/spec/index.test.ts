import { it, expect } from 'vitest';
import { getDiagnosticsWithPlugin } from './helpers';
import { describe } from 'node:test';

it('suppresses diagnostics for <this> JSX usage', () => {
  const code = `
    const x = <this />;
  `
  const issues = getDiagnosticsWithPlugin(code);

  expect(issues).toHaveLength(0);
});

it('reports real type errors', () => {
  const code = 'const x: number = "foo";';
  const issues = getDiagnosticsWithPlugin(code, 'file.ts');
  expect(issues.some(d => d.code === 2322)).toBe(true); // Type 'string' is not assignable to type 'number'.
});

describe("conditional", () => {
  it("will suppress for label child", () => {
    const code = `
      const Component = () => {
        if(".active")
          color: red;
      }
    `
    const issues = getDiagnosticsWithPlugin(code);
  
    expect(issues).toHaveLength(0);
  })

  it("will suppress for multiple label children", () => {
    const code = `
      const Component = () => {
        if(".active"){
          color: red;
          color: blue;
        }
      }
    `
    const issues = getDiagnosticsWithPlugin(code);
  
    expect(issues).toHaveLength(0);
  });
})

