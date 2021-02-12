import { NodePath as Path } from '@babel/traverse';
import { Program } from '@babel/types';
import { Status } from 'errors';
import { handleTopLevelModifier } from 'modifier';
import { printStyles } from 'modifier';
import { StackFrame } from 'context';
import { ImportManager, RequireManager } from 'regenerate';
import { BabelFile, BabelState } from 'types';
import { GenerateReact } from './element';

export function createModuleContext(
  path: Path<Program>,
  state: BabelState<StackFrame>
){
  const context = state.context = StackFrame.init(state);
  const { opts } = context;

  const Importer =
    opts.useRequire || opts.output == "js"
      ? RequireManager
      : ImportManager;

  Status.currentFile = state.file as BabelFile;

  context.Imports = new Importer(path, opts);
  context.Generator = new GenerateReact(context);

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