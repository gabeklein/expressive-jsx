import { Path } from '@babel/traverse';
import t, { ArrayExpression, ObjectProperty, Program } from '@babel/types';
import { StylesRegistered, PropertyES } from 'internal';
import { BunchOf } from 'types';

type SelectorContent = ObjectProperty[];
type MediaGroups = SelectorContent[];

export function writeProvideStyleStatement(
    program: Path<Program>,
    style: StylesRegistered[],
    filename: string
){
    const programBody = program.node.body;
    const polyfillModule = t.identifier("Module");
    const output = [];

    const media = <BunchOf<MediaGroups>> {
        default: [] 
    };

    for(const block of style){
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
            PropertyES(selector, t.stringLiteral(styleString))
        )
    }

    for(const query in media){
        const priorityBunches = media[query].map(x => t.objectExpression(x));
        output.push(
            PropertyES(query, t.arrayExpression(priorityBunches))
        )
    }

    const computed = 
        output.length == 1
        ? output[0].value as ArrayExpression
        : t.objectExpression(output)

    const provideStatement = 
        t.expressionStatement(
            t.callExpression(
                t.memberExpression(polyfillModule, t.identifier("doesProvideStyle")), 
                [ computed ]
            )
        )

    programBody.push(provideStatement);
}