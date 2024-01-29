import { NodePath, Node } from '@babel/traverse';

import type { t } from './';

type FlatValue = string | number | boolean | null;

type ParseError = <T extends t.Node>(node: NodePath<T> | T, ...args: FlatValue[]) => Error;

export interface BabelFile extends File {
  buildCodeFrameError<TError extends Error>(
    node: Node,
    msg: string,
    Error?: new (msg: string) => TError
  ): TError;
}

export const Status = {
  currentFile: undefined as unknown as BabelFile
}

export function ParseErrors<O extends Record<string, string>> (register: O) {
  const Errors = {} as Record<string, ParseError>

  for(const error in register){
    const message = [] as FlatValue[];

    for(const segment of register[error].split(/\{(?=\d+\})/)){
      const ammend = /(\d+)\}(.*)/.exec(segment);
      if(ammend)
        message.push(parseInt(ammend[1]), ammend[2]);
      else
        message.push(segment);
    }

    Errors[error] = (node, ...args) => {
      let quote = "";

      if("node" in node)
        node = node.node;

      for(const slice of message)
        quote += typeof slice == "string"
          ? slice
          : args[slice as number - 1]

      return Status.currentFile.buildCodeFrameError(node, quote);
    }
  }

  return Errors as {
    readonly [P in keyof O]: ParseError
  };
}