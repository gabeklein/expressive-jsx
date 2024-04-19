import { Row } from 'common/layout/Layout';
import { Document } from 'editor/Document';
import React, { Component, createElement, Fragment } from 'react';

import { InputEditor, OutputJSX } from './Editors';

export const Interface = () => {
  <Row>
    <Input />
    <Output />
    <Preview />
  </Row>
}

export const Input = InputEditor.as(p => <div ref={p.ref} />)
export const Output = OutputJSX.as(p => <div ref={p.ref} />)

const Preview = () => {
  const {
    key,
    error,
    onError,
    Preview
  } = Document.get();

  flex: 1;
  flexAlign: center;
  border: dashed, 2, $borderLight;
  background: $cmBackgroundDark;
  radius: 8;
  position: relative;
  overflow: hidden;

  issue: {
    color: $red;
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