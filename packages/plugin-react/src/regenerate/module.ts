import { NodePath as Path } from '@babel/traverse';
import { Program as ProgramNode } from '@babel/types';
import { GenerateES, GenerateJSX } from 'generate';
import { Modifier } from 'handle';
import { StackFrame } from 'parse';
import { ExternalsManager, ImportManager, RequireManager, writeProvideStyleStatement } from 'regenerate';
import { hash, Shared } from 'shared';
import { BabelState, DoExpressive } from 'types';

export function createModuleContext(
  path: Path<ProgramNode>,
  state: BabelState<StackFrame>
){
  Object.assign(Shared.opts, state.opts);

  const { Importer, Generator } = selectContext();

  const I = new Importer(path);
  const M = new Module(path, state, I);
  const G = new Generator(M, I);

  Object.assign(state.context, {
    Generator: G,
    Imports: I,
    Module: M
  })
}

export function closeModuleContext(
  state: BabelState<StackFrame>){

  const {
    Generator: G,
    Imports: I,
    Module: M
  } = state.context;

  if(G.willExitModule)
    G.willExitModule();

  M.EOF();
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

export class Module {
  modifiersDeclared = new Set<Modifier>();
  lastInsertedElement?: Path<DoExpressive>;

  constructor(
    public path: Path<ProgramNode>,
    public state: BabelState,
    public imports: ExternalsManager){
  }

  get relativeFileName(){
    // return relative(this.state.cwd, this.state.filename);
    return hash(this.state.filename, 10)
  }

  EOF(){
    if(this.modifiersDeclared.size)
      writeProvideStyleStatement(this, Shared.opts);
  }
}