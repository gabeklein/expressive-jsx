<h1 align="center">Expressive-React</h1>

<h4 align="center">
    A babel build system that introduces a new syntax<br/>for writing clean, meaningful, <i>expressive</i> React markup.
</h4>



> Because this is a start-up project pushing a different paradigm,
> this Readme (for now) will be mostly serve as a pitch, explaining what
> this project does, and why it might be for you. 
> 
> *If you want to learn **how** to use the library, [consult the wiki](https://github.com/gabeklein/expressive-react/wiki).*
<br />

# XJS

If you use React, chances are you're pretty familiar with JSX, its de-facto language so to speak. Expressive, or **XJS** for short, is an alternative syntax, which aims to let React developers write their components and apps in a more readable and far more elegant way.

Generally, XJS is able to vastly outstrip the feature set of JSX by taking a factory approach, as well as relying on a deep build-time process. Instead of simply converting markup into a pyramid of `createElement` calls, it will construct and output a [factory](https://en.wikipedia.org/wiki/Factory_(object-oriented_programming)) which assembles element trees consumed by react. This makes it so a developer doesn't need to manage common logic patterns themselves, but instead easily [and dryly](https://en.wikipedia.org/wiki/Don't_repeat_yourself) declare anything from simple to the most complex of elements.

>  Think of it like this: Where JSX is a markup language, Expressive is more like a script.

<h4>Expressive-React provides, for-starters, these benefits:</h4>

* you don't need closing tags
* you don't need to `{}` escape data or props
* uses actual `if` and `for` statements for conditionals and iteration
* automatically imports `React`
* implicitly `extends Component` for obviously-component classes

**And particularly, it attempts to solve the long standing problem of style with**

&nbsp;&nbsp;🔥&nbsp; first-class support for styles <br />
&nbsp;&nbsp;⚡️&nbsp; integrated composition system of "modfiiers"

<h4>And for those looking for gotchas, here are a few assurances</h4>

* XJS is not its own file format, similarly to JSX, it merely extends javascript
* there are no build requirements besides babel, which you already have
* usage only requires you add your preferred preset to `.babelrc`
* XJS works fine alongside JSX, in same project, even the same files
* when added, it will not break existing react/javascript code of your project
* XJS has full feature parity with JSX and then some

<br />

## So what does it actually look like?

Documenting Expressive's capabilities is an ongoing process but:

[Check out the wiki](https://github.com/gabeklein/expressive-react/wiki) to get a feel for XJS as a language. <br />
Or jump right into [comparing it against JSX](https://github.com/gabeklein/expressive-react/wiki/The-basics-(by-comparison)).

<br />

# Install and Getting Started

The easiest way to add Expressive to your project is to use one of the plugins. There is one for each of the most common environments.
* React  `babel-preset-expressive-react`
* NextJS `babel-preset-expressive-react-next`
* Native `babel-preset-expressive-react-native`

<br />
### React.js / NEXT.js

> Replace `*` with your intended version.

```bash
npm install babel-preset-expressive-*
```

**.babelrc**
> Add `expressive-react` to your babel presets, keep `react` if you intend to use JSX
```
{
    "presets": [
    	["env", { ... }],
    	"react",
        "expressive-*"
    ]
}
```
**index.js**
>Unless disabled, `expressive-react-style` must be installed with `default`
<br/>as the root (of any styled elements), otherwise exceptions will be thrown.
>
>Use `["expressive-*", { styleMode: "inline" }]` if you wish to disable run-time style collation. Expressive will instead insert all styles in-line per element, and `StyledApp` wrapper will not be required. 
 

```js
import StyledApp from "expressive-react-style";

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
npm install babel-preset-expressive-react-native
```

**.babelrc**
> Replace preset `react-native` with `expressive-react-native`.
```
{
    "presets": [
        "expressive-react-native"
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

