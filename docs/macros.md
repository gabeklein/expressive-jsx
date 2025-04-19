# Expressive JSX Default Macros

Expressive JSX provides a set of built-in macro functions that transform concise style inputs into standard CSS properties. These macros enable shorthand syntax for common styling patterns, such as positioning, margins, and colors. Below is a compact reference of each default macro, including its purpose, input parameters, and resulting CSS output.

## Macro Reference

| Macro Name | Purpose | Input Parameters | CSS Output | Example Input | Example Output |
|------------|---------|------------------|------------|---------------|----------------|
| `absolute` | Sets absolute positioning with optional offsets or fill modes. | `mode: string \| number, top?: number, right?: number, bottom?: number, left?: number` | `position: absolute; top: <value>; right: <value>; bottom: <value>; left: <value>` | `absolute: fill-bottom` | `position: absolute; bottom: 0; right: 0; left: 0;` |
| `aspectSize` | Sets width and height with aspect ratio support. | `width: number, height?: number \| string, unit?: string` | `width: <value><unit>; height: <value><unit>` | `aspectSize: 100, 0.5` | `width: 100px; height: 50px;` |
| `background` (alias: `bg`) | Sets background properties, including colors or RGB/HSLA. | `value: string \| array` | `background: <value>` or `background-color: <value>` | `background: rgb, 255, 0, 0` | `background-color: rgb(255,0,0);` |
| `backgroundImage` | Sets background image from URL or file path. | `url: string` | `background-image: url(<value>)` | `backgroundImage: "./image.png"` | `background-image: url(require("./image.png"));` |
| `backgroundSize` | Sets background size. | `value: number \| string, unit?: string` | `background-size: <value><unit>` | `backgroundSize: 100` | `background-size: 100px;` |
| `border` | Sets border style, width, and color. | `color?: string, style?: string, width?: number` | `border: <color> <style> <width>` | `border: red, solid, 2` | `border: red solid 2px;` |
| `borderTop` (alias: `borderT`) | Sets top border. | `color?: string, style?: string, width?: number` | `border-top: <color> <style> <width>` | `borderT: blue` | `border-top: blue solid 1px;` |
| `borderRight` (alias: `borderR`) | Sets right border. | `color?: string, style?: string, width?: number` | `border-right: <color> <style> <width>` | `borderR: green` | `border-right: green solid 1px;` |
| `borderBottom` (alias: `borderB`) | Sets bottom border. | `color?: string, style?: string, width?: number` | `border-bottom: <color> <style> <width>` | `borderB: none` | `border-bottom: none;` |
| `borderLeft` (alias: `borderL`) | Sets left border. | `color?: string, style?: string, width?: number` | `border-left: <color> <style> <width>` | `borderL: black, dashed` | `border-left: black dashed 1px;` |
| `borderRadius` (alias: `radius`) | Sets border radius, supporting round or corner-specific values. | `value: string \| number, unit?: string` | `border-radius: <value><unit>` | `radius: round` | `border-radius: 999px;` |
| `bottom` | Sets bottom offset. | `value: number \| string, unit?: string` | `bottom: <value><unit>` | `bottom: 10` | `bottom: 10px;` |
| `circle` | Sets circular shape with equal width, height, and radius. | `size: number` | `border-radius: <size/2>px; width: <size>px; height: <size>px` | `circle: 100` | `border-radius: 50px; width: 100px; height: 100px;` |
| `fixed` | Sets fixed positioning with optional offsets or fill modes. | `mode: string \| number, top?: number, right?: number, bottom?: number, left?: number` | `position: fixed; top: <value>; right: <value>; bottom: <value>; left: <value>` | `fixed: fill` | `position: fixed; top: 0; right: 0; bottom: 0; left: 0;` |
| `flexAlign` | Sets flexbox alignment and direction. | `...values: string[]` | `display: flex; justify-content: <value>; align-items: <value>; flex-direction: <value>` | `flexAlign: center, down` | `display: flex; justify-content: center; align-items: center; flex-direction: column;` |
| `font` | Sets font properties (weight, size, family). | `...values: number \| string[]` | `font-weight: <value>; font-size: <value>; font-family: <value>` | `font: 700, 16, Arial` | `font-weight: 700; font-size: 16px; font-family: Arial;` |
| `fontFamily` (alias: `family`) | Sets font family with fallback support. | `...fonts: string[]` | `font-family: <value>, <value>` | `family: "Times New Roman", serif` | `font-family: "Times New Roman", serif;` |
| `fontSize` | Sets font size. | `value: number \| string, unit?: string` | `font-size: <value><unit>` | `fontSize: 1.5, rem` | `font-size: 1.5rem;` |
| `gap` | Sets flex or grid gap. | `value: number \| string, unit?: string` | `gap: <value><unit>` | `gap: 20` | `gap: 20px;` |
| `gridArea` | Sets grid area (row and column). | `row: string, column: string` | `grid-row: <value>; grid-column: <value>` | `gridArea: 1, 2`opinion | `grid-row: 1; grid-column: 2;` |
| `gridRow` | Sets grid row span. | `...values: string[]` | `grid-row: <value>` | `gridRow: 1, -, 3` | `grid-row: 1 / 3;` |
| `gridColumn` | Sets grid column span. | `...values: string[]` | `grid-column: <value>` | `gridColumn: 2, -, 4` | `grid-column: 2 / 4;` |
| `gridRows` | Sets grid template rows. | `...values: number \| string[]` | `display: grid; grid-template-rows: <value>` | `gridRows: 1, min` | `display: grid; grid-template-rows: 1fr min-content;` |
| `gridColumns` | Sets grid template columns. | `...values: number \| string[]` | `display: grid; grid-template-columns: <value>` | `gridColumns: 100, max` | `display: grid; grid-template-columns: 100px max-content;` |
| `height` | Sets height. | `value: number \| string, unit?: string` | `height: <value><unit>` | `height: 100, vh` | `height: 100vh;` |
| `icon` | Sets Webkit mask image for icons. | `mask: string, color?: string` | `webkit-mask-image: url(<mask>); background: <color>` | `icon: star.svg, red` | `webkit-mask-image: url("star.svg"); background: red;` |
| `image` | Sets background image from URL. | `url: string` | `background-image: url(<url>)` | `image: "bg.jpg"` | `background-image: url("bg.jpg");` |
| `left` | Sets left offset. | `value: number \| string, unit?: string` | `left: <value><unit>` | `left: 5, rem` | `left: 5rem;` |
| `lineHeight` | Sets line height. | `value: number \| string, unit?: string` | `line-height: <value><unit>` | `lineHeight: 1.5` | `line-height: 1.5;` |
| `margin` | Sets margin (all sides). | `...values: number \| string[]` | `margin: <value>` | `margin: 10, 20` | `margin: 10px 20px;` |
| `marginTop` (alias: `marginT`) | Sets top margin. | `value: number \| string` | `margin-top: <value>` | `marginT: 15` | `margin-top: 15px;` |
| `marginRight` (alias: `marginR`) | Sets right margin. | `value: number \| string` | `margin-right: <value>` | `marginR: auto` | `margin-right: auto;` |
| `marginBottom` (alias: `marginB`) | Sets bottom margin. | `value: number \| string` | `margin-bottom: <value>` | `marginB: 5, rem` | `margin-bottom: 5rem;` |
| `marginLeft` (alias: `marginL`) | Sets left margin. | `value: number \| string` | `margin-left: <value>` | `marginL: 10` | `margin-left: 10px;` |
| `marginHorizontal` (alias: `marginH`) | Sets horizontal margins. | `left: number \| string, right?: number \| string` | `margin-left: <value>; margin-right: <value>` | `marginH: 10` | `margin-left: 10px; margin-right: 10px;` |
| `marginVertical` (alias: `marginV`) | Sets vertical margins. | `top: number \| string, bottom?: number \| string` | `margin-top: <value>; margin-bottom: <value>` | `marginV: 20` | `margin-top: 20px; margin-bottom: 20px;` |
| `maxHeight` | Sets maximum height. | `value: number \| string, unit?: string` | `max-height: <value><unit>` | `maxHeight: 500` | `max-height: 500px;` |
| `maxSize` | Sets maximum width and height. | `width: number \| string, height?: number \| string, unit?: string` | `max-width: <value><unit>; max-height: <value><unit>` | `maxSize: 300` | `max-width: 300px; max-height: 300px;` |
| `maxWidth` | Sets maximum width. | `value: number \| string, unit?: string` | `max-width: <value><unit>` | `maxWidth: 100, vw` | `max-width: 100vw;` |
| `minHeight` | Sets minimum height. | `value: number \| string, unit?: string` | `min-height: <value><unit>` | `minHeight: 200` | `min-height: 200px;` |
| `minSize` | Sets minimum width and height. | `width: number \| string, height?: number \| string, unit?: string` | `min-width: <value><unit>; min-height: <value><unit>` | `minSize: 100` | `min-width: 100px; min-height: 100px;` |
| `minWidth` | Sets minimum width. | `value: number \| string, unit?: string` | `min-width: <value><unit>` | `minWidth: 50` | `min-width: 50px;` |
| `outline` | Sets outline style, width, and color. | `color?: string, style?: string` | `outline: <width> <style> <color>` | `outline: red` | `outline: 1px dashed red;` |
| `outlineWidth` | Sets outline width. | `value: number \| string, unit?: string` | `outline-width: <value><unit>` | `outlineWidth: 2` | `outline-width: 2px;` |
| `padding` | Sets padding (all sides). | `...values: number \| string[]` | `padding: <value>` | `padding: 5, 10` | `padding: 5px 10px;` |
| `paddingHorizontal` (alias: `paddingH`) | Sets horizontal padding. | `left: number \| string, right?: number \| string` | `padding-left: <value>; padding-right: <value>` | `paddingH: 15` | `padding-left: 15px; padding-right: 15px;` |
| `paddingVertical` (alias: `paddingV`) | Sets vertical padding. | `top: number \| string, bottom?: number \| string` | `padding-top: <value>; padding-bottom: <value>` | `paddingV: 10` | `padding-top: 10px; padding-bottom: 10px;` |
| `relative` | Sets relative positioning. | None | `position: relative` | `relative` | `position: relative;` |
| `right` | Sets right offset. | `value: number \| string, unit?: string` | `right: <value><unit>` | `right: 20` | `right: 20px;` |
| `shadow` | Sets box shadow with color, radius, and offsets. | `color: string, radius?: number, x?: number, y?: number` | `box-shadow: <x>px <y>px <radius>px <color>` | `shadow: black, 10, 2, 2` | `box-shadow: 2px 2px 10px black;` |
| `size` | Sets width and height. | `width: number \| string, height?: number \| string, unit?: string` | `width: <value><unit>; height: <value><unit>` | `size: 200` | `width: 200px; height: 200px;` |
| `top` | Sets top offset. | `value: number \| string, unit?: string` | `top: <value><unit>` | `top: 5, rem` | `top: 5rem;` |
| `width` | Sets width. | `value: number \| string, unit?: string` | `width: <value><unit>` | `width: 100, vw` | `width: 100vw;` |

## Usage Example

```jsx input
const Element = () => {
  absolute: fill-bottom;
  size: 300;
  border: red, dashed, 2;
  flexAlign: center, down;
  font: 700, 16, Arial;
  shadow: black, 10, 2;
  <this />
}
```

```css output
.Element_123 {
  position: absolute;
  bottom: 0;
  right: 0;
  left: 0;
  width: 300px;
  height: 300px;
  border: red dashed 2px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  font-weight: 700;
  font-size: 16px;
  font-family: Arial;
  box-shadow: 2px 2px 10px black;
}
```

## Notes

- **Unit Handling**: Numeric values are appended with `px` by default, unless specified (e.g., `rem`, `vh`). Zero values are output as `0` without units. Strings like `auto` or `none` are used as-is.
- **Error Handling**: Macros throw errors for invalid inputs (e.g., non-numeric RGB values), ensuring robust compilation.
- **Custom Macros**: Developers can define custom macros and pass them to the Babel plugin, as shown in the main README.