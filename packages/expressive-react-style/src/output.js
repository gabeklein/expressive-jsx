
import { Component, createElement, Fragment } from "react";

class StyledOutput extends Component {

    componentWillMount(){
        this.props.compiler.outputElement = this;
    }

    render(){
        return createElement("style", {
            jsx: "true",
            global: "true",
            dangerouslySetInnerHTML: {
                __html: this.props.compiler.generate()
            }
        })
    }
}

console.log(`env is ${process.env.NODE_ENV || "foobar"}`)

//TODO: take a look at if this is even doing anything useful
export default
    process.env.NODE_ENV !== "production"
        ? require("react-hot-loader").hot(module)(StyledOutput)
        : StyledOutput