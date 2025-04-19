/**
 * TypeScript declarations for Expressive JSX macros.
 * Each macro transforms style inputs into CSS properties for use in JSX components.
 */

/** Union type for CSS length units or percentage. */
type CSSUnit = "px" | "rem" | "em" | "%";

/** Union type for CSS color values (keywords, hex, or functional notation). */
type CSSColor = string | number;

/** Union type for CSS values (numbers, strings, or "fill"). */
type Scalar = number | string | "fill";

// Positioning Macros

/** Keyword values for absolute and fixed positioning. */
type Position =
  | "fill"
  | "fill-top"
  | "fill-bottom"
  | "fill-left"
  | "fill-right"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-bottom"
  | "left-right";

interface PositionStyle<T extends "absolute" | "fixed"> {
  position: T;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
}

/**
 * Sets position to absolute with offsets or keywords.
 * @example
 * absolute(10)
 * position: absolute; top: 10px; right: 10px; bottom: 10px; left: 10px
 * absolute(5, 10)
 * position: absolute; top: 5px; bottom: 5px; left: 10px; right: 10px
 * absolute("fill-bottom")
 * position: absolute; bottom: 0; left: 0; right: 0
 */
declare function absolute(position: Position): PositionStyle<"absolute">;
declare function absolute(offset: Scalar): PositionStyle<"absolute">;
declare function absolute(topBottom: Scalar, leftRight: Scalar): PositionStyle<"absolute">;
declare function absolute(top: Scalar, leftRight: Scalar, bottom: Scalar): PositionStyle<"absolute">;
declare function absolute(top: Scalar, right: Scalar, bottom: Scalar, left: Scalar): PositionStyle<"absolute">;

/**
 * Sets position to fixed with offsets or keywords.
 * @example
 * fixed(20)
 * // position: fixed; top: 20px; right: 20px; bottom: 20px; left: 20px;
 * fixed(0, 10, 20, 30)
 * // position: fixed; top: 0; right: 10px; bottom: 20px; left: 30px;
 * fixed("fill-top")
 * // position: fixed; top: 0; left: 0; right: 0;
 */
declare function fixed(position: Position): PositionStyle<"fixed">;
declare function fixed(offset: Scalar): PositionStyle<"fixed">;
declare function fixed(topBottom: Scalar, leftRight: Scalar): PositionStyle<"fixed">;
declare function fixed(top: Scalar, leftRight: Scalar, bottom: Scalar): PositionStyle<"fixed">;
declare function fixed(top: Scalar, right: Scalar, bottom: Scalar, left: Scalar): PositionStyle<"fixed">;

/** Sets position to relative. */
declare function relative(): { position: "relative" };

/** Sets bottom property with a unit. */
declare function bottom(value: Scalar, unit?: CSSUnit): { bottom: string };

/** Sets left property with a unit. */
declare function left(value: Scalar, unit?: CSSUnit): { left: string };

/** Sets right property with a unit. */
declare function right(value: Scalar, unit?: CSSUnit): { right: string };

/** Sets top property with a unit. */
declare function top(value: Scalar, unit?: CSSUnit): { top: string };

// Size and Dimension Macros

interface SizeStyle {
  width: string;
  height?: string;
}

/**
 * Sets width and height.
 * @example
 * size(500)
 * // width: 500px; height: 500px;
 * size(300, 200)
 * // width: 300px; height: 200px;
 */
declare function size(width: Scalar, height?: Scalar, unit?: CSSUnit): SizeStyle;

/**
 * Set both width and height with a unit.
 * @example
 * size(2, "rem")
 * // width: 2rem; height: 2rem;
 */
declare function size(size: Scalar, unit?: CSSUnit): SizeStyle;

/**
 * Sets width and height with an aspect ratio.
 * @example
 * aspectSize(400, 0.5)
 * // width: 400px; height: 200px (ratio 0.5 = 1:2);
 * aspectSize(400, -0.75)
 * // width: 300px; height: 400px (ratio 0.75 = 4:3);
 */
declare function aspectSize(width: Scalar, heightOrRatio: number, unit?: CSSUnit): SizeStyle;

/** Sets border-radius and size for a circular element. */
declare function circle(diameter: number): { borderRadius: string; width: string; height: string };

/** Sets height with a unit. */
declare function height(value: Scalar, unit?: CSSUnit): { height: string };

/** Sets width with a unit. */
declare function width(value: Scalar, unit?: CSSUnit): { width: string };

/** Sets max-width and max-height. */
declare function maxSize(width: Scalar, height?: Scalar, unit?: CSSUnit): SizeStyle;

/** Sets max-height with a unit. */
declare function maxHeight(value: Scalar, unit?: CSSUnit): { maxHeight: string };

/** Sets max-width with a unit. */
declare function maxWidth(value: Scalar, unit?: CSSUnit): { maxWidth: string };

/** Sets min-width and min-height. */
declare function minSize(width: Scalar, height?: Scalar, unit?: CSSUnit): SizeStyle;

/** Sets min-height with a unit. */
declare function minHeight(value: Scalar, unit?: CSSUnit): { minHeight: string };

/** Sets min-width with a unit. */
declare function minWidth(value: Scalar, unit?: CSSUnit): { minWidth: string };

// Border Macros

type BorderStyle = "solid" | "dashed" | "dotted";
type BorderColor = CSSColor | "none" | "transparent";

/** Sets border with color, style, and width. */
declare function border(color?: BorderColor, width?: number, style?: BorderStyle): { border: string };

/** Sets border-top with color, style, and width. */
declare function borderTop(color?: BorderColor, width?: number, style?: BorderStyle): { borderTop: string };
declare const borderT: typeof borderTop;

/** Sets border-right with color, style, and width. */
declare function borderRight(color?: BorderColor, width?: number, style?: BorderStyle): { borderRight: string };
declare const borderR: typeof borderRight;

/** Sets border-bottom with color, style, and width. */
declare function borderBottom(color?: BorderColor, width?: number, style?: BorderStyle): { borderBottom: string };
declare const borderB: typeof borderBottom;

/** Sets border-left with color, style, and width. */
declare function borderLeft(color?: BorderColor, width?: number, style?: BorderStyle): { borderLeft: string };
declare const borderL: typeof borderLeft;

/** Sets outline, defaulting to dashed if only color is provided. */
declare function outline(color: CSSColor | "none", widthOrStyle?: number | string): { outline: string };

/** Sets outline-width with a unit. */
declare function outlineWidth(value: Scalar, unit?: CSSUnit): { outlineWidth: string };

// Border Radius Macros

type RadiusCorner =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "round";

/**
 * Sets border-radius for specific corners or uniformly.
 * @example
 * radius(10)
 * // border-radius: 10px;
 * radius("top-left", 5)
 * // border-radius: 5px 0 0 5px (top-left and bottom-left corners);
 * radius("round")
 * // border-radius: 999px;
 */
declare function radius(width: number): { borderRadius: string };
declare function radius(corner: RadiusCorner, radius?: Scalar, radius2?: Scalar): { borderRadius: string };

/** Sets border-radius with a unit. */
declare function borderRadius(value: Scalar, unit?: CSSUnit): { borderRadius: string };

// Background Macros

/**
 * Sets background or background-color.
 * Supports color keywords, hex, RGB/RGBA, HSL/HSLA, or arbitrary values.
 * @example
 * background("rgb", 255, 0, 0)
 * // background-color: rgb(255, 0, 0);
 * background("hsla", 120, 50, 50, 0.5)
 * // background-color: hsla(120, 50%, 50%, 0.5);
 * background("linear-gradient(red, blue)")
 * // background: linear-gradient(red, blue);
 */
declare function background(...value: (CSSColor | string | number)[]): { background?: string; backgroundColor?: string };
declare const bg: typeof background;

/** Sets background-image for URLs or required assets. */
declare function backgroundImage(url: string): { backgroundImage: string };

/** Sets background-size with a unit. */
declare function backgroundSize(value: Scalar, unit?: CSSUnit): { backgroundSize: string };

/** Sets background-image for an image URL. */
declare function image(url: string): { backgroundImage: string };

/** Sets WebkitMaskImage for SVG icons, optionally with a background color. */
declare function icon(mask: string, color?: CSSColor): { WebkitMaskImage: string; background?: string };

// Margin Macros

/** Sets margin with 1-4 values or keywords "auto", "none". */
declare function margin(...values: (Scalar | "auto" | "none")[]): { margin: string };

/** Sets margin-top with a unit. */
declare function marginTop(value: Scalar, unit?: CSSUnit): { marginTop: string };
declare const marginT: typeof marginTop;

/** Sets margin-right with a unit. */
declare function marginRight(value: Scalar, unit?: CSSUnit): { marginRight: string };
declare const marginR: typeof marginRight;

/** Sets margin-bottom with a unit. */
declare function marginBottom(value: Scalar, unit?: CSSUnit): { marginBottom: string };
declare const marginB: typeof marginBottom;

/** Sets margin-left with a unit. */
declare function marginLeft(value: Scalar, unit?: CSSUnit): { marginLeft: string };
declare const marginL: typeof marginLeft;

/** Sets margin-left and margin-right. */
declare function marginHorizontal(left: Scalar, right?: Scalar): { marginLeft: string; marginRight: string };
declare const marginH: typeof marginHorizontal;

/** Sets margin-top and margin-bottom. */
declare function marginVertical(top: Scalar, bottom?: Scalar): { marginTop: string; marginBottom: string };
declare const marginV: typeof marginVertical;

// Padding Macros

/** Sets padding with 1-4 values or keywords "auto", "none". */
declare function padding(...values: (Scalar | "auto" | "none")[]): { padding: string };

/** Sets padding-left and padding-right. */
declare function paddingHorizontal(left: Scalar, right?: Scalar): { paddingLeft: string; paddingRight: string };
declare const paddingH: typeof paddingHorizontal;

/** Sets padding-top and padding-bottom. */
declare function paddingVertical(top: Scalar, bottom?: Scalar): { paddingTop: string; paddingBottom: string };
declare const paddingV: typeof paddingVertical;

// Flexbox Macros

type FlexDirection = "row" | "column" | "row-reverse" | "column-reverse" | "right" | "left" | "up" | "down";
type FlexAlignment = "center" | "flex-start" | "flex-end" | "space-between" | "space-around" | "space-evenly";

/** Sets display: flex with direction and alignment. */
declare function flexAlign(...args: (FlexDirection | FlexAlignment)[]): {
  display: "flex";
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
};

/** Sets gap with a unit. */
declare function gap(value: Scalar, unit?: CSSUnit): { gap: string };

// Grid Macros

type GridTrack = "min" | "max";

/** Sets grid-row and grid-column for grid placement. */
declare function gridArea(row: string, column: string): { gridRow: string; gridColumn: string };

/** Sets grid-row for grid placement. */
declare function gridRow(...value: string[]): { gridRow: string };

/** Sets grid-column for grid placement. */
declare function gridColumn(...value: string[]): { gridColumn: string };

/** Sets display: grid and grid-template-rows. */
declare function gridRows(...values: (number | string | GridTrack)[]): { display: "grid"; gridTemplateRows: string };

/** Sets display: grid and grid-template-columns. */
declare function gridColumns(...values: (number | string | GridTrack)[]): { display: "grid"; gridTemplateColumns: string };

// Typography Macros

/** Sets font-weight, font-size, or font-family based on input types. */
declare function font(...args: (number | string)[]): { fontWeight?: string; fontSize?: string; fontFamily?: string };

/** Sets font-family with comma-separated font names. */
declare function fontFamily(...fonts: string[]): { fontFamily: string };
declare const family: typeof fontFamily;

/** Sets font-size with a unit. */
declare function fontSize(value: Scalar, unit?: CSSUnit): { fontSize: string };

/** Sets line-height with a unit. */
declare function lineHeight(value: Scalar, unit?: CSSUnit): { lineHeight: string };

// Shadow Macro

/** Sets box-shadow with color, radius, and offsets. */
declare function shadow(color: CSSColor | "none" | "initial", radius?: number, x?: number, y?: number): { boxShadow: string };