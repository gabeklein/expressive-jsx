import { NodePath } from '@babel/traverse';
import { Node } from '@babel/types';
import { Shared } from 'shared';
import { BunchOf, FlatValue } from 'types';

type ParseError = <T extends Node>(node: NodePath<T> | T, ...args: FlatValue[]) => Error;

export function ParseErrors<O extends BunchOf<string>> (register: O) {
  const Errors = {} as BunchOf<ParseError>

  for(const error in register){
    let message = [] as FlatValue[];

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

      return Shared.currentFile.buildCodeFrameError(node, quote);
    }
  }

  return Errors as {
    readonly [P in keyof O]: ParseError
  };
}