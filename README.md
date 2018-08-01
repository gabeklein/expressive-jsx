<h1 align="center">Expressive-React</h1>

<h4 align="center">
    A babel build system that introduces a new syntax<br/>for writing clean, meaningful, <i>expressive</i> React markup.
</h4>


<br/> 

> This Readme (for now) will mostly serve as a pitch,<br/> explaining what
> this project does, and why it might be for you. 
> 
> *If you want to learn how how this works or how to use it, [consult the wiki](https://github.com/gabeklein/expressive-react/wiki).*
<br />

# XJS

If you develop with React, chances are you know JSX, its de-facto language so to speak. Expressive, or **XJS** for short, is an alternative syntax. It aims to let React developers write their components and apps in a more readable and elegant way.

XJS is able to outstrip the feature set of JSX by taking what is a factory approach, as-well as relying on a deep build-time process. Instead of simply transforming markup into a tree of `createElement` calls, it will construct and output a [factory](https://en.wikipedia.org/wiki/Factory_(object-oriented_programming)) which assembles  component-objects consumed by react. Among other things, this causes a developer to not need to write much of the logic they'd use to make anything beyond dead simple. Instead it allows you to easily [and dryly](https://en.wikipedia.org/wiki/Don't_repeat_yourself) declare anything from simple to the most complex of elements.

>  Think of it like this: Where JSX is a markup language, Expressive is more like a script.

<h4>Expressive-React provides, for-starters, these benefits:</h4>

* you don't need closing tags
* you don't need to `{}` escape data or props
* uses actual `if` and `for` statements for conditionals and iteration
* automatically imports `React`
* implicitly `extends Component` for obviously-component classes

**And particularly, it attempts to solve the long standing problem of style with**

&nbsp;&nbsp;⚡️🔥&nbsp; first-class support for styles <br />
&nbsp;&nbsp;&nbsp; integrated composition system using a 'modfier' concept

<h4>And for those looking for gotchas, here are a few assurances</h4>

* XJS is not its own file format, similarly to JSX, it merely extends javascript
* there are no build requirements besides babel, which you already have
* usage only requires you add your preferred preset to `.babelrc`
* XJS works fine alongside JSX, in same project, even the same files
* when added, it will not break existing react/javascript code of your project
* XJS has full feature parity with JSX and then some

<br />

# Getting Started

Documenting Expressive's capabilities is an ongoing process but:

[Check out the wiki](https://github.com/gabeklein/expressive-react/wiki) to get a feel for XJS as a language. <br />
Or jump right into [comparing it against JSX](https://github.com/gabeklein/expressive-react/wiki/The-basics-(by-comparison)).

<br />

# Install

The easiest way to add Expressive to your project is to use one of the plugins. There is one for each of the most common environments.
* React  `babel-preset-web`
* NextJS `babel-preset-next`
* Native `babel-preset-native`

<br />

### React.js / NEXT.js

> Pick version for your environment.

```bash
npm install @expressive-react/preset-*
```

**.babelrc**
> Add `web` *or* `next`  to your babel presets, keep `preset-react` if you want JSX to still work (recommended) <br/>
> Note that babel infers `babel-preset` so you *should* exclude that 
```
{
    "presets": [
    	"@babel/preset-env",
    	"@babel/preset-react",
        "@expressive-react/web"
    ]
}
```
**index.js**
>**`@expressive-react/style` is a peer dependancy.**<br/>
<br/>Unless you use no styles, you should import it and set its default as your root (of those elements styled), otherwise exceptions will be thrown.
>
>Use `["expressive-*", { styleMode: "inline" }]` if you wish to disable run-time style collation. Expressive will instead insert all styles in-line per element, and `StyledApp` wrapper will not be required. 
 

```js
import StyledApp from "@expressive-react/style";

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
npm install @expressive-react/babel-preset-native
```

**.babelrc**
> **Must replace** `react-native` with `@expressive-react/native` <br/>
> You may also remove `babel-preset-react-native` from dependancies <br/>
> Note that babel infers `babel-preset` even for *@org* packages
```
{
    "presets": [
        "@expressive-react/native"
    ]
}
```

**index.js**
```js
import { AppRegistry } from 'react-native';

class App {
	App(){
      view, do {
        text `Hello World`
      }
    }
}

AppRegistry.registerComponent('Expressive', () => App);

```

<br/>

# Contributing and Conversation

I made a [Slack](https://join.slack.com/t/expressive-react/shared_invite/enQtMzc3NDkyMTAzNzMwLWE2NGIyMmExMzVkZWEyNTBhOTkwNGViMjcwNzM3Yzk5YWM1ZDhlNjEzMDRlNDkzNjcyODI3NDcyNmUwNmViZjU) group if anyone wants to chat. 🙂 

<br/>
<br/>

