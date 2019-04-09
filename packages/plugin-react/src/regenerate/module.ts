import { Expression, Program as ProgramNode } from '@babel/types';
import { DoExpressive, ExplicitStyle } from '@expressive/babel-plugin-core';
import { hash as quickHash } from 'helpers';
import { GenerateES, GenerateJSX } from 'internal';
import { relative } from 'path';
import { BabelState, BabelVisitor, Path, StackFrameExt, StylesRegistered } from 'types';
import { ImportManager, ExternalsManager } from './imports';
import { writeProvideStyleStatement } from './style';

export const Program = <BabelVisitor<ProgramNode>> {
    enter(path, state){
        let Generator;
        const { context } = state;
        const { output } = state.opts;

        if(output == "jsx")
            Generator = GenerateJSX;
        else if(output == "js" || !output)
            Generator = GenerateES;
        else 
            throw new Error(
                `Unknown output type of ${output}.\nAcceptable ['js', 'jsx'] (default 'js')`)

        const I = context.Imports = new ImportManager(path);
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
        const { styleBlocks } = this;

        if(styleBlocks.length)
            writeProvideStyleStatement.call(this);
    }

    registerStyle(
        context: StackFrameExt,
        styles: ExplicitStyle[],
        priority?: number,
        query?: string
    ): string | Expression {
        const { styleBlocks } = this;
        const block = styles as StylesRegistered;
        const name = context.current.name;
        const hash = quickHash(context.loc)

        let className = name + "_" + hash;
        
        block.selector = className;
        block.priority = priority;
        block.query = query;

        styleBlocks.push(block);

        return className;
    }
}