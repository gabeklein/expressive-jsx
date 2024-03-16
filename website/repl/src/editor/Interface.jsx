import { Row } from 'common/layout/Layout';
import { Document } from 'editor/Document';
import React, { Component, createElement, Fragment } from 'react';

import { InputEditor, OutputJSX } from './Editors';

/** @type {React.FC} */
const InputJSX = () => {
  const { element } = InputEditor.use();

  <div ref={element} />
}

/** @type {React.FC} */
const ShowJSX = () => {
  const { element } = OutputJSX.use();

  <div ref={element} />
}

export const Interface = () => {
  <Row>
    <InputJSX />
    <ShowJSX />
    <Preview />
  </Row>
}

export const Preview = () => {
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