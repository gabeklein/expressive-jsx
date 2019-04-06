import { Path } from '@babel/traverse';
import t, { Expression, ModuleSpecifier, Program as ProgramNode, ImportSpecifier } from '@babel/types';
import { ExplicitStyle, DoExpressive } from '@expressive/babel-plugin-core';
import { writeProvideStyleStatement } from 'regenerate/style';
import { findExistingImport, hash as quickHash } from 'helpers';
import { relative } from 'path';
import { BabelVisitor, StackFrameExt, StylesRegistered } from 'types';
import { GenerateJSX } from 'generate/jsx';

export const Program = <BabelVisitor<ProgramNode>> {
    enter(path, state){
        const file = relative(state.cwd, state.filename);
        const M = state.context.Module = new Module(path, file);
        state.context.Generator = new GenerateJSX(M.reactProvides, path.scope);
    },
    exit(path, state){
        state.context.Module.checkout();
    }
}    

export class Module {

    styleBlocks = [] as StylesRegistered[];
    reactProvides: ModuleSpecifier[];
    lastInsertedElement?: Path<DoExpressive>;
    reactImportExists?: true;

    constructor(
        public path: Path<ProgramNode>,
        public file: string ){

        this.reactProvides = this.getReact();
    };

    checkout(){
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