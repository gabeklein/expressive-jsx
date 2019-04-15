import { Program as ProgramNode } from '@babel/types';
import { BabelState, DoExpressive, Modifier } from '@expressive/babel-plugin-core';
import { ExternalsManager, GenerateES, GenerateJSX, ImportManager, writeProvideStyleStatement } from 'internal';
import { relative } from 'path';
import { Path, StylesRegistered, Visitor } from 'types';
import { RequirementManager } from './scope';

export const Program = <Visitor<ProgramNode>> {
    enter(path, state){
        let Generator;
        let Importer;

        const { context } = state;
        const { output, useRequire, useImport } = state.opts;

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

        const I = context.Imports = new Importer(path);
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

        M.EOF();
        I.EOF();
    }
}    

export class Module {

    modifiersDeclared = new Set<Modifier>()
    styleBlocks = [] as StylesRegistered[];
    lastInsertedElement?: Path<DoExpressive>;

    constructor(
        public path: Path<ProgramNode>,
        public state: BabelState,
        public imports: ExternalsManager ){
    };

    get relativeFileName(){
        return relative(this.state.cwd, this.state.filename);
    }

    EOF(){
        const { modifiersDeclared } = this;

        if(modifiersDeclared.size)
            writeProvideStyleStatement.call(this);
    }
}