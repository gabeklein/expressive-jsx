import { Path } from '@babel/traverse';
import t, { Expression, ObjectProperty, Program, ArrayExpression } from '@babel/types';
import { ExplicitStyle } from '@expressive/babel-plugin-core';
import { createHash } from 'crypto';
import { BabelVisitor, StackFrameExt } from 'internal';
import { relative } from 'path';
import { BunchOf, PropertyES6 } from 'syntax';

function Hash(data: string, length?: number){
    return (
        createHash("md5")
        .update(data)
        .digest('hex')
        .substring(0, 6)
    )
}

const VisitProgram = <BabelVisitor<Program>> {
    enter(_path, state){
        state.context.Module = new ModuleInsertions();
    },
    exit(path, state){
        const file = relative(state.cwd, state.filename);
        state.context.Module.insert(path, file);
    }
}     

interface StylesRegistered
    extends Array<ExplicitStyle> {

    selector: string;
    query?: string;
    priority?: number;
}

export class ModuleInsertions {

    styleBlocks = [] as StylesRegistered[];

    insert(path: Path<Program>, filename: string){
        const style = this.styleBlocks;

        if(style.length){
            writeProvideStyleStatement(path, style, filename);
        }
    }

    registerStyle(
        context: StackFrameExt,
        styles: ExplicitStyle[],
        priority?: number,
        query?: string
    ): string | Expression {
        const block = styles as StylesRegistered;
        
        const name = context.current.name;
        const hash = Hash(context.loc);
        const className = `${name}-${hash}`;

        block.selector = className;
        block.priority = priority;
        block.query = query;

        this.styleBlocks.push(block);

        return className;
    }
}

function writeProvideStyleStatement(
    program: Path<Program>,
    style: StylesRegistered[],
    filename: string
){
    const programBody = program.node.body;
    const polyfillModule = t.identifier("Module");

    const provideStatement = 
        t.expressionStatement(
            t.callExpression(
                t.memberExpression(
                    polyfillModule, 
                    t.identifier("doesProvideStyle")
                ), [
                    generateComputedStylesExport(style)
                ]
            )
        )

    programBody.push(provideStatement);
}

function generateComputedStylesExport(compute: StylesRegistered[]){
    type SelectorContent = ObjectProperty[];
    type MediaGroups = SelectorContent[];

    const media = <BunchOf<MediaGroups>> {
        default: [] 
    };

    for(const block of compute){
        const { priority = 0, query, selector } = block;

        let targetQuery: MediaGroups =
            query === undefined ?
                media.default :
            query in media ?
                media[query] :
                media[query] = [];
        
        let targetPriority: SelectorContent = 
            priority in targetQuery ?
                targetQuery[priority] :
                targetQuery[priority] = [];
                
        const styleString = 
            block.map(style => `${style.name}: ${style.value}`).join("; ")
        
        targetPriority.push(
            PropertyES6(selector, t.stringLiteral(styleString))
        )
    }

    const output = [];

    for(const query in media){
        const priorityBunches = media[query].map(x => t.objectExpression(x));
        output.push(
            PropertyES6(query, t.arrayExpression(priorityBunches))
        )
    }

    if(output.length == 1)
        return output[0].value as ArrayExpression;

    return t.objectExpression(output)
}

export { VisitProgram as Program }