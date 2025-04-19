# Expressive JSX

#### Adds additional features to JSX, namely inline CSS. Currently for React.

Expressive JSX is a Babel plugin that enhances JSX with a CSS-in-JS solution using JavaScript labels. This allows developers to define styles directly within JSX components, leveraging a concise syntax for selectors, properties, and conditional styling. This README provides an exhaustive overview of the plugin’s features, including examples, output transformations, and limitations, serving as both documentation and a reference for developers.

<br />

## Feature Summary

Expressive JSX supports the following key features:
- **Inline CSS with Labels**: Define CSS properties and selectors using JavaScript labels.
- **Conditional Styling**: Apply styles based on props or conditions using `if`/`else`.
- **Pseudo-Classes and Pseudo-Elements**: Support for `:hover`, `:after`, etc., via `if` statements.
- **Shorthand Properties**: Concise syntax for common CSS properties (e.g., `size`, `radius`).
- **CSS Variables**: Declare and use custom properties with `$` prefix.
- **Macros**: Transform style values with built-in or custom functions.
- **CSS Modules**: Scoped styles with automatic class name generation.
- **Prop Forwarding**: Seamless integration with React props, including `className`.
- **Dynamic JSX Compatibility**: Works with conditional rendering, hooks, and third-party libraries.
- **Implicit Returns**: Automatic return of JSX elements or `<this />` in certain cases.

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

**Output JSX**:
```jsx
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
**Output CSS**:
```css
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
  - Use `.jsx` files with JSDoc annotations for TypeScript type checking (e.g., `/** @type {React.FC} */`).
  - You will need to do this in order for custom components to be recognized as React components.
  - ```jsx
    /** @type {React.FC} */
    const Component = () => {
      color: red;
      <this>Hello</this>
    }
    ```
  - Projects typically mix `.jsx` for styled components, `.tsx` for unstyled components, and `.ts` for other logic.
- **CSS Modules**: When used with Vite, Expressive JSX generates CSS Modules by default, scoping styles to components to prevent conflicts. Class names are referenced via an imported CSS module (e.g., `css.div_tla`).
  - ```jsx
    const Component = () => {
      div: { color: blue }
      <div>Hello</div>
    }

    // Output:
    import css from './styles.module.css';
    const Component = () => <div className={css.div_tla}>Hello</div>;
    ```
  - Configure via the `cssModule` option in the Babel plugin.
- **Error Handling**: Invalid style properties or malformed macro arguments throw errors during Babel compilation.
- **Macros**: Built-in macros handle shorthands like `size`, `radius`, and `border`. Custom macros can be defined and passed to the Babel plugin.
- **Dynamic JSX Compatibility**: Expressive JSX integrates seamlessly with dynamic JSX content, such as conditional rendering, interpolated values, React hooks, and context.
  - ```jsx
    const Component = () => {
      const { seconds } = useCountdown({ seconds: 60 });
      color: red;
      <this>{seconds > 0 && <span>{seconds}</span>}</this>
    }
    ```
- **Third-Party Libraries**: Works with libraries like `react-router-dom` and custom elements like SVGs.
  If they accept a className prop they can be styled as any JSX element can.
  ```jsx
  import { Link } from 'react-router-dom';
  const Component = () => {
    Link: { color: blue }
    <Link to="/">Home</Link>
  }
  ```

<br />

## Elements

- **Standard and Custom Tags**: Normal JSX rules apply. Non-standard HTML tags (e.g., `<foo>`) are emitted as `<div>` elements, with the tag name serving as a selector if styled.
- **Bare Attributes as Selectors**: Attributes without values (e.g., `<foo fancy />`) act as selectors and are removed if a style block applies. Attributes starting with `_` (e.g., `_fancy`) are always removed, styled or not.
- **Class Name Concatenation**: Existing `className` props are preserved and merged with generated class names using the `classNames` utility.

```jsx
const Element = () => {
  foo: { color: red }
  thing: { color: blue }
  fancy: { color: gold }

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

**Output JSX**:
```jsx
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
```css
.foo_abc {
  color: red;
}
.thing_abc {
  color: blue;
}
.fancy_abc {
  color: gold;
}
```

<br />

## `<this>` Element

- **Purpose**: `<this>` denotes the current component, used to wrap multiple returned elements or apply styles to the component itself.
- **Prop Forwarding**: `<this>` forwards all props to the rendered element, merging `className` with generated class names using `classNames`.
- **Implicit Return**: If a component contains only style labels and no JSX, an implicit `<this />` is returned with the styles applied.
- **Attribute Usage**: `<this>` can be used as an attribute on native elements (e.g., `<input this />`) to apply component styles.

```jsx
const Component = () => {
  color: red;
  background: blue;

  <input this className="custom" />
}
```

**Output JSX**:
```jsx
const Component = (props) => (
  <input
    {...props}
    className={classNames(props.className, 'custom', 'Component_cba')}
  />
);
```
```css
.Component_cba {
  color: red;
  background: blue;
}
```

<br />

## Components

- **Implicit Returns**:
  - If a function contains only style labels, an implicit `<this />` is returned with the styles applied.
  - If a function’s last statement is a single JSX element, it is implicitly returned.
    ```jsx
    const Component = () => {
      <div>Hello</div>
    }
    // Output: const Component = () => <div>Hello</div>;
    ```
- **Explicit Returns**: If JSX elements are present alongside styles or other statements, an explicit return (e.g., `<this>`) is required.
- **Nested Component Styling**: Styles for nested components (e.g., `Button: { color: blue }`) are treated as selectors scoped to the component’s lexical scope.
- **Custom Component Styling**: Styles can be applied to imported or custom components.
  ```jsx
  import { CustomButton } from './CustomButton';

  const Parent = () => {
    CustomButton: { color: blue }
    <CustomButton />
  }
  ```

Because components normally pass their className prop to their children,
eventually to the real elements, you can can compose styles pretty easily.
```jsx
const Child = () => {
  color: red;
  // Implicit <this />
}

const Parent = () => {
  Child: { color: blue }
  <Child />
}
```

**Output JSX**:
```jsx
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
```css
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
- **Nested Selectors**: Selectors can be nested to limit their scope.
- **Custom Attributes**: Bare attributes (e.g., `<foo fancy />`) are treated as selectors, styled, and removed if applicable.

```jsx
const Element = () => {
  fancy: { color: gold }
  foo: {
    fancy: { fontVariant: italic }
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

**Output JSX**:
```jsx
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
```css
.fancy_abc {
  color: gold;
}
.fancy_roo {
  font-variant: italic;
}
```

### Properties

- **Syntax**: Labels followed by an identifier, string, number, or sequence are CSS properties with their values.
- **CamelCase Conversion**: CamelCase labels (e.g., `backgroundColor`) are converted to dash-case (e.g., `background-color`).
- **Vendor Prefixes**: Identifiers starting with a capital letter are treated as vendor-prefixed properties (e.g., `WebkitTransform` → `-webkit-transform`).
- **Number Conversions**:
  - Integers (e.g., `fontSize: 12`) → `12px` for properties like `fontSize`, `padding`, etc.
  - Decimals (e.g., `fontSize: 1.5`) → `1.5em` for properties like `fontSize`.
  - Macros may override these for specific properties (e.g., `size: 500` → `width: 500px; height: 500px`).
- **Comma-Separated Values**: Concatenated with spaces (e.g., `margin: 0, auto` → `margin: 0 auto`).
- **Quoted Strings**: Used for exact CSS values, including functions like gradients.
  ```jsx
  background: 'linear-gradient(red, blue)';
  // background: linear-gradient(red, blue);
  ```
- **!important**: Supported by appending `, !important` to values.
  ```jsx
  color: white, !important;
  // color: white !important;
  ```

```jsx
const Element = () => {
  color: red;
  backgroundColor: blue;
  margin: 0, auto;
  width: '100vw';
  fontSize: 1.5;
}
```
```css
.Element_cba {
  color: red;
  background-color: blue;
  margin: 0 auto;
  width: 100vw;
  font-size: 1.5em;
}
```

### CSS Variables

- **Declaration**: Labels starting with `$` declare CSS variables (e.g., `$myVariable: blue` → `--my-variable: blue`), scoped to the component’s generated class.
- **Invocation**: Identifiers starting with `$` in values invoke variables (e.g., `color: $myVariable` → `color: var(--my-variable)`).
- **CamelCase Conversion**: Variable names are converted to dash-case.

```jsx
const Element = () => {
  $myVariable: blue;
  $myOtherVariable: red;
  color: $myVariable;
  backgroundColor: $myOtherVariable;
}
```
```css
.Element_cba {
  --my-variable: blue;
  --my-other-variable: red;
  color: var(--my-variable);
  background-color: var(--my-other-variable);
}
```

- **External Control with CSS Variables**
Expressive JSX’s CSS variables (prefixed with $) allow parent components to control the styles of child components’ elements dynamically.
```jsx
const Alert = () => {
  // Styling with pseudo-elements and CSS variables for external control
  $alertColor: currentColor;
  // Inherit parent's color

  if (":before") {
    content: '"⚠️"';
    color: $alertColor;
    // Inherits from parent's color or overridden variable
  }
}

const SpecialAlert = ({ children }) => {
  Alert: {
    color: 0x800000; // Maroon
    $alertColor: 0xffd700; // Gold
  }

  <Alert this>
    {children || "This is a special alert!"}
  </Alert>
}
```
**Output JSX**:
```jsx
const Alert = (props) => (
  <div {...props} className="Alert_cba">
    {props.children}
  </div>
);

const SpecialAlert = (props) => (
  <Alert
    {...props}
    className={classNames('SpecialAlert_cba', props.className)}
  >
    {props.children || "This is a special alert!"}
  </Alert>
);
```
**Output CSS**:
```css
.Alert_cba {
  --alert-color: currentColor;
}
.Alert_cba:before {
  content: "⚠️";
  color: var(--alert-color);
}
.SpecialAlert_cba {
  color: #800000;
  --alert-color: #ffd700;
}
```

### Conditional Styling

- **Prop-based Conditions**: Styles are applied based on props, generating unique class names.
- **Else Clause**: Specifies alternative styles when the condition is false.
- **Selector Conditions**: Conditions can apply to specific elements or attributes.

```jsx
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

**Output JSX**:
```jsx
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
```css
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

- **Syntax**: Use `if` statements with quoted pseudo-class/element names (e.g., `":hover"`, `":after"`).
- **Content Values**: Must be quoted strings (e.g., `content: "Hello";`).
- **Nesting**: Can be nested with other conditions.

```jsx
const Element = () => {
  color: red;

  if (":hover")
    color: blue;

  if (".active") {
    color: green;

    if (":after")
      content: '"!"';
  }

  <this>Hello</this>
}
```
```css
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

Expressive JSX provides shorthand properties via macros:

| Shorthand | CSS Output |                                      
|-----------|------------|
| `size: 500` | `width: 500px; height: 500px` |
| `radius: round` | `border-radius: 999px` |
| `absolute: fill` | `position: absolute; top: 0; right: 0; bottom: 0; left: 0` |
| `absolute: fill-bottom` | `position: absolute; bottom: 0; right: 0; left: 0` |
| `marginT: 10` | `margin-top: 10px` |
| `marginB: 10` | `margin-bottom: 10px` |
| `marginL: 10` | `margin-left: 10px` |
| `marginR: 10` | `margin-right: 10px` |
| `paddingT: 10` | `padding-top: 10px` |
| `paddingB: 10` | `padding-bottom: 10px` |
| `paddingL: 10` | `padding-left: 10px` |
| `paddingR: 10` | `padding-right: 10px` |
| `flexAlign: center, down` | `display: flex; justify-content: center; align-items: center; flex-direction: column` |
| `outline: red` | `outline: 1px dashed red` |
| `shadow: color, x, y, blur` | `box-shadow: x y blur color` |
| `transition: "property duration timing delay"` | `transition: property duration timing delay` |
| `border: style, width, color` | `border: style color width` |

```jsx
const Element = () => {
  size: 500;
  radius: round;
  absolute: fill-bottom;
  marginT: 10;
  flexAlign: center, down;
  outline: red;
  shadow: "rgba(0, 0, 0, 0.4)", 3, 0, 1;
  transition: "background-color 0.2s ease 0s";
  border: dashed, 2, blue;
}
```
```css
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
  box-shadow: 3px 0 1px rgba(0, 0, 0, 0.4);
  transition: background-color 0.2s ease 0s;
  border: dashed blue 2px;
}
```

### Color Values

- **Hex Colors**: Use `0x` prefix (e.g., `0xff0000` → `#ff0000`).
- **RGBA**: Hex with alpha (e.g., `0x00ff0022` → `rgba(0, 255, 0, 0.133)`).

```jsx
const Element = () => {
  color: 0xff0000;
  background: 0x00ff0022;
  <this />
}
```
```css
.Element_cba {
  color: #ff0000;
  background: rgba(0, 255, 0, 0.133);
}
```

### Complex Style Values

- **Transformations**: Comma-separated sequences (e.g., `transform: translateX(10), rotate(90), scale(2)`).
- **Inline Styles**: Supported for dynamic values via `style` prop.
  ```jsx
  const Component = ({ offset }) => {
    color: red;
    <this style={{ "--offset": `${offset}px` }} />
  }
  ```

```jsx
const Element = () => {
  transform: translateX(10), rotate(90), scale(2);
  content: '"Hello"';
  <this />
}
```
```css
.Element_cba {
  transform: translateX(10) rotate(90) scale(2);
  content: "Hello";
}
```

### Macros

- **Built-in Macros**: Handle shorthands like `border`, `radius`, `flexAlign`, `absolute`, `outline`, `shadow`.
- **Custom Macros**: Functions that transform style values.

```jsx
function foo(value) {
  return { foo: value + "Baz" };
}

const Element = () => {
  foo: "bar";
  outline: red;
}
```
```css
.Element_cba {
  foo: barBaz;
  outline: 1px dashed red;
}
```

**Babel Config**:
```javascript
{
  plugins: [
    ['@expressive/babel-plugin-jsx', { macros: [{ foo }] }]
  ]
}
```

<br />

## Output Structure

- **Class Names**: Unique names like `<ComponentName>_<hash>` (e.g., `Component_26k`) or `<selector>_<hash>` (e.g., `div_abc`). Conditional styles use suffixes like `active_abc`.
- **Scoping**: Styles are scoped to components via CSS Modules or unique class names.

```jsx
const Button = () => {
  color: blue;

  if (":hover")
    color: red;
}
```
```css
.Button_cba {
  color: blue;
}
.Button_cba:hover {
  color: red;
}
```

<br />

## Testing and Validation

Expressive JSX includes a comprehensive test suite (e.g., using Vitest) to validate transformations, ensuring reliable compilation of styles, selectors, and JSX output. Tests cover features like conditionals, macros, pseudo-classes, and prop forwarding.

<br />

## Limitations

- **TSX Files**: Styles are not supported in `.tsx` files, though JSDoc in `.jsx` provides TypeScript support.
- **Advanced CSS**: `@media` queries and keyframe animations are not supported.
- **Bracketless `if` Syntax**: Syntax like `div: if(active) color: red;` is not supported.
- **Class Name Recycling**: Styles for the same selector under different conditions generate separate classes (no recycling).
- **Ternary Operators**: Ternary operators are not supported for conditional styles.
```jsx
const Element = () => {
  color: red;
  // This is not supported
  background: active ? blue : grey;
  <this />
}
```

<br />

## Roadmap

- **Class Name Recycling**: Explore reusing class names for the same selector under different conditions for efficiency.
- **Advanced CSS Support**: Add support for `@media` queries and animations.
- **Runtime Styles**: Enable dynamic style concatenation at runtime.