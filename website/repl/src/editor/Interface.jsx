import { Row } from 'common/layout/Layout';
import { Fragment } from 'react';

import { InputEditor, OutputJSX } from './Editors';
import { Preview } from './Preview';

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