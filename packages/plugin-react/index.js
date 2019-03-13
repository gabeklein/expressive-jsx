'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var Visitor = require('@expressive/babel-plugin-core');
var Visitor__default = _interopDefault(Visitor);
var t = _interopDefault(require('@babel/types'));

class ArrayStack extends Array {
    insert(x) {
        if (Array.isArray(this.top))
            this.top.push(x);
        else {
            this.top = [x];
            super.push(this.top);
        }
    }
    push(x) {
        this.top = x;
        return super.push(x);
    }
}
class AttributeStack extends ArrayStack {
    constructor(previous) {
        super();
        this.static = [];
        if (previous)
            previous.doesReoccur = true;
    }
    insert(item) {
        if (item instanceof Visitor.SpreadItem) {
            this.top = item;
            this.push(item);
            if (item.orderInsensitive)
                return true;
        }
        else if (item.value && this.length < 2
            || this.top.orderInsensitive) {
            this.static.push(item);
            return true;
        }
        else
            super.insert(item);
        return false;
    }
}
//# sourceMappingURL=element.js.map

function createElement(tag, props = [], children = []) {
    const type = t.jsxIdentifier(tag);
    return (t.jsxElement(t.jsxOpeningElement(type, props), t.jsxClosingElement(type), children, children.length > 0));
}
function createFragment(children = []) {
    return (t.jsxFragment(t.jsxOpeningFragment(), t.jsxClosingFragment(), children));
}
// export function createElement(
//     type: string | StringLiteral | Identifier, 
//     props: Expression = t.objectExpression([]), 
//     ...children: Expression[] ){
//     if(Opts.output == "JSX")
//         return jsx.createElement(type, props, ...children);
//     if(typeof type == "string") 
//         type = t.stringLiteral(type);
//     const CREATE_ELEMENT = Shared.stack.helpers.createElement;
//     return t.callExpression(CREATE_ELEMENT, [type, props, ...children])
// }
// export function createFragment(
//     elements: any[], 
//     props = [] as ObjectProperty[] ){
//     if(Opts.output == "JSX")
//         return jsx.createFragment(elements, props);
//     let type = Shared.stack.helpers.Fragment;
//     if(elements.length == 1)
//         return this.applyProp(
//             elements[0],
//             props
//         )
//     return this.createElement(
//         type, t.objectExpression([]), ...elements
//     )
// }
// export function applyProp(element: any, props: any){
//     if(Opts.output == "JSX"){
//         props = props.map(convertObjectProps);
//         element.openingElement.attributes.push(...props)
//     }
//     else {
//         element.arguments[1].properties.push(...props)
//     }
//     return element;
// }
// export function element(){
//     return {
//         inlineType: "child",
//         transform: (type: string) => ({
//             product: this.createElement(type)
//         })
//     }
// }
//# sourceMappingURL=syntax.js.map

class SwitchJSX {
    constructor(source) {
        this.source = source;
        this.context = source.parent.context;
    }
    ;
    apply(parent) {
        parent.children.push(t.jsxExpressionContainer(this.inline()));
    }
    inline() {
        const { children } = this.source;
        if (children.length > 1)
            return children.reduceRight(this.inlineReduction.bind(this), t.booleanLiteral(false));
        else {
            let { test, product } = this.extract(children[0]);
            let check = test;
            if (check.type == "LogicalExpression")
                check = check.right;
            if (check.type != "BooleanLiteral"
                && check.type != "BinaryExpression")
                check = t.unaryExpression("!", t.unaryExpression("!", check));
            return t.logicalExpression("&&", check, product);
        }
    }
    inlineReduction(alternate, current) {
        const { test, product } = this.extract(current);
        return test
            ? t.conditionalExpression(test, product, alternate)
            : product;
    }
    extract(item) {
        const { test } = item;
        const product = new ContainerJSX(item).toElement();
        return {
            test: test && test.node,
            product
        };
    }
}
class ElementJSX extends Visitor.AssembleElement {
    constructor(source) {
        super(source);
        this.children = [];
        this.props = [];
        this.style = new AttributeStack();
        this.statements = [];
        this.parse();
    }
    toElement() {
        const { props, children } = this;
        const { tagName = "div" } = this.source;
        return createElement(tagName, props, children);
    }
    Content(item) {
        this.children.push(item instanceof Visitor.ElementInline ?
            new ElementJSX(item).toElement() :
            item.node.type == "StringLiteral" ?
                t.jsxText(item.node.value) :
                t.jsxExpressionContainer(item.node));
    }
    Switch(item) {
        this.children.push(t.jsxExpressionContainer(new SwitchJSX(item).inline()));
    }
    Iterate(item) {
        this.children.push(createElement("foo-bar-loop"));
    }
    Props(item) {
        const { name, value } = item;
        let attribute;
        if (item instanceof Visitor.SpreadItem) {
            attribute = t.jsxSpreadAttribute(item.node);
        }
        else if (/^[a-zA-Z_][\w-]+$/.test(name)) {
            attribute = t.jsxAttribute(t.jsxIdentifier(name), typeof value == "string"
                ? t.stringLiteral(value)
                : t.jsxExpressionContainer(item.syntax));
        }
        else
            throw new Error(`Illegal characters in prop named ${name}`);
        this.props.push(attribute);
    }
    Style(item) {
        // this.style.insert(item);
    }
    Statement(item) {
    }
}
class ContainerJSX extends ElementJSX {
    replace(path) {
        path.replaceWith(this.toElement());
    }
    toElement() {
        const { props, children } = this;
        const tagName = this.source.tagName || "div";
        if (props.length == 0) {
            const [child, next] = children;
            if (!next && t.isJSXElement(child))
                return child;
            else
                return createFragment(children);
        }
        return createElement(tagName, props, children);
    }
}
//# sourceMappingURL=jsx.js.map

var index = (options) => {
    return {
        inherits: Visitor__default,
        visitor: {
            DoExpression: {
                exit(path) {
                    const { meta } = path.node;
                    if (meta instanceof Visitor.ComponentExpression)
                        new ContainerJSX(meta).replace(path);
                }
            }
        }
    };
};
//# sourceMappingURL=index.js.map

module.exports = index;
//# sourceMappingURL=index.js.map
