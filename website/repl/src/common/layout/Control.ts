import Model, { get, ref, set } from '@expressive/react';
import React, { ReactNode } from 'react';

const AXIS = ["gridTemplateRows", "gridTemplateColumns"] as const;

type DragEvent = () => (x: number, y: number) => void;

export class Layout extends Model {
  static managed = new WeakSet();

  container = ref(this.applyLayout);

  parent = get(Layout, false);
  output = get(() => this.getOutput);

  children = set<ReactNode>(undefined, (value) => {
    this.items = flatten(value);
    this.space = this.items.map(() => 1);
  });

  index?: number = 0;

  row = false;
  gap = 9;

  separator = "div";

  items = [] as ReactNode[];
  space = [] as number[];

  constructor(){
    super(() => {
      if(this.parent)
        this.separator = this.parent.separator;
    });
  }
  
  public applyLayout(element: HTMLElement){
    const { gap } = this;
    const [ x, y ] = this.row ? AXIS : AXIS.slice().reverse();

    element.style[x] = `minmax(0, 1fr)`;

    return this.get(({ space }) => {
      element.style[y] = space
        .map(value => `minmax(0, ${value}fr)`)
        .join(` ${gap}px `);
    })
  }

  protected getOutput(){
    const { items } = this;
    const output: ReactNode[] = [];

    items.forEach((child: any, i, array) => {
      let index = i * 2;

      output.push(
        React.cloneElement(child, { ...child.props, key: index, index })
      );

      if(i + 1 < array.length){
        index++;
        output.push(
          React.createElement(Spacer, { key: index, index })
        );
      }
    });

    return output;
  }

  public nudge(index: number){
    const { space, container, row, gap } = this;

    const rect = container.current!.getBoundingClientRect();
    const max = rect[row ? "width" : "height"] - ((space.length - 1) * gap);
    const sum = space.reduce((a, n) => a + n, 0);

    this.space = space.map(x => Math.round(x * max / sum));

    return (x: number, y: number) => {
      const diff = row ? x : y;
      const prior = (index - 1) / 2;
      const after = prior + 1; 
  
      this.space[prior] += diff;
      this.space[after] -= diff;
      this.set("space");
    }
  }

  public resize(between: number){
    const { parent, items, index = 0 } = this;
    const move = () => this.nudge(between);

    let pull: ((value: any) => void) | undefined;
    let push: ((value: any) => void) | undefined;

    if(parent){
      if(index > 1)
        pull = resize(move, () => parent.nudge(index - 1));

      if(index < items.length - 1)
        push = resize(move, () => parent.nudge(index + 1));
    }

    return {
      grab: resize(move),
      pull,
      push
    }
  }
}

function resize(...handle: DragEvent[]){
  return (event: MouseEvent) => {
    if(event.button !== 0)
      return;

    event.stopPropagation();
    event.preventDefault();

    const move = handle.map(x => x());

    onDrag((dX, dY) => {
      move.map(cb => cb(dX, dY));
    });
  }
}

function onDrag(delta: (x: number, y: number) => void){
  let previous = {} as { x: number, y: number };
  
  function resize(event: MouseEvent){
    const dX = event.x - previous.x || 0;
    const dY = event.y - previous.y || 0;

    if(dX || dY)
      delta(dX, dY);

    previous = event;
  }

  const endResize = () => {
    document.removeEventListener("mousemove", resize);
    document.removeEventListener("mouseup", endResize);
  }

  document.addEventListener("mousemove", resize);
  document.addEventListener("mouseup", endResize);
}

const Spacer: React.FC<{ index: number }> = ({ index }) => {
  return Layout.get(layout => {
    const { grab, pull, push } = layout.resize(index);
    const { separator, row, gap } = layout;

    if(typeof separator == "string")
      return React.createElement(separator, {});

    return React.createElement(separator, {
      grab,
      pull,
      push,
      vertical: row,
      width: gap
    });
  });
}

function flatten(input: ReactNode): ReactNode[] {
  const array = React.Children.toArray(input);

  return array.reduce((flatChildren: ReactNode[], child) => {
    const item = child as React.ReactElement<any>;

    if(item.type === React.Fragment)
      return flatChildren.concat(
        flatten(item.props.children)
      );
      
    flatChildren.push(child);
    return flatChildren;
  }, []);
}