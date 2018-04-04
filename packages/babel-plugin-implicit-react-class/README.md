# infer-react-class

> Automatically extends classes with `React.Component` that contain a render method.

## Install

```sh
npm install --save-dev babel-plugin-implicit-react-class
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