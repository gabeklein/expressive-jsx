# babel-plugin-transform-react-xjs

> Babel plugin for transforming `do{ }` statements into [React](https://github.com/facebook/react) compatable markup. Most comperable to [babel-plugin-transform-react-jsx](https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-react-jsx), simply furnishing a different paradigm. May be used along size JSX and it's respective babel-plugins, or used as a feature-complete replacement, depending on your needs.

<br/>

# Install

```
npm install babel-preset-expressive-react
```

**.babelrc**

```
{
    "plugins": [
        "expressive-react"
    ]
}
```

<br/>

# Entry Points

> _[babel-plugin-transform-expressive-react](#babel-plugin-transform-expressive-react) will enter context upon encountering the DoExpression e.g. `do{}` in various contexts. It will also do so for any method with the name __"do"__ e.g. `do(){}`_ <br/><br/> For more information on actual syntax, consult the [main repo](https://github.com/gabeklein/expressive-react).


#### Element Expressions
```js
let element = do {
    div();
}

//equivalent to in JSX

let element = (
    <div></div>
)

//outputs

let element = React.createElement("div", {})
```

#### Arrow Components
```js
let SayHi = ({ to }) => do {
    div `Hello ${ to }`;
}

//equivalent to in JSX

let SayHi = (props) => (
    <div>Hello {props.to}</div>
)

//outputs

let SayHi = function(props) {
    return React.createElement("div", {}, "Hello " + props.to)
}
```

#### Do Component Method
```js
class Greet extends React.Component {
    do(props){
        SayHi(to `World`)
    }
}

//equivalent to in JSX

class Greet extends React.Component {
    render(){
        var { props } = this;
        return (
            <SayHi to="World" />
        )
    }
}
```

<br/>

## Disclaimer

<i>This plugin <b>will conflict</b> with [babel-plugin-do-expressions](https://babeljs.io/docs/plugins/transform-do-expressions/). 
Make sure your project is not using it or the following presets as they do inherit this plugin.</i>
 - [stage-0](https://babeljs.io/docs/plugins/preset-stage-0/)
 - [react-native-stage-0](https://github.com/skevy/babel-preset-react-native-stage-0)

<br/>

## License

[MIT License](http://opensource.org/licenses/MIT)