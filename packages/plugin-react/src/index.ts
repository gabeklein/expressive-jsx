import { Path as Path } from '@babel/traverse';
import Core, { ComponentExpression, DoExpressive } from '@expressive/babel-plugin-core';

import { ContainerJSX } from './internal';

export default (options: any) => {
    return {
        inherits: Core,
        visitor: {
            DoExpression: {
                exit(path: Path<DoExpressive>){
                    const entry = path.node.meta;
                    if(entry instanceof ComponentExpression)
                        new ContainerJSX(entry).replace(path);
                }
            }
        }
    }
}