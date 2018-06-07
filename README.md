<h1 align="center">Expressive-React</h1>

<h4 align="center">
    A babel build system that introduce a new syntax<br/>for writing clean, meaningful, <i>expressive</i> React markup.
</h4>



> Because this is an up-start project which pention for paradigm shift,
> this Readme (for now) will be mostly serve as a pitch, to explain what
> exactly this project is for and why it might be for you. 
> 
> *If you want to learn **how** to use the library, consult the wiki.*
<br />

## So what exactly is all this?

If you're familar with React then you're probably well aquainted with JSX, the de-facto language used to generate the ES5 code which the `React` runtime uses to generate visual elements in DOM, Native, NEXT.js or what have you. To achieve this, JSX will use [babel-preset-react](https://babeljs.io/docs/plugins/preset-react/), a suite of babel plugins you're probably already using right now.

Expressive-React is an alternative to JSX, in this respect, which aims to let React developers write their components and apps in a more readable and far more elegant way. 

More aptly this is a [DSL (Domain Specific Language)](https://en.wikipedia.org/wiki/Domain-specific_language) to code in, for your React apps. 

>  Think of it like this: Where JSX is a markup, Expressive is more like a script.

### Expressive-React provides, for-starters, these benefits:

* you don't need closing tags
* you don't need to `{}` escape data or props
* uses actual `if` and `for` statements for conditionals and iteration
* automatically imports `React`
* implicit `extends Component` for obviously-component classes

**And a whole subject matter unto itself**

&nbsp;&nbsp;🔥&nbsp; first-class support for styles <br />
&nbsp;&nbsp;🚨&nbsp; dedicated composition system (like sass) for said styles

### For those looking for gotchas, here are a few assurances about expressive-react:

* there are no build requirements besides babel, which you already have
* you only need to include your preferred preset in `.babelrc`
* expressive works fine alongside JSX, just as well as completely replace it
* it will not break existing react/javascript code when introduced to your project
* full feature parity with JSX and then some

<br />

## OK so what does it actually look like?

[Check out the wiki](https://github.com/gabeklein/expressive-react/wiki) to get a feel for expressive as a language.

Or jump right into [comparing it against JSX](https://github.com/gabeklein/expressive-react/wiki/The-basics-(by-comparison)).

<br />

## Install and Getting Started

The easiest way to add Expressive to your project is to use one of the plugins. There is one for each of the most common environments.
* React  `babel-preset-expressive-react`
* Native `babel-preset-expressive-react-native`
* NextJS `babel-preset-expressive-react-next`
<br/>

### For React Native

```bash
npm install babel-preset-expressive-react
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
<br/>

### For NEXT.js

Expressive uses `expressive-react-style` as a runtime dependency by default. However this is optional.

```bash
npm install babel-preset-expressive-react-next expressive-react-style
```

**.babelrc**
```
{
    "presets": [
        "expressive-react-next"
    ]
}
```

**pages/index.js**
```js
import StyledApp from "expressive-react-style";

export default () => do { 
  StyledApp() >> App()
}

class App {
  do(){
    /* your app */
  }
}

```

<br/>

## Contributing and Conversation

I made a [Slack](https://join.slack.com/t/expressive-react/shared_invite/enQtMzc3NDkyMTAzNzMwLWE2NGIyMmExMzVkZWEyNTBhOTkwNGViMjcwNzM3Yzk5YWM1ZDhlNjEzMDRlNDkzNjcyODI3NDcyNmUwNmViZjU) group if anyone wants to chat. 🙂
