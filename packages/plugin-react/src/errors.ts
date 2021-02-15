import type { NodePath } from '@babel/traverse';
import type { Node } from '@babel/types';
import type { BabelFile, BunchOf, FlatValue } from 'types';

type ParseError = <T extends Node>(node: NodePath<T> | T, ...args: FlatValue[]) => Error;

export const Status = {
  currentFile: undefined as unknown as BabelFile
}

export function ParseErrors<O extends BunchOf<string>> (register: O) {
  const Errors = {} as BunchOf<ParseError>

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
        quote += (
          typeof slice == "string"
            ? slice : args[slice as number - 1]
        )

      return Status.currentFile.buildCodeFrameError(node, quote);
    }
  }

  return Errors as {
    readonly [P in keyof O]: ParseError
  };
}