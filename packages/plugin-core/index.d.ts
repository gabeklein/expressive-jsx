/// <reference types="babel__traverse" />
/// <reference types="node" />

import { NodePath as Path, VisitNodeObject as BabelVisitor } from "@babel/traverse"
import t, { ArrowFunctionExpression, AssignmentExpression, DoExpression, Expression, ExpressionStatement, LabeledStatement, ObjectProperty, Program, SpreadProperty, Statement, TemplateLiteral, IfStatement, ForStatement, For } from '@babel/types';

interface BunchOf<T> {
	[key: string]: T;
}
interface DoExpressive extends DoExpression {
	meta: ElementInline;
	expressive_visited?: true;
}
interface BabelState {
	context: StackFrame;
	opts: any;
}
interface ModifierOutput {
	attrs?: BunchOf<any>;
	style?: BunchOf<any>;
	props?: BunchOf<any>;
	installed_style?: (ElementModifier | ElementInline)[];
}

declare abstract class TraversableBody {
	sequence: unknown[];
	context: StackFrame;
	didEnter?(path?: Path): void;
	didExit?(path?: Path): void;
	constructor(context: StackFrame);
	protected parse(body: Path<Statement>[]): void;
	add(item: ElementItem): void;
	didEnterOwnScope(path: Path<DoExpressive>): void;
	didExitOwnScope(path: Path<DoExpressive>): void;
	ExpressionStatement(this: BunchOf<Function>, path: Path<ExpressionStatement>): void;
}
declare abstract class AttributeBody extends TraversableBody {
	props: BunchOf<Prop>;
	style: BunchOf<ExplicitStyle>;
	value: Expression;
	abstract generate(): Syntax;
	apply(item: Attribute): void;
	ExpressionDefault(path: Path<Expression>): void;
	LabeledStatement(path: Path<LabeledStatement>): void;
}
declare class ElementInline extends AttributeBody {
	primaryName?: string;
	tagName?: string;
	multilineContent?: Path<TemplateLiteral>;
	generate(): [Expression, (Statement[] | undefined)?];
	ExpressionDefault(path: Path<Expression>): void;
	AssignmentExpression(path: Path<AssignmentExpression>): void;
}
declare class ComponentExpression extends ElementInline {
	exec?: Path<ArrowFunctionExpression>;
	constructor(name: string, context: StackFrame, path: Path<DoExpressive>, exec?: Path<ArrowFunctionExpression>);
	didExitOwnScope(path: Path<DoExpressive>): void;
	private extractParams;
}
declare class ComponentConsequent extends ElementInline {
	replacement: Statement;
	logicalParent: ComponentIf;
	path: Path<Statement>;
	test?: Path<Expression>;
	constructor( 
		logicalParent: ComponentIf,
		path: Path<Statement>,
		test?: Path<Expression>
	)
}
declare class ComponentIf {
	children: ComponentConsequent[];
	parent: ElementInline;
	protected path: Path<IfStatement>;
	constructor(path: Path<IfStatement>, parent: ElementInline);
}
declare class ComponentFor {
	protected path: Path<For>;
	constructor(path: Path<For>, parent: ElementInline);
}
declare abstract class Attribute {
	name: string;
	value?: Literal;
	node?: Expression;
	overriden?: true;
	constructor(name: string);
	readonly syntax: Expression;
	toProperty(): ObjectProperty | SpreadProperty;
	toAssignment(target: Expression): ExpressionStatement;
}
declare class SpreadItem extends Attribute {
	node: Expression;
	orderInsensitive?: true;
	constructor(name: "props" | "style", node: Expression);
	toProperty(): SpreadProperty;
	toAssignment(target: Expression): ExpressionStatement;
}
declare class Prop extends Attribute {
	constructor(name: string, value: Expression);
}
declare class ExplicitStyle extends Attribute {
	verbatim?: Expression;
	priority: number;
	constructor(name: string, value: any);
	toString(): string;
	toProperty(): ObjectProperty;
	toAssignment(to: Expression): ExpressionStatement;
}
declare class InnerStatement	
	<T extends Statement = Statement> {
	node: T;
	constructor(path: Path<T>);
	output(): T;
}
declare class NonComponent
	<T extends Expression = Expression> {
	inlineType: string;
	precedence: number;
	path?: Path;
	node: Expression;
	private isPath;
	constructor(src: Path<T> | T);
	outputInline(): Expression;
	transform(): {
		product: Expression;
	};
	collateChildren(): {
		output: Expression[];
	};
}
declare class StackFrame {
	program: any;
	styleRoot: any;
	current: any;
	currentElement?: ElementInline;
	stateSingleton: BabelState;
	options: {
		generator: {
			new (from: ElementInline | NonComponent): AssembleElement;
		};
	};
	constructor(state: BabelState);
	readonly parent: any;
	register(node: TraversableBody): any;
	push(node: AttributeBody): void;
	pop(): void;
	propertyMod(name: string): GeneralModifier;
	propertyMod(name: string, set: Function): void;
	hasOwnPropertyMod(name: string): boolean;
}
declare class ElementModifier extends AttributeBody {
	name: string;
	constructor(name: string, body: Path<Statement>, context: StackFrame);
	generate(): Syntax;
	declare(target: AttributeBody): void;
	into(accumulator: ModifierOutput): void;
}
declare class GeneralModifier {
	name: string;
	transform?: ModifyAction;
	constructor(name: string, transform?: ModifyAction);
}
declare class ModifyDelegate {
	name: string;
	target: AttributeBody;
	done?: true;
	priority?: number;
	arguments?: Array<any>;
	data: BunchOf<any>;
	constructor(name: string, value: Path<Expression>[], target: AttributeBody, transform?: ModifyAction);
	assign(data: any): void;
}
declare class ComponentImplementInterop extends ComponentExpression {
	static readonly Visitor: {
		DoExpression: BabelVisitor<DoExpressive>;
	};
}
declare abstract class AssembleElement
	<From extends ElementInline = ElementInline> {
	protected source: From;
	protected expressionRequired: boolean;
	abstract Statement(statement: any): void;
	abstract Content(child: Element): void;
	abstract Props(item: Prop | SpreadItem): void;
	abstract Style(item: ExplicitStyle | SpreadItem): void;
    abstract Switch(item: ComponentIf): void;
    abstract Iterate(item: ComponentFor): void;
	constructor(source: From, expressionRequired?: boolean);
	parse(includeOverridden?: true): void;
}
declare const _default: (options: any) => {
	manipulateOptions: (options: any, parse: any) => void;
	visitor: {
		Program: BabelVisitor<Program>;
	};
};

declare type ParseError = (path: Path, ...args: (string | number)[]) => Error;
declare type Literal = string | number | boolean | null;
declare type ModifyAction = (this: ModifyDelegate, ...args: any[]) => ModifierOutput | undefined;
declare type Element = ElementInline | NonComponent<any>;
declare type Syntax = [Expression, Statement[]?];
declare function PossibleExceptions
	<O extends BunchOf<string>>(register: O): 
	{ readonly [P in keyof O]: ParseError };

export default _default;

export { 
	ComponentImplementInterop as DoComponent, 
	AssembleElement
};

export {
	DoExpressive,
	ExplicitStyle,
	ElementInline,
	SpreadItem,
	Prop,
	Syntax,
	Element,
	Attribute,
	InnerStatement,
	NonComponent,
	ComponentExpression,
	ComponentIf,
	ComponentConsequent,
	ComponentFor,
	PossibleExceptions,
}