<h1 align="center">
  Expressive JSX
</h1>

<h4 align="center">
  Adds additional features to JSX, namely inline CSS. Currently for React.
</h4>

<br />

Expressive JSX is a Babel plugin that enhances JSX with a CSS-in-JS solution using JavaScript labels. This allows developers to define styles directly within JSX components, leveraging a concise syntax for selectors, properties, and conditional styling. This README provides an exhaustive overview of the plugin’s features, including examples, output transformations, and limitations.

<br />

## Quick Start

Here’s a simple example to get started with Expressive JSX:

```jsx
const Button = ({ active }) => {
  padding: 10;

  if(active)
    background: blue;
  else
    background: grey;

  if (":hover")
    background: darkblue;

  <this>Click me</this>
}
```

Converts to:
```jsx output
const Button = ({ className, active, ...rest }) => (
  <div
    {...rest}
    className={classNames(
      'Button_cba',
      active ? 'active_abc' : 'else_abc',
      className
    )}>
    Click me
  </div>
);
```

```css output
.Button_cba {
  padding: 10px;
}
.Button_cba.active_abc {
  background: blue;
}
.Button_cba.else_abc {
  background: grey;
}
.Button_cba:hover {
  background: darkblue;
}
```
<br />

## General Facts and Gotchas

- **TypeScript Support**: Expressive JSX styles are not supported in `.tsx` files due to language server constraints.
  - However, `.jsx` files can use JSDoc annotations for TypeScript type checking (e.g., `/** @type {React.FC} */`).
  - A project using Expressive JSX will typically mix `.jsx` for styled components, `.tsx` for unstyled components, and `.ts` for other logic.
- **CSS Modules**: Expressive JSX (when used with vite) will generate CSS modules by default. This means that styles are scoped to the component, preventing global style conflicts.
- **Error Handling**: Invalid style properties or malformed macro arguments throw errors during Babel compilation, ensuring robust transformation.
- **Macros**: Macros are functions that transform style values before conversion to CSS. Built-in macros handle shorthands like `size` and `radius`, and custom macros can be defined and passed to the Babel plugin.

<br />

## Elements

- **Standard and Custom Tags**: Normal JSX rules apply. Non-standard HTML tags (e.g., `<foo>`) are emitted as `<div>` elements, with the tag name serving as a selector if styled.
- **Bare Attributes as Selectors**: Attributes without values (e.g., `<foo fancy />`) act as selectors and are removed if a style block applies. Attributes starting with `_` (e.g., `_fancy`) are always removed, styled or not.
- **Class Name Concatenation**: Existing `className` props are preserved and concatenated with generated class names.

```jsx input
const Element = () => {
  foo: {
    color: red;
  }
  thing: {
    color: blue;
  }
  fancy: {
    color: gold;
  }

  <this>
    <foo />
    <bar />
    <article />
    <thing className="custom">
      <foo fancy />
      <foo _fancy />
      <something notFancy />
      <something _notFancy />
    </thing>
  </this>
}
```

```jsx output
const Element = (props) => (
  <div {...props}>
    <div className="foo_abc" />
    <div />
    <article />
    <div className={classNames('thing_abc', 'custom')}>
      <div className="foo_abc fancy_abc" />
      <div className="foo_abc fancy_abc" />
      <div notFancy />
      <div />
    </div>
  </div>
);
```

```css output
.foo_abc {
  color: red;
}
.fancy_abc {
  color: gold;
}
.foo_abc {
  color: red;
```

<br />

## <this> Element

- **Purpose**: `<this>` denotes the current component, used to wrap multiple returned elements or apply styles to the component itself.
- **Prop Forwarding**: `<this>` forwards all props to the rendered element, combining generated class names with any existing `className` prop.
- **Implicit Return**: If a component contains only style labels and no JSX, an implicit `<this />` is returned with the styles applied.

```jsx input
const Element = () => {
  color: red;
  background: blue;

  <this className="custom">
    <foo />
    <bar />
  </this>
}
```

```jsx output
const Element = (props) => (
  <div
    {...props}
    className={classNames(props.className, 'custom', 'Element_cba')}
  >
    <div />
    <div />
  </div>
);
```

```css output
.Element_cba {
  color: red;
  background: blue;
}
```

<br />

## Components

- **Implicit Returns**: If a function returns nothing and a JSX element is the last statement, that element is implicitly returned. If only style labels are present, an implicit `<this />` is returned with the styles applied.
- **Explicit Returns**: If JSX elements are present alongside styles, an explicit return (e.g., `<this>`) is required.
- **Nested Component Styling**: Styles for nested components (e.g., `Button: { color: blue; }`) are treated as selectors scoped to the component’s lexical scope, applying only to elements or components with that name.

```jsx input
const Child = () => {
  color: red;

  // Implicit <this />
}

const Parent = () => {
  Child: {
    color: blue;
  }

  <Child />
}
```

```jsx output
const Child = (props) => (
  <div
    {...props}
    className={classNames(props.className, 'Child_cba')}
  />
);

const Parent = () => (
  <div className="Child_abc" />
);
```

```css output
.Child_cba {
  color: red;
}
.Child_abc {
  color: blue;
}
```

<br />

## Labels

### Selectors

- **Basic Selectors**: Labels followed by a block `{ ... }` define styles for all elements or attributes with that name in the component’s lexical scope.
- **Nested Selectors**: Selectors can be nested to limit their scope, applying to elements or attributes within a specific parent.
- **Custom Attributes**: Bare attributes (e.g., `<foo fancy />`) are treated as selectors, styled, and removed if applicable.

```jsx input
const Element = () => {
  fancy: {
    color: gold;
  }
  foo: {
    fancy: {
      fontVariant: italic;
    }
  }
  <this>
    <foo>
      <fancy />
      <div fancy>Hello italic</div>
    </foo>
    <fancy />
  </this>
}
```
```jsx output
const Element = (props) => (
  <div {...props}>
    <div>
      <div className="fancy_abc fancy_roo" />
      <div className="fancy_abc fancy_roo">Hello italic</div>
    </div>
    <div className="fancy_abc" />
  </div>
);
```
```css output
.fancy_abc {
  color: gold;
}
.fancy_roo {
  font-variant: italic;
}
```

### Properties

- **Syntax**: Labels followed by an identifier, string, number, or sequence are CSS properties with their respective values.
- **CamelCase Conversion**: CamelCase labels (e.g., `backgroundColor`) are converted to dash-case (e.g., `background-color`).
-- **Vendor Prefixes**: When an identifier starts with a capital letter, it is treated as a vendor-prefixed property (e.g., `WebkitTransform` → `-webkit-transform`).
- **Numbers**: Numbers tend to be treated as pixel values unless specified otherwise (e.g., `padding: 10` → `padding: 10px`). However this is powered by
macros, so only certain properties which are known to be pixel values will be converted.
- **Comma-Separated Values**: Comma-separated values are concatenated with spaces (e.g., `margin: 0, auto` → `margin: 0 auto`).
- **Quoted Strings**: Quoted strings are used for exact CSS values (e.g., `width: '100vw'`).
- **Non-Standard Properties**: Properties like `marginT` or `font` are handled by macros (see Macros section).

```jsx input
const Element = () => {
  color: red;
  backgroundColor: blue;
  margin: 0, auto;
  width: '100vw';
}
```
```css output
.Element_cba {
  color: red;
  background-color: blue;
  margin: 0 auto;
  width: 100vw;
}
```

### CSS Variables

- **Declaration**: Labels starting with `$` declare CSS variables (e.g., `$myVariable: blue` → `--my-variable: blue`).
- **Invocation**: Identifiers starting with `$` in values invoke variables (e.g., `color: $myVariable` → `color: var(--my-variable)`).
- **CamelCase Conversion**: CamelCase variable names are converted to dash-case.

```jsx input
const Element = () => {
  $myVariable: blue;
  $myOtherVariable: red;
  color: $myVariable;
  backgroundColor: $myOtherVariable;
}
```

```css output
.Element_cba {
  --my-variable: blue;
  --my-other-variable: red;
  color: var(--my-variable);
  background-color: var(--my-other-variable);
}
```

### Conditional Styling

Expressive JSX supports conditional styling using `if` and `if`/`else` statements to apply styles based on component props or other conditions. These can target the component itself (`<this>`) or specific selectors.

- **Prop-based Conditions**: Styles are applied conditionally based on props, generating unique class names for each condition.
- **Else Clause**: An `else` clause specifies alternative styles when the condition is false.
- **Selector Conditions**: Conditions can apply to specific elements or attributes within the component.

```jsx input
const Button = ({ active }) => {
  background: white;

  if (active)
    color: red;
  else
    color: blue;

  div: {
    color: green;

    if (active)
      color: yellow;
  }

  <this>
    <div>Hello</div>
  </this>
}
```

```jsx output
const Button = ({ className, active, ...rest }) => (
  <div
    {...rest}
    className={classNames(
      'Button_cba',
      active ? 'active_abc' : 'else_abc',
      className
    )}>
    <div className={classNames('div_abc', active && 'active_roo')}>
      Hello
    </div>
  </div>
);
```

```css output
.Button_cba {
  background: white;
}
.Button_cba.active_abc {
  color: red;
}
.Button_cba.else_abc {
  color: blue;
}
.div_abc {
  color: green;
}
.active_roo {
  color: yellow;
}
```

### Pseudo-Classes and Pseudo-Elements

Expressive JSX supports CSS pseudo-classes (e.g., `:hover`) and pseudo-elements (e.g., `:after`) using `if` statements. These can be nested with other conditions, such as class selectors.

```jsx input
const Element = () => {
  color: red;

  if (":hover")
    color: blue;

  if (".active") {
    color: green;

    if (":after")
      content: "!";
  }

  <this>Hello</this>
}
```

```css output
.Element_cba {
  color: red;
}
.Element_cba:hover {
  color: blue;
}
.Element_cba.active {
  color: green;
}
.Element_cba.active:after {
  content: "!";
}
```

### Shorthand Properties

Expressive JSX provides shorthand properties via macros, mapping concise syntax to standard CSS properties. Common shorthands include:

| Shorthand | CSS Output |                                      
|-----------|------------|
| `size: 500` | `width: 500px; height: 500px`                   
| `radius: round` | `border-radius: 999px`                          
| `absolute: fill` | `position: absolute; top: 0; right: 0; bottom: 0; left: 0` 
| `absolute: fill-bottom` | `position: absolute; bottom: 0; right: 0; left: 0` 
| `marginT: 10` | `margin-top: 10px`                              
| `flexAlign: center, down` | `display: flex; justify-content: center; align-items: center; flex-direction: column`
| `outline: red` | `outline: 1px dashed red`                       

```jsx input
const Element = () => {
  size: 500;
  radius: round;
  absolute: fill-bottom;
  marginT: 10;
  flexAlign: center, down;
  outline: red;
}
```

```css output
.Element_cba {
  width: 500px;
  height: 500px;
  border-radius: 999px;
  position: absolute;
  bottom: 0;
  right: 0;
  left: 0;
  margin-top: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  outline: 1px dashed red;
}
```

### Color Values

Expressive JSX supports hex color values using a `0x` prefix, which are converted to standard CSS hex or RGBA formats. Numbers are treated as pixel values unless specified otherwise.

```jsx input
const Element = () => {
  color: 0xff0000; // Red
  background: 0x00ff0022; // Green with 0.133 opacity
  <this />
}
```

```css output
.Element_cba {
  color: #ff0000;
  background: rgba(0, 255, 0, 0.133);
}
```

### Complex Style Values

Some CSS properties accept complex values, such as sequences of transformations or quoted strings for exact CSS syntax.

```jsx input
const Element = () => {
  transform: translateX(10), rotate(90), scale(2);
  content: "Hello;
  <this />
}
```
```css output
.Element_cba {
  transform: translateX(10) rotate(90) scale(2);
  content: "Hello";
}
```

### Macros

Macros are functions that transform style values before they are converted to CSS. Expressive JSX includes built-in macros for common properties and supports custom macros passed to the Babel plugin.

- **Built-in Macros**: Handle shorthands like `border`, `radius`, `flexAlign`, `absolute`, `outline`.
- **Custom Macros**: Defined as functions that take values and return style objects.

```jsx input
// Custom macro
function foo(value) {
  return { foo: value + "Baz" };
}

// Component with macro
const Element = () => {
  foo: "bar";
  outline: red;
}
```

```css output
.Element_cba {
  foo: barBaz;
  outline: 1px dashed red;
}
```

To use custom macros, pass them to the Babel plugin:

```javascript
{
  plugins: [
    ['@expressive/babel-plugin-jsx', { macros: [{ foo }] }]
  ]
}
```

<br />

## Output Structure

Expressive JSX generates unique class names for each component and selector, ensuring style scoping. Class names follow the format `<ComponentName>_<hash>` (e.g., `Component_26k`) or `<selector>_<hash>` (e.g., `div_abc`). Conditional styles use suffixes like `active_abc` or `else_abc`.

```jsx input
const Button = () => {
  color: blue;

  if (":hover")
    color: red;
}
```

```css output
.Button_cba {
  color: blue;
}
.Button_cba:hover {
  color: red;
}
```

<br />

## Limitations

- **TSX Files**: Expressive JSX styles are not supported in `.tsx` files, though JSDoc annotations in `.jsx` provide limited TypeScript support.
- **Bracketless `if` Syntax**: Syntax like `div: if(active) color: red;` is not supported.
- **Class Name Recycling**: Styles for the same selector under different conditions (e.g., `div: { color: green; }` and `if(active) div: { color: red; }`) do not reuse class names, generating separate classes.
- **Advanced CSS**: Features like `@media` queries or keyframe animations are not supported.
- **Runtime Styles**: Dynamic concatenation of runtime styles via inline `style` props is not currently supported.