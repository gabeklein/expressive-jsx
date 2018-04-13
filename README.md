
  
<h1 align="center">Expressive-React</h1>

<h4 align="center">
    A babel build system that introduce a new syntax<br/>for writing clean, meaningful, <i>expressive</i> React markup.
</h4>



> Because this is an up-start project which pention for paradigm shift,
> this Readme (for now) will be mostly serve as a pitch, to explain what
> exactly this project is for and why it might be for you. 
> 
> *If you want to learn **how** to use the library, consult the wiki.*

## So what exactly is all this?

If you're familar with React then you're probably well aquainted with JSX, the de-facto language used to generate the ES5 code that the `React` uses at run-time to generate visual elements in DOM, native, NEXT.js or what have you. To achieve this JSX will use [babel-preset-react](https://babeljs.io/docs/plugins/preset-react/), a suite of babel plugins you're probably already using right now.

Expressive-React is an alternative to JSX, in this respect, which aims to let React developers write their components and apps in a more readable and terse way. 

More aptly this is a syntax for a more **expressive** way to write React apps. 

>  Think of it like this: JSX is markup. Expressive is more like a script.

**To save you time and reiteration, expressive provides, for-starters, these benefits:**

>  • you don't need closing tags **ever**.
>  • you don't need to `{}` escape data or props
>  • uses actual `if` and `for` statements for conditionals and iteration
>  • automatic import / require `React`
>  • implicit `Component` for component classes (extends not necessary)
>  • first-class support for styling
>  • integrated composition and mix-in support for those styles

**For those looking for a catch, here are a few assurances about expressive-react:**

>  • there are no build requirements besides babel, which you already have
>  • you can install it simply by including your preferred preset in `.babelrc`
>  • this may work alongside JSX, just as well as completely replace it
>  • expressive has full feature parity with JSX and then some
>  • it will not break existing react/javascript code in your existing project

## OK so what does it actually look like?

## Install

```
npm install babel-preset-expressive-react
```

**.babelrc**

```
{
    "presets": [
        "expressive-react"
    ]
}
```
<br/>