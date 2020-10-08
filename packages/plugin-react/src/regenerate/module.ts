import { NodePath as Path } from '@babel/traverse';
import { Program as ProgramNode } from '@babel/types';
import { BabelState, DoExpressive, Modifier } from '@expressive/babel-plugin-core';
import { createHash } from 'crypto';
import { ExternalsManager, GenerateES, GenerateJSX, ImportManager, writeProvideStyleStatement } from 'internal';
import { Visitor } from 'types';
import { opts } from 'internal';

import { RequirementManager } from './scope';

export const Program = <Visitor<ProgramNode>> {
  enter(path, state){
    let Generator;
    let Importer;

    const { context } = state;
    Object.assign(
      opts,
      {
        runtime: "@expressive/react",
        pragma: "react"
      },
      state.opts
    )

    const { output, useRequire, useImport } = opts as any;

    if(output == "jsx"){
      Importer = ImportManager
      Generator = GenerateJSX;
    }
    else if(output == "js" || !output){
      Importer = RequirementManager
      Generator = GenerateES;
    }
    else 
      throw new Error(
        `Unknown output type of ${output}.\nAcceptable ['js', 'jsx'] (default 'js')`)

    if(useRequire)
      Importer = RequirementManager
    if(useImport)
      Importer = ImportManager

    const I = context.Imports = new Importer(path, opts);
    const M = context.Module = new Module(path, state, I);
    const G = context.Generator = new Generator(M, I);

    if(G.didEnterModule) 
      G.didEnterModule();
  },
  exit(path, state){
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
}    

export function hash(data: string, length: number = 3){
  return createHash("md5")		
    .update(data)		
    .digest('hex')		     
    .substring(0, length)
}

export class Module {

  modifiersDeclared = new Set<Modifier>()
  lastInsertedElement?: Path<DoExpressive>;

  constructor(
    public path: Path<ProgramNode>,
    public state: BabelState,
    public imports: ExternalsManager ){
  };

  get relativeFileName(){
    // return relative(this.state.cwd, this.state.filename);
    return hash(this.state.filename, 10)
  }

  EOF(opts: any){
    const { modifiersDeclared } = this;

    if(modifiersDeclared.size)
      writeProvideStyleStatement.call(this, opts);
  }
}