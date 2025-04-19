/**
 * TypeScript declarations for Expressive JSX default macros.
 * Each macro transforms style inputs into CSS properties, returning an object with specific CSS properties.
 * Macros are used within JSX components to define styles concisely.
 */

/**
 * Union type for CSS length units or percentage.
 */
type CSSUnit = 'px' | 'rem' | 'em' | '%';

/**
 * Union type for CSS color values, including keywords, hex, or functional notation.
 */
type CSSColor = string | number;

/**
 * Union type for CSS values that can be numbers, strings, or 'fill'.
 */
type Scalar = number | string | 'fill';

// Positioning Macros

/**
 * Keyword values for absolute and fixed positioning.
 */
type Position = 
  | 'fill'
  | 'fill-top'
  | 'fill-bottom'
  | 'fill-left'
  | 'fill-right'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-bottom'
  | 'left-right';

type PositionStyle<T> = {
  position: "absolute" | "fixed";
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
};

/**
 * Sets an element's position to absolute with specified offsets.
 * Supports keywords like 'fill' or directional combinations (e.g., 'fill-bottom').
 * @param position - Positioning keyword or offset values.
 * @returns Object with `position: absolute` and optional positional properties.
 */
declare function absolute(position: Position): PositionStyle<'absolute'>;
declare function absolute(offset: Scalar): PositionStyle<'absolute'>;
declare function absolute(topBottom: Scalar, leftRight: Scalar): PositionStyle<'absolute'>;
declare function absolute(top: Scalar, leftRight: Scalar, bottom: Scalar): PositionStyle<'absolute'>;
declare function absolute(top: Scalar, right: Scalar, bottom: Scalar, left: Scalar): PositionStyle<'absolute'>;

/**
 * Sets an element's position to fixed with specified offsets.
 * Supports the same keywords as absolute.
 * @param position - Positioning keyword or offset values.
 * @returns Object with `position: fixed` and optional positional properties.
 */
declare function fixed(position: Position): PositionStyle<"fixed">;
declare function fixed(offset: Scalar): PositionStyle<"fixed">;
declare function fixed(topBottom: Scalar, leftRight: Scalar): PositioStyle<"fixed">;
declare function fixed(top: Scalar, leftRight: Scalar, bottom: Scalar): PositioStyle<"fixed">;
declare function fixed(top: Scalar, right: Scalar, bottom: Scalar, left: Scalar): PositioStyle<"fixed">;

/**
 * Sets position to relative.
 * @param none - No arguments required.
 */
declare function relative(): { position: 'relative' };

/**
 * Sets the bottom property with a unit.
 * @param value - Position value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function bottom(value: Scalar, unit?: CSSUnit): { bottom: string };

/**
 * Sets the left property with a unit.
 * @param value - Position value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function left(value: Scalar, unit?: CSSUnit): { left: string };

/**
 * Sets the right property with a unit.
 * @param value - Position value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function right(value: Scalar, unit?: CSSUnit): { right: string };

/**
 * Sets the top property with a unit.
 * @param value - Position value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function top(value: Scalar, unit?: CSSUnit): { top: string };

// Size and Dimension Macros

/**
 * Interface for size-related return types.
 */
interface SizeStyle {
  width: string;
  height?: string;
}

/**
 * Sets width and height.
 * @param width - Width value.
 * @param height - Height value (optional, defaults to width).
 * @param unit - Optional CSS unit.
 */
declare function size(
  width: Scalar,
  height?: Scalar,
  unit?: CSSUnit
): SizeStyle;

/**
 * Sets width and height with an aspect ratio.
 * If the second value is a fraction (<1), adjusts dimensions.
 * @param width - Width value.
 * @param heightOrRatio - Height value or aspect ratio (e.g., 0.5 for 1:2).
 * @param unit - Optional CSS unit.
 */
declare function aspectSize(
  width: Scalar,
  heightOrRatio: number,
  unit?: CSSUnit
): SizeStyle;

/**
 * Sets border-radius and size to create a circular element.
 * @param diameter - Diameter value (number).
 */
declare function circle(diameter: number): { borderRadius: string; width: string; height: string };

/**
 * Sets height with a unit.
 * @param value - Height value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function height(value: Scalar, unit?: CSSUnit): { height: string };

/**
 * Sets width with a unit.
 * @param value - Width value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function width(value: Scalar, unit?: CSSUnit): { width: string };

/**
 * Sets max-width and max-height.
 * @param width - Max width value.
 * @param height - Max height value (optional, defaults to width).
 * @param unit - Optional CSS unit.
 */
declare function maxSize(
  width: Scalar,
  height?: Scalar,
  unit?: CSSUnit
): SizeStyle;

/**
 * Sets max-height with a unit.
 * @param value - Max height value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function maxHeight(value: Scalar, unit?: CSSUnit): { maxHeight: string };

/**
 * Sets max-width with a unit.
 * @param value - Max width value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function maxWidth(value: Scalar, unit?: CSSUnit): { maxWidth: string };

/**
 * Sets min-width and min-height.
 * @param width - Min width value.
 * @param height - Min height value (optional, defaults to width).
 * @param unit - Optional CSS unit.
 */
declare function minSize(width: Scalar, height?: Scalar, unit?: CSSUnit): SizeStyle;

/**
 * Sets min-height with a unit.
 * @param value - Min height value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function minHeight(value: Scalar, unit?: CSSUnit): { minHeight: string };

/**
 * Sets min-width with a unit.
 * @param value - Min width value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function minWidth(value: Scalar, unit?: CSSUnit): { minWidth: string };

// Border Macros

/**
 * Border style keywords.
 */
type BorderStyle = 'solid' | 'dashed' | 'dotted';
type BorderColor = CSSColor | 'none' | 'transparent';

/**
 * Sets the border property with color, style, and width.
 * @param color - Border color or 'none'/'transparent'.
 * @param width - Border width (number).
 * @param style - Border style (e.g., 'solid', 'dashed').
 */
declare function border(
  color?: BorderColor,
  width?: number,
  style?: BorderStyle
): { border: string };

/**
 * Sets the border-top property.
 * @param color - Border color or 'none'/'transparent'.
 * @param width - Border width (number).
 * @param style - Border style (e.g., 'solid', 'dashed').
 */
declare function borderTop(
  color?: BorderColor,
  width?: number,
  style?: BorderStyle
): { borderTop: string };

declare const borderT: typeof borderTop;

/**
 * Sets the border-right property.
 * @param color - Border color or 'none'/'transparent'.
 * @param width - Border width (number).
 * @param style - Border style (e.g., 'solid', 'dashed').
 */
declare function borderRight(
  color?: BorderColor,
  width?: number,
  style?: BorderStyle
): { borderRight: string };

declare const borderR: typeof borderRight;

/**
 * Sets the border-bottom property.
 * @param color - Border color or 'none'/'transparent'.
 * @param width - Border width (number).
 * @param style - Border style (e.g., 'solid', 'dashed').
 */
declare function borderBottom(
  color?: BorderColor,
  width?: number,
  style?: BorderStyle
): { borderBottom: string };

declare const borderB: typeof borderBottom;

/**
 * Sets the border-left property.
 * @param color - Border color or 'none'/'transparent'.
 * @param width - Border width (number).
 * @param style - Border style (e.g., 'solid', 'dashed').
 */
declare function borderLeft(
  color?: BorderColor,
  width?: number,
  style?: BorderStyle
): { borderLeft: string };

declare const borderL: typeof borderLeft;

/**
 * Sets the outline property, defaulting to dashed if only color is provided.
 * @param color - Outline color or 'none'.
 * @param widthOrStyle - Optional width or style (e.g., 'dashed').
 */
declare function outline(
  color: CSSColor | 'none',
  widthOrStyle?: number | string
): { outline: string };

/**
 * Sets outline-width with a unit.
 * @param value - Outline width value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function outlineWidth(value: Scalar, unit?: CSSUnit): { outlineWidth: string };

// Border Radius Macros

/**
 * Corner keywords for border-radius.
 */
type RadiusCorner =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'round';

/**
 * Sets border-radius for specific corners or uniformly.
 * Supports corner keywords or 'round'.
 * @param corner - Corner keyword or single radius value.
 * @param radius - Radius value(s).
 */
declare function radius(width: number): { borderRadius: string };
declare function radius(
  corner: RadiusCorner,
  radius?: Scalar,
  radius2?: Scalar
): { borderRadius: string };

/**
 * Sets the border-radius property with a unit.
 * @param value - Radius value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function borderRadius(value: Scalar, unit?: CSSUnit): { borderRadius: string };

// Background Macros

/**
 * Sets the background or background-color property.
 * Supports color keywords, hex, RGB/RGBA, HSL/HSLA, or arbitrary values.
 * @param value - Color (e.g., 'red', ['rgb', 255, 0, 0]) or other background value.
 */
declare function background(
  ...value: (CSSColor | string | number)[]
): { background?: string; backgroundColor?: string };

declare const bg: typeof background;

/**
 * Sets the background-image property, typically for URLs or required assets.
 * @param url - Image URL or file path (e.g., './image.jpg').
 */
declare function backgroundImage(url: string): { backgroundImage: string };

/**
 * Sets the background-size property with a unit.
 * @param value - Size value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function backgroundSize(value: Scalar, unit?: CSSUnit): { backgroundSize: string };

/**
 * Sets background-image for an image URL.
 * @param url - Image URL (string).
 */
declare function image(url: string): { backgroundImage: string };

/**
 * Sets WebkitMaskImage for SVG icons, optionally with a background color.
 * @param mask - SVG mask URL (string).
 * @param color - Optional background color.
 */
declare function icon(
  mask: string,
  color?: CSSColor
): { WebkitMaskImage: string; background?: string };

// Margin Macros

/**
 * Sets margin with 1-4 values or keywords 'auto', 'none'.
 * @param values - Margin values or keywords.
 */
declare function margin(
  ...values: (Scalar | 'auto' | 'none')[]
): { margin: string };

/**
 * Sets margin-top with a unit.
 * @param value - Margin value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function marginTop(value: Scalar, unit?: CSSUnit): { marginTop: string };

declare const marginT: typeof marginTop;

/**
 * Sets margin-right with a unit.
 * @param value - Margin value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function marginRight(value: Scalar, unit?: CSSUnit): { marginRight: string };

declare const marginR: typeof marginRight;

/**
 * Sets margin-bottom with a unit.
 * @param value - Margin value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function marginBottom(value: Scalar, unit?: CSSUnit): { marginBottom: string };

declare const marginB: typeof marginBottom;

/**
 * Sets margin-left with a unit.
 * @param value - Margin value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function marginLeft(value: Scalar, unit?: CSSUnit): { marginLeft: string };

declare const marginL: typeof marginLeft;

/**
 * Sets margin-left and margin-right.
 * @param left - Left margin value.
 * @param right - Right margin value (optional, defaults to left).
 */
declare function marginHorizontal(
  left: Scalar,
  right?: Scalar
): { marginLeft: string; marginRight: string };

declare const marginH: typeof marginHorizontal;

/**
 * Sets margin-top and margin-bottom.
 * @param top - Top margin value.
 * @param bottom - Bottom margin value (optional, defaults to top).
 */
declare function marginVertical(
  top: Scalar,
  bottom?: Scalar
): { marginTop: string; marginBottom: string };

declare const marginV: typeof marginVertical;

// Padding Macros

/**
 * Sets padding with 1-4 values or keywords 'auto', 'none'.
 * @param values - Padding values or keywords.
 */
declare function padding(
  ...values: (Scalar | 'auto' | 'none')[]
): { padding: string };

/**
 * Sets padding-left and padding-right.
 * @param left - Left padding value.
 * @param right - Right padding value (optional, defaults to left).
 */
declare function paddingHorizontal(
  left: Scalar,
  right?: Scalar
): { paddingLeft: string; paddingRight: string };

declare const paddingH: typeof paddingHorizontal;

/**
 * Sets padding-top and padding-bottom.
 * @param top - Top padding value.
 * @param bottom - Bottom padding value (optional, defaults to top).
 */
declare function paddingVertical(
  top: Scalar,
  bottom?: Scalar
): { paddingTop: string; paddingBottom: string };

declare const paddingV: typeof paddingVertical;

// Flexbox Macros

/**
 * Flex direction keywords.
 */
type FlexDirection =
  | 'row'
  | 'column'
  | 'row-reverse'
  | 'column-reverse'
  | 'right'
  | 'left'
  | 'up'
  | 'down';

/**
 * Flex alignment keywords.
 */
type FlexAlignment =
  | 'center'
  | 'flex-start'
  | 'flex-end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';

/**
 * Sets display: flex with direction and alignment.
 * Supports direction and alignment keywords.
 * @param args - Direction and/or alignment keywords.
 * @returns Object with flex-related properties.
 */
declare function flexAlign(...args: (FlexDirection | FlexAlignment)[]): {
  display: 'flex';
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string
};

/**
 * Sets the gap property with a unit.
 * @param value - Gap value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function gap(value: Scalar, unit?: CSSUnit): { gap: string };

// Grid Macros

/**
 * Grid track keywords.
 */
type GridTrack = 'min' | 'max';

/**
 * Sets grid-row and grid-column for grid placement.
 * @param row - Row specification (e.g., '1 / 2').
 * @param column - Column specification (e.g., '3 / 4').
 */
declare function gridArea(
  row: string,
  column: string
): { gridRow: string; gridColumn: string };

/**
 * Sets grid-row for grid placement.
 * @param value - Row specification (e.g., '1 / 3').
 */
declare function gridRow(...value: string[]): { gridRow: string };

/**
 * Sets grid-column for grid placement.
 * @param value - Column specification (e.g., '2').
 */
declare function gridColumn(...value: string[]): { gridColumn: string };

/**
 * Sets display: grid and grid-template-rows.
 * Supports keywords 'min', 'max', or fractional units.
 * @param values - Row specifications (numbers, strings, or keywords).
 */
declare function gridRows(
  ...values: (number | string | GridTrack)[]
): { display: 'grid'; gridTemplateRows: string };

/**
 * Sets display: grid and grid-template-columns.
 * Supports keywords 'min', 'max', or fractional units.
 * @param values - Column specifications (numbers, strings, or keywords).
 */
declare function gridColumns(
  ...values: (number | string | GridTrack)[]
): { display: 'grid'; gridTemplateColumns: string };

// Typography Macros

/**
 * Sets font-weight, font-size, or font-family based on input types.
 * @param args - Weight (number, e.g., 700), size (number), or family (string).
 */
declare function font(
  ...args: (number | string)[]
): { fontWeight?: string; fontSize?: string; fontFamily?: string };

/**
 * Sets font-family with comma-separated font names, quoting families with spaces.
 * @param fonts - Font names (strings).
 */
declare function fontFamily(
  ...fonts: string[]
): { fontFamily: string };

declare const family: typeof fontFamily;

/**
 * Sets font-size with a unit.
 * @param value - Size value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function fontSize(value: Scalar, unit?: CSSUnit): { fontSize: string };

/**
 * Sets line-height with a unit.
 * @param value - Line height value or 'fill'.
 * @param unit - Optional CSS unit.
 */
declare function lineHeight(value: Scalar, unit?: CSSUnit): { lineHeight: string };

// Shadow Macro

/**
 * Sets box-shadow with color, radius, and offsets.
 * @param color - Shadow color or 'none'/'initial'.
 * @param radius - Blur radius (number).
 * @param x - X-offset (number).
 * @param y - Y-offset (number, optional, defaults to x).
 */
declare function shadow(
  color: CSSColor | 'none' | 'initial',
  radius?: number,
  x?: number,
  y?: number
): { boxShadow: string };