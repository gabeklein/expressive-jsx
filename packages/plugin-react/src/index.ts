import Core from '@expressive/babel-plugin-core';
import { DoExpression, Program } from 'internal';

export default (options: any) => {
    return {
        inherits: Core,
        visitor: {
            Program,
            DoExpression
        }
    }
}