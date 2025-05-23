import { expect, it } from 'vitest';

import { bundle } from './adapter';

it("will do", async () => {
  const files = await bundle(`  
    export const Hello = () => {
      color: red;
      
      <this>Hello!</this>
    };

    Hello();
  `);

  expect(files).toMatchInlineSnapshot(`
    /** assets/index-WTvIwzMV.css **/
    .Hello_2cs {
      color: red;
    }

    /** assets/index-BFVxwYF_.js **/
    import "vite/modulepreload-polyfill";
    import { classNames as l } from "@expressive/babel-preset/polyfill";
    const a = e => React.createElement("div", {
      ...e,
      className: l(e.className, "Hello_2cs")
    }, "Hello!");
    a();
  `);
})

it("will import polyfill", async () => {
  const files = await bundle(`  
    export const Hello = () => {
      color: red;

      also: {
        background: blue;
      }
      
      <this also>
        Hello!
      </this>
    };

    Hello();
  `);

  expect(files).toMatchInlineSnapshot(`
    /** assets/index-_9M7wfUX.css **/
    .Hello_2cs {
      color: red;
    }
    .also_i3c {
      background: #00f;
    }

    /** assets/index-RoLOAnTL.js **/
    import "vite/modulepreload-polyfill";
    import { classNames as l } from "@expressive/babel-preset/polyfill";
    const a = e => React.createElement("div", {
      ...e,
      className: l(e.className, "Hello_2cs also_i3c")
    }, "Hello!");
    a();
  `);
})