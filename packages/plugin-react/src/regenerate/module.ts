import { Path } from '@babel/traverse';
import t, { Expression, ModuleSpecifier, Program as ProgramNode, ImportSpecifier } from '@babel/types';
import { ExplicitStyle, DoExpressive } from '@expressive/babel-plugin-core';
import { findExistingImport, hash as quickHash } from 'helpers';
import { relative } from 'path';
import { GenerateES, GenerateJSX, writeProvideStyleStatement } from 'internal';
import { BabelVisitor, StackFrameExt, StylesRegistered, BabelState } from 'types';

export const Program = <BabelVisitor<ProgramNode>> {
    enter(path, state){

        let Generator;
        const { output } = state.opts;
    
        if(output == "jsx")
            Generator = GenerateJSX;
        else if(output == "js" || !output)
            Generator = GenerateES;
        else 
            throw new Error(
                `Unknown output type of ${output}.\nAcceptable ['js', 'jsx'] (default 'js')`)

        const M = state.context.Module = new Module(path, state);
        const G = state.context.Generator = new Generator(M.reactProvides, path.scope);

        if(G.didEnterModule) G.didEnterModule(M);

    },
    exit(path, state){
        const { Generator: G, Module: M } = state.context;
        if(G.willExitModule) G.willExitModule(M);
        state.context.Module.exit();
    }
}    

export class Module {

    styleBlocks = [] as StylesRegistered[];
    reactProvides: ModuleSpecifier[];
    lastInsertedElement?: Path<DoExpressive>;
    reactImportExists?: true;

    constructor(
        public path: Path<ProgramNode>,
        public state: BabelState ){

        this.reactProvides = this.getReact();
    };

    get relativeFileName(){
        return relative(this.state.cwd, this.state.filename);
    }

    exit(){
        const { styleBlocks } = this;

        if(styleBlocks.length)
            writeProvideStyleStatement(this);

        if(this.lastInsertedElement 
        && !this.reactImportExists)
            this.path.node.body.unshift(
                t.importDeclaration(
                    this.reactProvides as ImportSpecifier[], 
                    t.stringLiteral("react")
                )
            )
    }

    getReact(){
        let reactImport = findExistingImport(
            this.path.node.body, "react"
        );

        if(reactImport){
            this.reactImportExists = true;
            return reactImport.specifiers;
        }
        else return [];
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

// for(let name of reactRequires){
//     const ident = helpers[name]; 
//     if(!specifiers.find(
//         (spec: ModuleSpecifier) => 
//             spec.type == "ImportSpecifier" && spec.local.name == ident.name
//     ))
//         specifiers.push(
//             t.importSpecifier(ident, ident)
//         )
// }