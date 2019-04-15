/// <reference types="babel__traverse" />
import { NodePath as Path, VisitNodeObject } from '@babel/traverse';
import t, {
    ArrowFunctionExpression,
    AssignmentExpression,
    DoExpression,
    Expression,
    ExpressionStatement,
    For,
    LabeledStatement,
    Program,
    Statement,
    TemplateLiteral,
} from '@babel/types';

interface BunchOf<T> {
	[key: string]: T;
}
interface BabelState<S extends StackFrame = StackFrame> {
    readonly filename: string;
    readonly cwd: string;
    readonly context: S;
    readonly opts: any;
}
interface DoExpressive extends DoExpression {
	readonly meta: ElementInline;
	readonly expressive_visited?: true;
}
interface ModifierOutput {
	readonly attrs?: BunchOf<any>;
	readonly style?: BunchOf<any>;
	readonly props?: BunchOf<any>;
	readonly installed_style?: (ElementModifier | ElementInline)[];
}
declare abstract class TraversableBody {
	protected constructor();
	readonly sequence: unknown[];
	readonly context: StackFrame;
	parse(body: Path<Statement>): void;
	add(item: unknown): void;
}
declare abstract class AttributeBody extends TraversableBody {
	readonly sequence: Attribute[];
	readonly props: BunchOf<Prop>;
	readonly style: BunchOf<ExplicitStyle>;
	readonly uid: string;
	insert(item: Prop | ExplicitStyle): void;
}
declare class ElementInline extends AttributeBody {
	readonly primaryName?: string;
	readonly name?: string;
	readonly multilineContent?: Path<TemplateLiteral>;
	readonly children: InnerContent[];
	readonly modifiers: ElementModifier[]
	readonly explicitTagName?: string;
	readonly doBlock?: DoExpressive;
	adopt(child: InnerContent): void;
}
declare class ComponentExpression extends ElementInline {
	private constructor();
	readonly exec?: Path<ArrowFunctionExpression>;
}
declare class ComponentIf {
	private constructor();
	readonly forks: Array<ComponentConsequent | ComponentIf>;
	readonly test?: Path<Expression>;
	readonly context: StackFrame;
	readonly hasElementOutput?: boolean;
	readonly hasStyleOutput?: boolean;
	readonly parent: ElementInline;
}
declare class ComponentConsequent extends ElementInline {
	private constructor()
	readonly usesClassname?: string;
	readonly parentElement: ElementInline;
	readonly parent: ComponentIf;
	readonly path: Path<Statement>;
	readonly test?: Path<Expression>;
}
declare class ComponentFor extends ElementInline {
	private constructor();
	readonly path: Path<For>;
	readonly context: StackFrame;
}
declare abstract class Attribute<T extends Expression = Expression> {
    protected constructor();
	readonly name: string | false;
	readonly value: FlatValue | T | undefined;
	readonly path?: Path<T> | undefined;
	invariant: boolean | undefined;
	readonly overriden?: boolean;
}
declare class Prop extends Attribute {
    constructor(name: string | false, node: FlatValue | Expression | undefined, path?: Path<Expression>);
	readonly synthetic?: boolean;
}
declare class ExplicitStyle extends Attribute {
    constructor(name: string | false, node: FlatValue | Expression | undefined, path?: Path<Expression>);
	priority: number;
}
interface StackFrame {
	readonly prefix: string;
	readonly program: any;
	readonly styleRoot: any;
	readonly current: any;
	readonly currentElement?: ElementInline;
	readonly currentIf?: ComponentIf;
	readonly entryIf?: ComponentIf;
	readonly stateSingleton: BabelState;
	readonly options: {};
	readonly parent: StackFrame;
	event(ref: symbol): Function;
	event(ref: symbol, set: Function): void;
	dispatch(ref: symbol, ...args: any[]): void;
	resolve(as?: string): void;
	create(node: any): StackFrame;
	push(node: TraversableBody): void;
	pop(): void;
	propertyMod(name: string): ModifyAction;
	propertyMod(name: string, set: ModifyAction): void;
	elementMod(name: string): ElementModifier;
	elementMod(set: ElementModifier): void;
	hasOwnPropertyMod(name: string): boolean;
}
declare abstract class Modifier extends AttributeBody {
    forSelector?: string[];
    onlyWithin?: Modifier;
    onGlobalStatus?: string[];
    priority?: number;
}
declare class ElementModifier extends Modifier {
	constructor(context: StackFrame, name?: string, body?: Path<Statement>);
	readonly name: string;
	readonly next?: ElementModifier;
	readonly nTargets: number;
	readonly provides: ElementModifier[];
	declare<T extends AttributeBody>(target: T): void;
	apply(element: ElementInline): void;
}
declare class ContingentModifier extends Modifier {
	constructor(
        context: StackFrame,
        parent: ContingentModifier | ElementModifier | ElementInline,
        contingent?: string
    )
	readonly anchor: ElementModifier | ElementInline;
}
interface ModifyDelegate {
	readonly name: string;
	readonly target: AttributeBody;
	readonly data: BunchOf<any>;
	readonly priority?: number;
	readonly arguments?: Array<any>;
	done?: true;
	assign(data: any): void;
}
declare abstract class ElementConstruct
	<From extends ElementInline = ElementInline> {
	abstract source: From;
	abstract Statement<T extends Statement>(item: Path<T> | T): void;
    abstract Content<T extends Expression = never>(item: Path<T> | T): void;
    abstract Child(item: ElementInline): void
    abstract Props(prop: Prop): void;
	abstract Style(style: ExplicitStyle): void;
	abstract Switch(item: ComponentIf): void;
	abstract Iterate(item: ComponentFor): void;

	/**
	 * Invoked on all Attributes during `this.parse()` execution.
	 * Will be called regardless if `overridden` is true.
	 * 
	 * @param item Props, styles, and spread attributes encountered in source element.
	 * 
	 * @returns preventDefault: `true` if type callback should be skipped.
	 * 
	 */
	Attribute?(item: Attribute): boolean | undefined;
	
	/**
	 * @param overridden Prevent drop of named attributes where duplicates do exist.
	 */
	parse(overridden?: true): void;

	/**
	 * Invoked on `this.parse()` prior to scan.	
	 * 
	 * @param sequence The sequence which is about to be scanned.
	 * 
	 * @returns (optional) A new sequence which you want to scan instead.
	 */
	willParse?(sequence: SequenceItem[]): SequenceItem[] | void;
	
	/**
	 * Invoked on `this.parse()` after last element has been scanned.	
	 */
	didParse?(): void;
}

declare const _default: (options: any) => {
	manipulateOptions: (options: any, parse: any) => void;
	visitor: {
		Program: Visitor<Program>;
	};
};

type Visitor<T, S extends StackFrame = StackFrame> = VisitNodeObject<BabelState<S>, T>
type ParseError = (path: Path, ...args: (string | number)[]) => Error;
type ModifyAction = (this: ModifyDelegate, ...args: any[]) => ModifierOutput | undefined;
type FlatValue = string | number | boolean | null;
type InnerContent = ElementInline | ComponentIf | ComponentFor | Path<Expression> | Expression;
type SequenceItem = Attribute | InnerContent | Path<Statement>;

declare function ParseErrors
	<O extends BunchOf<string>>(register: O): 
	{ readonly [P in keyof O]: ParseError };
	
export default _default;

export {
	ElementConstruct,
	DoExpressive,
	SequenceItem,
	Prop,
	ExplicitStyle,
	ElementInline,
	ComponentExpression,
	ComponentIf,
	ComponentConsequent,
	ComponentFor,
	StackFrame,
	ParseErrors,
	AttributeBody,
	ElementModifier,
	Visitor,
	BabelState,
	Modifier,
	ContingentModifier
}