# babel-plugin-auto-extends

> Automatically extends classes with `React.Component` that contain a render method.

## Install

```sh
npm install --save-dev @expressive-react/babel-plugin-auto-extends
```

**.babelrc**

> Note that babel infers `babel-plugin`

```
{
    "plugins": [
        "@expressive-react/auto-extends"
    ]
}
```

### Before

```js
import React from "react";

class FooBar {
    render(){
        return (
            <div>Hello World!</div>
        )
    }
}
``````

### After

```js
import React from "react";

class FooBar extends React.Component {
    render(){
        return (
            <div>Hello World!</div>
        )
    }
}
```

#### Override

If you do not want to extend `Component` simply extending any other class will work. Classes extending `undefined` explicitely will not `extend` anything even if they would otherwise trigger the transform.