import { Row } from 'common/layout/Layout';
import { Document } from 'editor/Document';
import React, { Component, createElement, Fragment } from 'react';

import { InputEditor, OutputJSX } from './Editors';

export const Interface = () => {
  const input = InputEditor.use();
  const output = OutputJSX.use();

  <Row>
    <div ref={input.element} />
    <div ref={output.element} />
    <Preview />
  </Row>
}

const Preview = () => {
  const {
    key,
    error,
    onError,
    Preview
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
      <Preview key={key} onError={onError} />
    ) : (
      <issue>Waiting for exports...</issue>
    )}
  </this>
}