import Core from '@expressive/babel-plugin-core';
import { DoExpression } from 'internal';
import { Program } from 'regenerate/module';

export default (options: any) => {
    return {
        inherits: Core,
        visitor: {
            Program,
            DoExpression
        }
    }
}