import { NodePath as Path } from '@babel/traverse';
import { callExpression, Expression, expressionStatement, Program, stringLiteral } from '@babel/types';
import { handleTopLevelModifier, StackFrame } from 'parse';
import { GenerateES, GenerateJSX, generateStyleBlock, ImportManager, RequireManager } from 'regenerate';
import { hash, Shared } from 'shared';
import { _get, _template } from 'syntax';
import { BabelFile, BabelState } from 'types';

export function createModuleContext(
  path: Path<Program>,
  state: BabelState<StackFrame>
){
  const context = state.context = StackFrame.init(state);
  const { Importer, Generator } = selectContext();

  Object.assign(Shared.opts, state.opts);
  Shared.currentFile = state.file as BabelFile;

  const I = new Importer(path);
  const G = new Generator(I);

  Object.assign(context, {
    Generator: G,
    Imports: I
  });

  for(const item of path.get("body"))
    if(item.isLabeledStatement()){
      handleTopLevelModifier(item.node, context);
      item.remove();
    }
}

export function closeModuleContext(
  path: Path<Program>,
  state: BabelState<StackFrame>){

  const {
    Generator: G,
    Imports: I,
    modifiersDeclared: modifiers
  } = state.context;

  const styles = generateStyleBlock(modifiers, true);

  if(styles){
    const fileId = state.opts.hot !== false && hash(state.filename, 10);
    const _runtime = I.ensure("$runtime", "default", "Styles");
    const args: Expression[] = [ _template(styles) ];
  
    if(fileId)
      args.push(stringLiteral(fileId));

    path.pushContainer("body", [
      expressionStatement(
        callExpression(
          _get(_runtime, "include"), args
        )
      )
    ]);
  }

  G.EOF();
  I.EOF();
}

function selectContext(){
  const { output, useRequire, useImport } = Shared.opts;
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