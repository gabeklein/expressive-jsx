<h1 align="center">babel-plugin-transform-expressive-loops</h1>

<h4 align="center">
  Babel plugin to transform enhanced <code style="font-weight:100">for-in</code> and <code>for-of</code> loops.<br/>Comes with added bindings for more terse yet powerful for statements.
</h4>

# Install

```
npm install babel-plugin-transform-expressive-loops
```

**.babelrc**

```
{
    "plugins": [
        "transform-expressive-loops"
    ]
}
```
<br/>

## What does this plugin do?

> This plugin allows for the convenient binding of variables commonly associated with iterator loops. For instance, if one wishes to bind the `index`, `item`, or a `{property}` in a single statement, they may do so with this transform.

## How does it do that?
> This plugin leverages the [binary `in` opperator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in) (e.g. `prop in object`) in addition to the one already in standard `for(x in y)` (or `of`) statements. <br/><br/> *This plugin won't affect for-statements not clearly using mechanics shown below, given that, it's quite safe. While the used syntax is technically legal in plain ECMAScript, it is otherwise inert or will lead to run-time errors, so there is no risk of collision† or conflation in natural code.*
<br/>

# Syntax

*The first keyword determines type, `in` or `of`, all subsequent keywords are `in`.*

### For-In
<pre>
<b>for ( </b><i>key</i><b> in </b><i>object</i><b> ) </b><i>statement</i>;

<b>for ( </b><i>item</i><b> in </b><i>key</i><b> in </b><i>object</i><b> ) </b><i>statement</i>;
<b>for ( { </b><i>item_prop</i><b> } in </b><i>key</i><b> in </b><i>object</i><b> ) </b><i>statement</i>;
<b>for ( { </b><i>item_prop</i><b> } in </b><i>item</i><b> in </b><i>key</i><b> in </b><i>object</i><b>) </b><i>statement</i>;
</pre>`

### For-Of
<pre>
<b>for ( </b><i>item</i><b> of </b><I>iterable</i><b> ) </b><i>statement</i>;
<b>for ( </b><i>{ item_prop }</i><b> of </b><i>iterable</i><b> ) </b><i>statement</i>;

<b>for ( </b><i>item</i><b> of </b><i>index</i><b> of </b><i>iterable</i><b> ) </b><i>statement</i>;
<b>for ( { </b><i>item_prop</i><b> } of </b><i>index</i><b> in </b><i>iterable</i><b> ) </b><i>statement</i>;
<b>for ( { </b><i>item_prop</i><b> } of </b><i>item</i><b> in </b><i>index</i><b> in </b><I>iterable</i><b>) </b><i>statement</I>;

<b>for ( </b><i>comma_delimited_word</i><b> of </b><i>List</i><b> : StringLiteral ) </b><i>statement</i>;
<b>for ( </b><I>number</i><b> of </b><i>Repetitions</i><b> : IntegerLiteral ) </b><i>statement</i>;
</pre>`

<br/>

# Examples

#### For-In Loops
```js
for(item in key in object){
    object[key] === item;
    //true
}

for({item_prop} in object){
    item_prop === object[_key];
    //true, if _key was available, which it isn't.
}

for({foo, bar} in item in key in object){
    item === object[key];
    foo === item.foo;
    bar === item.bar;
    //true
}
```

#### For-Of Loops
```js
for(item of index in iterable){
    item === iterable[index]
    //true
}

for({foo, bar} of item in index in iterable){
    item === iterable[index];
    foo === item.foo;
    bar === item.bar;
    //true
}

```

### Convenience Features (Experimental!)
_keep in mind, this only works for **literal** strings and numbers_
```js
for(item of i in "foo, bar, baz"){

    const equivalentTo = `foo, bar, baz`.split(", ");
    //Note: The split is done at compile time for StringLiteral, otherwise
    //      a split call is returned, for template expressions, as seen here.
    item === equivalentTo[i]
    //true
}

for(number of 3){
    console.log(number)
    // 0
    // 1
    // 2
}

```

<br/>

## License

[MIT License](http://opensource.org/licenses/MIT)