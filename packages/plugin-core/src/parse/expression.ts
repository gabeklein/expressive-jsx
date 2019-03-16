import t, {
    AssignmentExpression,
    CallExpression,
    Expression,
    FunctionExpression,
    Identifier,
    MemberExpression,
    ObjectExpression,
    SpreadElement,
    TaggedTemplateExpression,
} from '@babel/types';

import { ElementInline, Exceptions, inParenthesis, NonComponent, Opts, Shared, preventDefaultPolyfill } from 'internal';
import { Prop, SpreadItem } from 'handle/item';
import { DoExpressive, ListElement, Path } from 'types';

const New = Object.create;
const Error = Exceptions({
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
    BadPrefix: "Improper element prefix",
    BadObjectKeyValue: "Object based props must have a value. Got {1}"
})

export function ApplyElementExpression(
    subject: Path<Expression>, 
    insertInto: ElementInline ){
        
    if(inParenthesis(subject)){
        insertInto.add(new NonComponent(subject));
        return;
    }

    let path = subject;
    let baseAttributes = [] as Path<Expression>[];

    if(path.isSequenceExpression())
        [path, ...baseAttributes] = path.get('expressions');

    if(path.isBinaryExpression({operator: ">"})){
        const item = New(path.get("right"));
        item.type = "ExpressionLiteral";
        baseAttributes.push(item);
        path = path.get("left");
    }

    const chain = [] as Path<Expression>[]

    while(path.isBinaryExpression({operator: ">>"})){
        const child = path.get("right")

        if(inParenthesis(child))
            throw Error.NoParenChildren(child);

        chain.push(child);
        path = path.get("left");
    }
    chain.push(path);

    for(const segment of chain){
        const child = new ElementInline(insertInto.context);

        parseIdentity(segment, child);

        insertInto.add(child);
        insertInto = child;
    }    

    parseProps(baseAttributes, insertInto);
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
            throw Error.BadPrefix(left);
        tag = tag.get("right") as any;
    }

    tag = parseLayers(tag, target);

    if(tag.isIdentifier())
        applyNameImplications(tag.node.name, target, true, prefix)

    else if(tag.isStringLiteral() || tag.isTemplateLiteral()){
        applyNameImplications("string", target);
        applyNameImplications(Opts.reactEnv == "native" ? Shared.stack.helpers.Text : "span", target, true)

        target.add(new NonComponent(tag as Path<Expression>))
        preventDefaultPolyfill(tag);
    }

    else throw Error.BadExpression(tag);
}

const containingLineBreak = /\n/;

function parseLayers(
    expression: Path<Expression>,
    target: ElementInline ): Path<Expression> {

    let current = expression;
    while(!inParenthesis(current)) 
        switch(current.type){

        case "TaggedTemplateExpression": {
            const exp = current as Path<TaggedTemplateExpression>;
            const quasi = exp.get("quasi");
            let deferred = false;

            for(const element of quasi.node.quasis)
                if(containingLineBreak.test(element.value.cooked)){
                    target.multilineContent = quasi;
                    deferred = true;
                }

            if(!deferred){
                let content: Expression = quasi.node;

                if(content.expressions.length == 0){
                    const text = content.quasis[0].value.cooked;
                    content = t.stringLiteral(text);
                }

                target.add(
                    new NonComponent(content)
                )
            }

            current = exp.get("tag");
            preventDefaultPolyfill(exp);
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
                throw Error.SemicolonRequired(selector)

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

            case "StringLiteral":
            case "TemplateLiteral":
            case "ExpressionLiteral":
            case "ArrowFunctionExpression": 
                target.add(new NonComponent(path as Path<Expression>))
            break;

            case "TaggedTemplateExpression": {
                const {tag, quasi} = path.node as TaggedTemplateExpression;
    
                if(tag.type != "Identifier") 
                    throw path.buildCodeFrameError("Prop must be an Identifier");
    
                target.add(
                    new Prop(
                        tag.name,
                        quasi.expressions.length == 0
                        ? t.stringLiteral(quasi.quasis[0].value.raw)
                        : quasi
                    )
                )
                
                preventDefaultPolyfill(path);
            } break;

            case "AssignmentExpression": {
                const assign = path as Path<AssignmentExpression>;
                const name = assign.get("left");
                const value = assign.get("right");

                if(!name.isIdentifier())
                    throw Error.AssignOnlyIdent(name);

                target.add(new Prop(name.node.name, value.node));
            } break;

            case "Identifier": {
                const { name } = path.node as Identifier;
                target.add(new Prop(name, t.stringLiteral("true")));

            } break;

            case "SpreadElement":
                target.add(new SpreadItem("props", (<SpreadElement>path.node).argument));
            break;

            case "ObjectExpression": 
                const properties = (path as Path<ObjectExpression>).get("properties");

                for(const property of properties){
                    let insert: Prop | SpreadItem;
                    
                    if(property.isObjectProperty()){
                        const key = property.node.key;
                        const value = property.get("value")
                        const name: string = key.value || key.name;

                        if(!value.isExpression())
                            throw Error.BadObjectKeyValue(value, value.type);

                        insert = new Prop(name, value.node)
                    }
                    
                    else if(property.isSpreadElement()){
                        insert = new SpreadItem("props", property.node.argument);
                        preventDefaultPolyfill(property);
                    } 
                    
                    else if(property.isObjectMethod()){
                        const node = property.node;
                        const func = Object.assign(
                            { id: null, type: "FunctionExpression" }, 
                            node as any
                        );
                        insert = new Prop(node.key, func as FunctionExpression)
                    }

                    target.add(insert!)
                }
            break;

            case "UnaryExpression": {
                // const unary = path as Path<UnaryExpression>;
                // let { operator, argument } = unary.node;

                // const value = unary.get("argument");
                // let name: string;

                // switch(operator){
                //     case "+": 
                //         if(argument.type == "Identifier")
                //             name = argument.name;
                //         else throw Error.BadProp(unary, argument.type);
                //     break;

                //     case "~":

                //     break;

                //     default:
                //         throw Error.BadUnary(unary, operator)
                // }
            } break;

            default: 
                throw Error.PropUnknown(path, path.type);
        }
    }
}