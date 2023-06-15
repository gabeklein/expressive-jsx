<h1 align="center">Expressive</h1>

<h4 align="center">
    Another language, much the like of JSX, which introduces a new syntax<br/>for writing cleaner, more meaningful markup defining UI's, currently for React.
</h4>


If you develop with React, chances are you know JSX, its de-facto language so to speak. Expressive, extends JSX to add first-class styles and ES6 idioms to normal markup. It aims to let React developers write their components and apps in a more elegant way. It too generates code used by the react runtime, however it also adds useful features at the language level which can optimize how we make our components.

<h4>Expressive-React provides, for-starters, these benefits:</h4>

* first class styles
* you don't need closing tags
* you don't need to `{}` escape data or props
* uses actual `if` and `for` statements for conditionals and iteration
* automatically includes runtime imports

XJS is able to outstrip the feature set of JSX by taking what is a factory approach, as-well as relying on a deep build-time process. Instead of simply transforming markup into a tree of `createElement` calls, it will construct and output a [factory](https://en.wikipedia.org/wiki/Factory_(object-oriented_programming)) which assembles  component-objects consumed by react. Among other things, this causes a developer to not need to write much of the logic they'd use to make anything beyond dead simple. Instead it allows you to easily [and dryly](https://en.wikipedia.org/wiki/Don't_repeat_yourself) declare anything from simple to the most complex of elements.

>  Think of it like this: Where JSX is a markup language, XJS treats your components like a script.

# Install

The easiest way to add Expressive to your project is to use one of the plugins. There is one for each of the most common environments.
* React  `@expressive/babel-preset-react`
* Native `@expressive/babel-preset-react-native`

<br />

### React.js / NEXT.js

> Pick version for your environment.

```bash
yarn install @expressive/babel-preset-react
```

**.babelrc**
> Add `web` *or* `next`  to your babel presets, keep `preset-react` if you want JSX to still work (recommended) <br/>
> Note that babel infers `babel-preset` so you *should* exclude that 
```
{
    "presets": [
    	"@babel/preset-env",
    	"@babel/preset-react",
        "@expressive/react"
    ]
}
```

>`@expressive/react` in babel-presets is *NOT* to be confused with package `@expressive/react`

**index.js**
>**`@expressive/react` is a peer dependancy.**<br/>
<br/>In most cases without it, exceptions will be thrown.
 

```js
import StyledApp from '@expressive/react';

export default () => do { 
  StyledApp() >> App()
}

const App = () => do {
  span, do {
    color: "blue";
    font: "20px";

    "Hello World!"
  }
}

```
<br/>

### React Native

```bash
yarn install @expressive/babel-preset-react-native
```

**.babelrc**
> **Must replace** `react-native` with `@expressive-react/native` <br/>
> You may also remove `babel-preset-react-native` from dependancies <br/>
> Note that babel infers `babel-preset` even for *@org* packages
```
{
    "presets": [
        "@expressive/react-native"
    ]
}
```

**index.js**
```js
import { AppRegistry } from 'react-native';

const App = () => do {
  //view, text are lower-case here given that View, and Text are inferred automatically.

  view >> text `Hello World`;
}

AppRegistry.registerComponent('Expressive', () => App);

```

<br/>

## How does Expressive stack up against JSX?

### Hello World
```js
//named template, shorthand for element with innerText
//optimized automatically if no expressions are present, so use it anywhere

var Hello = () => do {
  span `Hello Expressive`;
}
```
```jsx
var Hello = () => (
  <span>Hello World</span>
)
```


### Hello Somebody
```js
//left hand side of `>` is non-parsed simple child of element.
//Anything (syntax-wise) can go there: variables, maths, calls, etc.
//Expects to evaluate to a String or React.Element

var Hello = ({ name }) => do {
  span `Hello`;
  br;
  span > name;
}
```
```jsx
var Hello = ({ name }) => (
  <span>Hello</span>
  <br/>
  <span>{name}</span>
)
```


### What about children?
```js
//each `do{}` represents a new context within the element
//it's affixed to, similar to a function body.

var WithKids = () => do {
  Parent, do {
    Child; 
    GrandChild, do {
      AwesomeGrandChild;
    };
  }
}
```
```jsx
var WithKids = () => (
  <Parent>
    <Child/>
    <GrandChild>
      <GreatGrandChild/>
    </GrandChild>
  </Parent>
)
```

### Let's see props
```js
//this doesn't actually set any variables
//name = value as an argument works pretty straight forward
//named template, also shorthand for text props (when an argument)

var WithProps = ({ baz }) => do {
  SomeComponent(
    foo = "bar",
    bar = baz,
    baz `foo`
  );
}
```
```jsx
var WithProps = ({ baz }) => (
  <SomeComponent 
    foo = "bar" 
    bar = {baz}
    baz = "foo"
  />
)
```

### Nested Elements (elements wrapping only one child)
```js
//right-hand side of `>>` is parsed element-child of left-hand

var DeeplyNested = ({ baz, prop }) => do {
  Parent(
    some `prop`, 
    another = prop
  )
  >> Child(foo `bar`)
  >> GrandChild(bar = baz)
  >> GreatGrandChild 
  >> ExcellentGrandChild `Actually that wasn't so hard.`
}
```
```jsx
var DeeplyNested = ({ baz, prop }) => (
  <Parent 
    some = "prop", 
    another = { prop }>
    <Child foo = "bar">
      <GrandChild bar = {baz}>
        <GreatGrandChild>
          <ExcellentGrandChild>When will it end??</ExcellentGrandChild>
        </GreatGrandChild>
      </GrandChild>
    </Child>
  </Parent>
)
```


### Spread Props, Truthy Props, and even Object-style inclusions
```js
// you may also indent, format nested elements as you prefer.

var WithPassThroughProps = ({ foo, ...rest }) => do {
  SomeComponent({ isSpecial, ...rest }) >>
    AnotherComponent(
      { foo }, 
      bar `baz`, 
      baz = 3
    )
}
```

```jsx
//isSpecial = "true"

var WithPassThroughProps = ({ foo, ...rest }) => (
  <SomeComponent isSpecial { ...rest } />
    <AnotherComponent 
      foo = {foo} 
      bar = "baz" 
      baz = {3} />
  </SomeComponent>
)
```

### What about children *and* props?
```js
//props and children can exist in same space
//assignments are props. Calls, strings, and sequences are elements.

var WithBoth = ({ baz, ipsum }) => do {
  SomeComponent, do {
    lorem = ipsum;
    something = "else";

    Child1 `Hello`,
      foo `bar`;
    Child2 `World`,
      bar = baz;
  }
}
```
```jsx
var WithBoth = ({ baz, ipsum }) => (
  <SomeComponent
    lorem = { ipsum }
    something = "else">
    <Child1 foo = "bar">Hello</Child1>
    <Child2 bar = {baz}>World</Child2>
  </SomeComponent>
)
```

### Conditional components
```js
//automatically provides false if untrue without alternate clause
//bracketed can insert a fragment with any number of elements

var Conditional = ({ shouldShow, showFirstNotSecond }) => do {
  SomeComponent, do {
  
    some = "thing"

    if(shouldShow)
      InnerComponent `Hey Whatsup`;

    if(showFirstNotSecond)
      TheFirstOne `Hey I'm the first one`;
    else {
      TheSecondOne `I'm actually the second one`;
      BonusElement `And why not bring a friend since it's so easy 💪`;
    }
  }
}
```
```jsx
var Conditional = ({ shouldShow, showFirstNotSecond }) => (
  <SomeComponent some = "prop">
    {shouldShow &&  
      (<InnerComponent>Hey Whatsup</InnerComponent>)
    }
    {showFirstNotSecond
      ? (<TheFirstOne>Hey Im the first one</TheFirstOne>) 
      : (<TheSecondOne>Im actually the second one</TheSecondOne>)
    }
  </SomeComponent>
)
```

### Iterated Components from an Array

```js
const names = ["Bob", "Rick", "Mike", "Joe"];
```
```js
var Loop = () => do {
  SomeComponent, do {
    for(const name of names)
      div `Hello ${name} nice to meet you!`
  }
}
```
```jsx
var Loop = () => (
  <SomeComponent>
    {names.map((name) => (
      <div>Hello {name} nice to meet you!</div>
    ))}
  </SomeComponent>
)
```

### But wait, Theres more!
That's it for simple comparisons! Further features can't even be replicated in stateless JSX. Check out next page for more things that expressive can do which JSX outright cannot.

# Contributing and Conversation

I made a [Slack](https://join.slack.com/t/expressive-react/shared_invite/enQtMzc3NDkyMTAzNzMwLWE2NGIyMmExMzVkZWEyNTBhOTkwNGViMjcwNzM3Yzk5YWM1ZDhlNjEzMDRlNDkzNjcyODI3NDcyNmUwNmViZjU) group if anyone wants to chat. 🙂 

<br/>
<br/>

