import { VisitNodeObject as Visit } from '@babel/traverse';
import Visitor, { DoExpressive, ComponentExpression } from '@expressive/babel-plugin-core';
import { ContainerJSX } from './jsx';

export default (options: any) => {
    return {
        inherits: Visitor,
        visitor: {
            DoExpression: <Visit<DoExpressive>>{
                exit(path){
                    const { meta } = path.node;
                    if(meta instanceof ComponentExpression)
                        new ContainerJSX(meta).replace(path);
                }
            }
        }
    }
}