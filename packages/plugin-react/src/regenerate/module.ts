import { Path } from '@babel/traverse';
import t, { Expression, ModuleSpecifier, Program as ProgramNode, Statement } from '@babel/types';
import { ExplicitStyle } from '@expressive/babel-plugin-core';
import { writeProvideStyleStatement } from 'generate/style';
import { ensureUIDIdentifier } from 'helpers';
import { relative } from 'path';
import { BabelVisitor, StackFrameExt, StylesRegistered, BunchOf } from 'types';
import { GenerateJSX } from 'generate/jsx';

export const Program = <BabelVisitor<ProgramNode>> {
    enter(path, state){
        const file = relative(state.cwd, state.filename);
        const M = state.context.Module = new Module(path, file);
        const G = state.context.Generator = new GenerateJSX();

        const Fragment = 
            ensureUIDIdentifier.call(path.scope, "Fragment");
        
        G.Fragment = t.jsxIdentifier(Fragment);

        M.reactProvides.push(
            t.importSpecifier(t.identifier(Fragment), t.identifier("Fragment"))
        )
    },
    exit(path, state){
        state.context.Module.checkout();
    }
}    

export class Module {

    blocksByName = {} as BunchOf<StylesRegistered>
    styleBlocks = [] as StylesRegistered[];
    reactProvides: ModuleSpecifier[];

    constructor(
        private path: Path<ProgramNode>,
        private file: string ){

        this.reactProvides = this.insertReact();
    };

    checkout(){
        const { styleBlocks, file, path } = this;

        if(styleBlocks.length)
            writeProvideStyleStatement(path, styleBlocks, file);
    }

    insertReact(){
        const body = this.path.node.body;
        let reactImport = FindExistingImport(body, "react");
        let specifiers = this.reactProvides = reactImport ? reactImport.specifiers : [];
    
        if(!reactImport){
            reactImport = t.importDeclaration(specifiers, t.stringLiteral("react"));
            body.unshift(reactImport);
        }
        
        let [ defaultSpec ] = specifiers;
        if(!t.isImportDefaultSpecifier(defaultSpec)){
            defaultSpec = t.importDefaultSpecifier(t.identifier("React"));
            specifiers.unshift(defaultSpec);
        }

        return specifiers;
    }

    registerStyle(
        context: StackFrameExt,
        styles: ExplicitStyle[],
        priority?: number,
        query?: string
    ): string | Expression {
        const { blocksByName, styleBlocks } = this;
        const block = styles as StylesRegistered;
        const name = context.current.name;

        let className = name;
        let increment = 2;

        while(true)
            if(className in blocksByName == false)
                break;
            else
                className = name + increment++;
        
        block.selector = className;
        block.priority = priority;
        block.query = query;

        styleBlocks.push(block);
        blocksByName[className] = block;

        return className;
    }
}

function FindExistingImport(body: Statement[], MODULE: string){
    for(const statement of body){
        if(statement.type == "ImportDeclaration" 
        && statement.source.value == MODULE)
            return statement
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