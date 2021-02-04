import { NodePath as Path } from '@babel/traverse';
import { Program as ProgramNode } from '@babel/types';
import { BabelState, DoExpressive, Modifier } from '@expressive/babel-plugin-core';
import { createHash } from 'crypto';
import { ExternalsManager, GenerateES, GenerateJSX, ImportManager, opts, writeProvideStyleStatement } from 'internal';
import { StackFrame } from 'types';

import { RequirementManager } from './scope';

const DEFAULTS = {
  runtime: "@expressive/react",
  pragma: "react"
}

export function createModuleContext(
  path: Path<ProgramNode>,
  state: BabelState<StackFrame>
){
  Object.assign(opts, DEFAULTS, state.opts);

  const { Importer, Generator } = selectContext(opts);

  const I = new Importer(path, opts);
  const M = new Module(path, state, I);
  const G = new Generator(M, I);

  Object.assign(state.context, {
    Generator: G,
    Imports: I,
    Module: M
  })

  if(G.didEnterModule)
    G.didEnterModule();
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

  M.EOF(state.opts);
  I.EOF();
}

function selectContext(opts: any){
  const { output, useRequire, useImport } = opts as any;
  let Generator: typeof GenerateES | typeof GenerateJSX;
  let Importer: typeof ImportManager | typeof RequirementManager;

  switch(output){
    case "jsx":
      Importer = ImportManager
      Generator = GenerateJSX;
    break;

    case "js":
    case undefined:
      Importer = RequirementManager
      Generator = GenerateES;
    break;

    default:
      throw new Error(
        `Unknown output type of ${output}.\nAcceptable ['js', 'jsx'] (default 'js')`
      )
  }

  if(useRequire)
    Importer = RequirementManager;
  if(useImport)
    Importer = ImportManager;

  return { Generator, Importer };
}

export function hash(data: string, length: number = 3){
  return createHash("md5")		
    .update(data)		
    .digest('hex')		
    .substring(0, length)
}

export class Module {
  modifiersDeclared = new Set<Modifier>();
  lastInsertedElement?: Path<DoExpressive>;

  constructor(
    public path: Path<ProgramNode>,
    public state: BabelState,
    public imports: ExternalsManager ){
  }

  get relativeFileName(){
    // return relative(this.state.cwd, this.state.filename);
    return hash(this.state.filename, 10)
  }

  EOF(opts: any){
    const { modifiersDeclared } = this;

    if(modifiersDeclared.size)
      writeProvideStyleStatement(this, opts);
  }
}