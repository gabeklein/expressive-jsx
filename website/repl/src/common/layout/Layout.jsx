import { Provider } from "@expressive/react";
import { Layout as Control } from "./Control";
import { forwardRef } from "react";

export const Layout = (props) => {
  const {
    is: control,
    output,
    container
  } = Control.use(props);

  grid: {
    display: grid;
  }

  <Provider for={control}>
    <grid ref={container}>
      {output}
    </grid>
  </Provider>
}

export const Row = () => {
  <Layout this separator={Handle} row />
}

export const Column = () => {
  <Layout this separator={Handle} />
}

export { Column as Col };

const Handle = ({ grab, pull, push, vertical, width }) => {
  position: relative;

  bar: {
    position: absolute;
    radius: round;
    transition: "background 0.1s ease-out";
  }

  if(":hover")
    bar: {
      bg: $accentLight;
    }

  if(vertical){
    cursor: "col-resize";
    bar: {
      top: 10;
      bottom: 10;
      right: 3;
      left: 3;
    }
  }
  else {
    cursor: "row-resize";
    bar: {
      top: 3;
      bottom: 3;
      right: 10;
      left: 10;
    }
  }
  
  <this onMouseDown={grab}>
    <bar />
    <Corner onMouseDown={pull} style={{ left: -width, top: 0 }} />
    <Corner onMouseDown={push} style={{ right: -width, bottom: 0 }} />
  </this>
}

const Corner = (props) => {
  position: absolute;
  cursor: move;
  radius: round;
  size: 9;
  borderColor: transparent;
  borderStyle: solid;
  zIndex: 10;

  if(":hover")
    borderColor: $accentLight;

  if(!props.onMouseDown)
    return null;
  
  <this />
}