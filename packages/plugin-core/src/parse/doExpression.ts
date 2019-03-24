import t, { ArrowFunctionExpression, VariableDeclarator, VariableDeclaration, AssignmentExpression, ObjectProperty } from '@babel/types';
import { ComponentExpression } from 'internal';
import { BabelVisitor, DoExpressive, Path } from 'types';
import { StackFrame }  from './program';

class ComponentImplementInterop extends ComponentExpression {
    static get Visitor(){
        return {
            DoExpression: <BabelVisitor<DoExpressive>> {
                enter: (path, state) => {
                    let meta = path.node.meta || generateEntryElement(this, path, state.context);
                    meta.didEnterOwnScope(path)
                },
                exit: (path, state) => {
                    state.context.pop();
                    path.node.meta.didExitOwnScope(path)
                }
            }
        }
    }
}

export { ComponentImplementInterop as DoComponent }

export default <BabelVisitor<DoExpressive>> {
    enter: (path, state) => {
        let meta = path.node.meta || generateEntryElement(ComponentExpression, path, state.context);
        
        meta.didEnterOwnScope(path)
    },
    exit: (path, state) => {
        state.context.pop();
        path.node.meta.didExitOwnScope(path)
    }
}

function generateEntryElement(
    implementation: typeof ComponentExpression, 
    path: Path<DoExpressive>, 
    context: StackFrame){

    let parent = path.parentPath;
    let containerFn: Path<ArrowFunctionExpression> | undefined;

    switch(parent.type){
        case "ArrowFunctionExpression":
            containerFn = parent as Path<ArrowFunctionExpression>;
        break;

        case "ReturnStatement": 
            const container = parent.getAncestry()[3];
            if(container.isArrowFunctionExpression())
                containerFn = container;
        break;
    }

    const name = containerName(containerFn || path);
    
    return new implementation(name, context, path, containerFn);
}

function containerName(path: Path): string {
    let parent = path.parentPath;

    switch(parent.type){
        case "VariableDeclarator": {
            const { id } = parent.node as VariableDeclarator;
            return t.isIdentifier(id)
                ? id.name
                : (parent.parentPath as Path<VariableDeclaration>).node.kind
        }

        case "AssignmentExpression":
        case "AssignmentPattern": {
            const { left } = parent.node as AssignmentExpression;
            return t.isIdentifier(left)
                ? left.name
                : "assignment"
        }

        case "ExportDefaultDeclaration":
            return "default";
        
        case "ArrowFunctionExpression":
        case "ReturnStatement": {
            return "returned";
        }

        case "ObjectProperty": {
            const { key } = parent.node as ObjectProperty;
            return t.isIdentifier(key)
                ? key.name
                : "property"
        }

        case "SequenceExpression": {
            const isWithin = path.findParent(
                x => ["ArrowFunctionExpression", "ClassMethod"].indexOf(x.type) >= 0
            );
            if(isWithin)
                throw isWithin.buildCodeFrameError(
                    "Component Syntax `..., do {}` found outside expressive context! Did you forget to arrow-return a do expression?"
                )
            else 
                return "callback";
        }

        default:
            return "do";
    }
}
