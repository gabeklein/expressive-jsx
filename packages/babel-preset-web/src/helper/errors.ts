import * as t from '../types';

type FlatValue = string | number | boolean | null;
type ParseError = <T extends t.Node>(node: t.NodePath<T> | T, ...args: FlatValue[]) => Error;

export interface BabelFile extends File {
  buildCodeFrameError<TError extends Error>(
    node: t.Node,
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

export function parseError(path: t.NodePath, err: unknown, modiferName: string){
  if(!(err instanceof Error))
    return path.hub.buildError(path.node, `Modifier "${modiferName}" failed: ${err}`);

  const stack = err.stack!.split("\n    at ");
  const message = err instanceof Error ? err.message : err;
  const error = path.hub.buildError(path.node, `Modifier "${modiferName}" failed: ${message}`);

  error.stack = stack.slice(0, stack.findIndex(line => /^parse/.test(line)) + 1).join("\n    at ");
  
  return error;
}