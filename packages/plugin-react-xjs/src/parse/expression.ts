import { CallExpression, Expression, MemberExpression, TaggedTemplateExpression } from '@babel/types';

import { ElementInline, inParenthesis, NonComponent, Opts, ParseErrors, Shared } from '../internal';
import { DoExpressive, ListElement, Path } from '../internal/types';

const New = Object.create;
const ERROR = ParseErrors({
    NoParenChildren: "Children in Parenthesis are not allowed, for direct insertion used an Array literal",
    SemicolonRequired: "Due to how parser works, a semicolon is required after the element preceeding escaped children.",
    DoExists: "Do Expression was already declared!",
    PropUnknown: "There is no property inferred from an {1}",
    AssignOnlyIdent: "Prop assignment only works on an identifier to denote name",
    PropNameMember: "Member Expressions can't be prop names",
    BadProp: "Bad Prop! + only works in conjuction with an Identifier, got {1}",
    BadOperator: "Props may only be assigned with `=` or using tagged templates.",
    BadUnary: "{1} is not a recognized operator for props",
    BadExpression: "Expression must start with an identifier",
    BadPrefix: "Improper element prefix"
})

export function ApplyElementExpression(
    subject: Path<Expression>, 
    insertInto: ElementInline ){
        
    if(inParenthesis(subject)){
        insertInto.sequence.push(new NonComponent(subject));
        return;
    }

    let path = subject;
    let props = [] as Path<Expression>[];

    if(path.isSequenceExpression())
        [path, ...props] = path.get('expressions');

    if(path.isBinaryExpression({operator: ">"})){
        const item = New(path.get("right"));
        item.type = "ExpressionLiteral";
        props.push(item);
        path = path.get("left");
    }

    const chain = [] as Path<Expression>[]

    while(path.isBinaryExpression({operator: ">>"})){
        const child = path.get("right")

        if(inParenthesis(child))
            throw ERROR.NoParenChildren(child);

        chain.push(child);
        path = path.get("left");
    }
    chain.push(path);

    for(const segment of chain){
        const child = new ElementInline(insertInto.context);

        parseIdentity(segment, child);

        insertInto.sequence.push(child);
        insertInto = child;
    }    

    parseProps(props, insertInto);
}

export function applyNameImplications(
    name: string, 
    target: ElementInline, 
    head?: true, 
    prefix?: string){

    if(head)
        if(prefix == "html" || /^[A-Z]/.test(name))
            target.tagName = name
        
    // const { context } = target;
    // const modify = context.elementMod(name);
    
    // if(modify && typeof modify.insert == "function"){
    //     modify.insert(this, [], target)

    //     for(const sub of modify.provides){
    //         context.declare(sub)
    //     }
    // }
}

function parseIdentity(
    tag: Path<Expression>,
    target: ElementInline ){

    let prefix: string | undefined;

    if(tag.isBinaryExpression({operator: "-"})){
        const left = tag.get("left") as Path<Expression>;

        if(left.isIdentifier())
            prefix = left.node.name;
        else
            throw ERROR.BadPrefix(left);
        tag = tag.get("right") as any;
    }

    tag = parseLayers(tag, target);

    if(tag.isIdentifier())
        applyNameImplications(tag.node.name, target, true, prefix)

    else if(tag.isStringLiteral() || tag.isTemplateLiteral()){
        applyNameImplications("string", target);
        applyNameImplications(Opts.reactEnv == "native" ? Shared.stack.helpers.Text : "div", target, true)

        target.sequence.push(new NonComponent(tag as Path<Expression>))
        tag.remove();
    }

    else throw ERROR.BadExpression(tag);
}

function parseLayers(
    expression: Path<Expression>,
    target: ElementInline ): Path<Expression> {

    let current = expression;
    while(!inParenthesis(current)) 
        switch(current.type){

        case "TaggedTemplateExpression": {
            const exp = current as Path<TaggedTemplateExpression>;
            target.unhandledQuasi = exp.get("quasi");
            exp.remove();
            current = exp.get("tag");
            break;
        }

        case "CallExpression": {
            const exp = current as Path<CallExpression>;
            parseProps( 
                exp.get("arguments") as Path<ListElement>[],
                target
            );
            current = exp.get("callee");
            break;
        }

        case "MemberExpression": {
            const exp = current as Path<MemberExpression>;
            const selector = exp.get("property") as Path;
            if(exp.node.computed !== true && selector.isIdentifier())
                applyNameImplications(selector.node.name, target);
            else 
                throw ERROR.SemicolonRequired(selector)

            return exp.get("object");
            break;
        }

        default: 
            return current;
    }

    return current;
}

function parseProps(
    props: Path<ListElement>[],
    target: ElementInline ){

    if(!props) return;
    for(let path of props){
        switch(path.type){
            case "DoExpression":
                (path.node as DoExpressive).meta = target;
            break;

            case "TaggedTemplateExpression": {
                // const {tag, quasi} = path.node;
    
                // if(tag.type != "Identifier") 
                //     throw path.buildCodeFrameError("Prop must be an Identifier");
    
                // if(quasi.expressions.length == 0)
                //     value = { node: t.stringLiteral(quasi.quasis[0].value.raw) }
                // else
                //     value = path.get("quasi")//.node;
    
                // name = tag.name
                // //collapsing prevents down-line transformers from adding useless polyfill
                // //replaced instead of removed because value itself must remain in-line to receive legitiment transforms
                // path.replaceWith(value)
    
            } break;

            case "UnaryExpression": {
                // const unary = path as Path<UnaryExpression>;
                // let { operator, argument } = unary.node;

                // const value = unary.get("argument");
                // let name: string;

                // switch(operator){
                //     case "+": 
                //         if(argument.type == "Identifier")
                //             name = argument.name;
                //         else throw ERROR.BadProp(unary, argument.type);
                //     break;

                //     case "~":

                //     break;

                //     default:
                //         throw ERROR.BadUnary(unary, operator)
                // }
            } break;

            case "SpreadElement":

            break;

            case "StringLiteral":
            case "TemplateLiteral":
            case "ExpressionLiteral":
            case "ArrowFunctionExpression": 

            break;

            case "AssignmentExpression": 

            break;

            case "Identifier":

            break;

            default: 
                throw ERROR.PropUnknown(path, path.type);
        }
    }
}