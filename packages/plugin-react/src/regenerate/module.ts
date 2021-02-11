import { NodePath as Path } from '@babel/traverse';
import { Program } from '@babel/types';
import { Status } from 'errors';
import { handleTopLevelModifier } from 'modifier';
import { printStyles } from 'modifier';
import { StackFrame } from 'parse';
import { GenerateES, GenerateJSX, ImportManager, RequireManager } from 'regenerate';
import { BabelFile, BabelState, Options } from 'types';

export function createModuleContext(
  path: Path<Program>,
  state: BabelState<StackFrame>
){
  const context = state.context = StackFrame.init(state);
  const { Importer, Generator } = selectContext(context.opts);

  Status.currentFile = state.file as BabelFile;

  const I =
    context.Imports = new Importer(path, context.opts);

  context.Generator = new Generator(I);

  for(const item of path.get("body"))
    if(item.isLabeledStatement()){
      handleTopLevelModifier(item.node, context);
      item.remove();
    }
}

export function closeModuleContext(
  path: Path<Program>,
  state: BabelState<StackFrame>){

  const { Imports } = state.context;
  const styleBlock = printStyles(state);

  if(styleBlock)
    path.pushContainer("body", [ styleBlock ]);

  Imports.EOF();
}

function selectContext(opts: Options){
  const { output, useRequire, useImport } = opts;
  let Generator: typeof GenerateES | typeof GenerateJSX;
  let Importer: typeof ImportManager | typeof RequireManager;

  switch(output){
    case "jsx":
      Importer = ImportManager
      Generator = GenerateJSX;
    break;

    case "js":
      Importer = RequireManager
      Generator = GenerateES;
    break;

    default:
      throw new Error(
        `Unknown output type of ${output}.\nAcceptable ['js', 'jsx'] (default 'js')`
      )
  }

  if(useRequire)
    Importer = RequireManager;
  if(useImport)
    Importer = ImportManager;

  return { Generator, Importer };
}