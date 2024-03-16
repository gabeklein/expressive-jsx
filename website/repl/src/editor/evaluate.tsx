import * as Babel from '@babel/standalone';
import Preset from '@expressive/babel-preset-web';
import * as POLYFILL from '@expressive/babel-preset-web/polyfill';
import * as MVC from '@expressive/react';
import React, { Component } from 'react';

/** Imports shared with sandbox. */
export const SANDBOX_MODULES: Record<string, any> = {
  "react": React,
  "polyfill": POLYFILL,
  "@expressive/react": MVC
}

export type PreviewComponent = React.FC<Boundary.Props>;

export function evaluate(input: string): PreviewComponent {
  const result = Babel.transform(input, {
    filename: '/REPL.js',
    presets: [
      [Preset, {
        polyfill: "polyfill"
      } as Preset.Options]
    ],
    plugins: [
      "transform-react-jsx",
      "transform-modules-commonjs"
    ]
  });

  const { code, metadata: { css } } = result as Preset.Result;
  const source = `const React = require("react");\n` + code;
  const evaluate = new Function("require", "exports", "module", source);
  const require = (name: string) => SANDBOX_MODULES[name];
  const module = { exports: {} };

  evaluate(require, module.exports, module);

  const Component = Object.values(module.exports)[0] as React.FC;

  return (props) => (
    <Boundary {...props}>
      <Component />
      <style>{css}</style>
    </Boundary>
  );
}

declare namespace Boundary {
  interface Props {
    children: any;
    onError: any;
  }
  interface State {
    hasError: any;
  }
}

class Boundary extends Component<Boundary.Props, Boundary.State> {
  componentDidCatch = this.props.onError;

  render(){
    return this.state?.hasError ? null : this.props.children;
  };

  static getDerivedStateFromError(){
    return { hasError: true };
  }
}