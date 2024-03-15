import { Document } from 'editor/Document';
import React, { Component, createElement, Fragment } from 'react';

export const Preview = () => {
  const {
    key,
    error,
    onError,
    Preview,
    output_css,
  } = Document.get();

  flex: 1;
  flexAlign: center;
  border: dashed, 2, 0xccc;
  radius: 8;
  position: relative;
  overflow: hidden;

  issue: {
    color: 0xd47878;
  }

  <this>
    {error ? (
      <issue>{error}</issue>
    ) : Preview ? (
      <Boundary key={key} onError={onError}>
        <Preview />
        <style>{output_css}</style>
      </Boundary>
    ) : (
      <Issue>Waiting for exports...</Issue>
    )}
  </this>
}

class Boundary extends Component {
  componentDidCatch = this.props.onError;

  render(){
    return (this.state || {}).hasError
      ? null : this.props.children;
  };

  static getDerivedStateFromError(){
    return { hasError: true };
  }
}