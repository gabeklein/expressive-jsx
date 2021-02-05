import { Expression, isBlockStatement, isExpressionStatement, isLabeledStatement, LabeledStatement } from '@babel/types';
import { ParseErrors } from 'errors';
import { ElementModifier, Modifier, TraversableBody } from 'handle';
import { applyModifier } from 'parse';
import { hash } from 'shared';
import { BunchOf, FlatValue } from 'types';

const Oops = ParseErrors({
  ExpressionUnknown: "Unhandled expressionary statement of type {1}",
  NodeUnknown: "Unhandled node of type {1}",
  BadInputModifier: "Modifier input of type {1} not supported here!",
  BadModifierName: "Modifier name cannot start with _ symbol!",
  DuplicateModifier: "Duplicate declaration of named modifier!"
})

export abstract class AttributeBody extends TraversableBody {

  props = {} as BunchOf<Prop>;
  style = {} as BunchOf<ExplicitStyle>;

  insert(item: Prop | ExplicitStyle){
    const { name } = item;
    const accumulator = item instanceof Prop
      ? this.props : this.style;

    if(name){
      const existing = accumulator[name];
      if(existing)
        existing.overridden = true;
      accumulator[name] = item;
    }

    this.add(item);
  }

  get uid(){
    return this.uid =
      this.name + "_" + hash(this.context.prefix);
  }

  set uid(uid: string){
    Object.defineProperty(this, "uid", { value: uid });
  }

  abstract ElementModifier(mod: Modifier): void;

  LabeledStatement(
    node: LabeledStatement,
    _path: any,
    applyTo: Modifier = this as any){

    const body = node.body;
    const { name } = node.label;
    const { context } = this;

    if(name[0] == "_")
      throw Oops.BadModifierName(node)

    if(context.hasOwnModifier(name))
      throw Oops.DuplicateModifier(node);

    const handler = applyTo.context.propertyMod(name);

    if(isExpressionStatement(body) || handler && (
      isBlockStatement(body) || isLabeledStatement(body)
    ))
      applyModifier(name, applyTo, body);

    else if(isBlockStatement(body) || isLabeledStatement(body)){
      const mod = new ElementModifier(context, name, body);
      applyTo.ElementModifier(mod);
    }

    else
      throw Oops.BadInputModifier(body, body.type)
  }

  ExpressionDefault(e: Expression){
    throw Oops.ExpressionUnknown(e, e.type);
  }
}

export abstract class Attribute<T extends Expression = Expression> {
  name?: string;
  overridden?: boolean;
  invariant?: boolean;
  value: FlatValue | T | undefined

  constructor(
    name: string | false,
    value: FlatValue | T){

    if(name) this.name = name;
    if(value !== undefined) this.value = value;

    if(typeof value !== "object" || value === null)
      this.invariant = true
  }
}

export class Prop extends Attribute {}

export class ExplicitStyle extends Attribute {
  constructor(
    name: string | false,
    value: FlatValue | Expression | FlatValue[],
    public important = false){

    super(name, flatten(value));

    function flatten(content: typeof value){
      if(Array.isArray(content)){
        const [ callee, ...args ] = content;
        return `${callee}(${args.join(" ")})`;
      }

      return content;
    }
  }
}