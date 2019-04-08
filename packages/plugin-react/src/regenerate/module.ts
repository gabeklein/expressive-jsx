import t, {
    Expression,
    Identifier,
    ImportDefaultSpecifier,
    ImportNamespaceSpecifier,
    ImportSpecifier,
    ObjectPattern,
    Program as ProgramNode,
} from '@babel/types';
import { DoExpressive, ExplicitStyle } from '@expressive/babel-plugin-core';
import { ensureSpecifier, findExistingImport, hash as quickHash } from 'helpers';
import { GenerateES, GenerateJSX } from 'internal';
import { relative } from 'path';
import { BabelState, BabelVisitor, StackFrameExt, StylesRegistered, Path } from 'types';
import { writeProvideStyleStatement } from './style';

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
        const G = state.context.Generator = new Generator(M);

        if(G.didEnterModule) G.didEnterModule();
    },
    exit(path, state){
        const { Generator: G } = state.context;
        if(G.willExitModule) G.willExitModule();
        state.context.Module.exit();
    }
}    

export class Module {

    styleBlocks = [] as StylesRegistered[];
    lastInsertedElement?: Path<DoExpressive>;
    reactImports?: (ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier)[];
    reactRequire?: ObjectPattern | Identifier;
    reactIndex?: number;

    constructor(
        public path: Path<ProgramNode>,
        public state: BabelState ){
    };

    get relativeFileName(){
        return relative(this.state.cwd, this.state.filename);
    }

    exit(){
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

    public getReactImport(){
        let reactImport = findExistingImport(
            this.path.node.body, "react"
        );

        if(reactImport){
            this.reactIndex = 0;
            return this.reactImports = reactImport.specifiers;
        }
        else return this.reactImports = [];
    }

    public putReactImport(){
        if(this.reactIndex === undefined
        && this.lastInsertedElement)
            this.path.node.body.unshift(
                t.importDeclaration(
                    this.reactImports as ImportSpecifier[], 
                    t.stringLiteral("react")
                )
            )
    }

    public getFragmentImport<T>(
        type: (name: string) => T
    ): T {
        const uid = ensureSpecifier(
            this.reactImports!,
            this.path.scope,
            "Fragment"
        )

        return type(uid);
    }

    public getCreateImport(){
        const uid = ensureSpecifier(
            this.reactImports!,
            this.path.scope,
            "createElement",
            "create"
        )

        const Create = t.identifier(uid);
        Object.defineProperty(this, "Create", { configurable: true, value: Create })
        return Create;
    }
}