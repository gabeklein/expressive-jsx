import {
    Expression,
    JSXAttribute,
    JSXElement,
    JSXExpressionContainer,
    JSXFragment,
    JSXSpreadAttribute,
    JSXSpreadChild,
    JSXText,
} from '@babel/types';
import { IterateJSX, SwitchJSX, ElementJSX, ContentJSX } from 'internal';

export type JSXContent = JSXElement | JSXFragment | JSXExpressionContainer | JSXText | JSXSpreadChild;
export type Attributes = JSXAttribute | JSXSpreadAttribute;
export type InnerJSX = ElementJSX | ContentJSX | SwitchJSX | IterateJSX;

export interface ContentReact {
    toExpression(): Expression;
    toElement(): JSXContent;
}