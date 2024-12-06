import * as Babel from '@babel/standalone';
import Preset from '@expressive/babel-preset';
import * as POLYFILL from '@expressive/babel-preset/polyfill';
import * as MVC from '@expressive/react';
import React, { Component } from 'react';

/** Imports shared with sandbox. */
const SANDBOX_MODULES: Record<string, any> = {
  "react": React,
  "polyfill": POLYFILL,
  "@expressive/react": MVC
}

export type PreviewComponent = React.FC<Boundary.Props>;

export function run(source: string){
  const module = { exports: {} as Record<string, any> };
  const require = (name: string) => SANDBOX_MODULES[name];
  const evaluate = new Function("require", "exports", "module", source);

  evaluate(require, module.exports, module);

  return module.exports as Record<string, any>;
}

export function toReact(input: string): PreviewComponent {
  const result = Babel.transform(input, {
    filename: '/REPL.js',
    presets: [
      [Preset, {
        polyfill: "polyfill"
      }]
    ],
    plugins: [
      "transform-react-jsx",
      "transform-modules-commonjs"
    ]
  });

  const { code, metadata: { css } } = result as Preset.Result;
  const exports = run('const React = require("react");\n' + code);
  const Component = Object.values(exports)[0] as React.FC;
  const styles = exports.css;

  return (props) => (
    <Boundary {...props}>
      <Component />
      <style>{css}</style>
      {typeof styles == "string" && (
        <style>{styles}</style>
      )}
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