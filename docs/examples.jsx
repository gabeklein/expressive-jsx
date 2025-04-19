/** @file examples.jsx
 * A style guide for Expressive JSX, showcasing all key features with practical examples.
 * Each component demonstrates specific styling patterns and macros, with comments explaining features.
 * Use this as a reference for building components or learning the system.
 */

import { Link } from 'react-router-dom';

/** @type {React.FC<{ active?: boolean, className?: string }>} */
const Button = ({ active, className }) => {
  // CSS variable declaration with hex color
  $primaryColor: 0x2563eb; // Blue
  // Shorthand macro for padding (converts numbers to px)
  padding: 10, 20;
  // Shorthand macro for border-radius
  borderRadius: 8;
  background: $primaryColor;
  // Use of !important for priority
  color: white, !important;
  // Decimal number converts to em for font-size
  fontSize: 1.0;
  cursor: pointer;
  // Transition macro for smooth changes
  transition: "background-color 0.2s ease";

  // Conditional styling based on props
  if (active)
    background: 0x1e40af; // Darker blue
  else
    background: $primaryColor;

  // Pseudo-class for hover effect
  if (":hover")
    background: 0x1d4ed8;

  // Nested conditional styling with pseudo-element
  if (".active") {
    color: 0x1e40af;
    if (":after")
      // Pseudo-element with quoted content
      content: '"✔"';
  }

  // <this> merges className prop with generated classes
  <this className={className}>
    {active ? "Active" : "Click Me"}
  </this>
}

/** @type {React.FC} */
const Card = () => {
  // Flexbox shorthand macro for layout
  flexAlign: center, column;
  padding: 20;
  // Border macro with style, width, color
  border: solid, 1, 0xe5e7eb;
  borderRadius: 12;
  // Shadow macro for box-shadow
  shadow: "0x0000001A", 4, 0, 2; // Black with 10% opacity
  background: white;
  maxWidth: 300;
  // Transform macro for hover effect
  if (":hover")
    transform: scale(1.05);
  // Typography macros for font styling
  fontFamily: "Arial", "sans-serif";
  lineHeight: 1.5;
  // Specific border side macro
  borderTop: solid, 2, 0x1f2937;

  // Nested selector for child elements
  title: {
    fontSize: 1.5;
    fontWeight: 600;
    color: 0x1f2937;
    // Margin shorthand for specific side
    marginB: 10;
  }

  description: {
    fontSize: 0.9;
    color: 0x6b7280;
    textAlign: center;
  }

  <this>
    <h2 title>Card Title</h2>
    <p description>
      A card with flexbox, shadow, and transform effects.
    </p>
  </this>
}

/** @type {React.FC<{ checked?: boolean, onClick?: () => void }>} */
const ToggleSwitch = ({ checked, onClick }) => {
  // Size macro for width and height
  size: 40, 24;
  borderRadius: "round";
  padding: 2;
  cursor: pointer;
  transition: "background-color 0.2s ease";

  // Conditional background using if/else
  if (checked)
    background: 0x10b981; // Green
  else
    background: 0xd1d5db; // Grey

  knob: {
    size: 20;
    background: white;
    borderRadius: "round";
    transition: "left 0.2s ease";

    // Absolute positioning macro with conditional argument
    if (checked)
      absolute: "top-right";
    else
      absolute: "top-left";
  }

  <this onClick={onClick}>
    <knob />
  </this>
}

/** @type {React.FC} */
const NavBar = () => {
  // Flexbox with row direction and gap
  flexAlign: row, center;
  padding: 10, 20;
  background: 0x1f2937;
  // Gap macro for spacing
  gap: 20;

  // Bare attribute as selector
  link: {
    color: white;
    textDecoration: none;
    fontSize: 1.0;

    if (":hover")
      color: 0x93c5fd;
  }

  // Third-party component (react-router-dom) with styled attribute
  <this>
    <Link link to="/">Home</Link>
    <Link link to="/about">About</Link>
    <Link link to="/contact">Contact</Link>
  </this>
}

/** @type {React.FC} */
const Alert = () => {
  // CSS variable for external control
  $alertColor: currentColor;
  // Vendor-prefixed property
  WebkitMaskImage: "url(icon.svg)";
  color: 0xdc2626; // Default red
  padding: 15;
  borderRadius: 8;
  background: 0xdc26261A;
  position: relative;

  if (":before") {
    content: '"⚠️"';
    // Margin shorthand for right side
    marginR: 10;
    fontSize: 1.2;
    color: $alertColor;
  }

  // Outline macro with default dashed style
  outline: red;
  // Outline width macro
  outlineWidth: 2;

  <this>
    Warning: This is an alert message.
  </this>
}

/** @type {React.FC} */
const SpecialAlert = () => {
  // Styling a custom component with variable override
  Alert: {
    color: 0x800000; // Maroon
    $alertColor: 0xffd700; // Gold
  }

  <Alert />
}

/** @type {React.FC} */
const Profile = () => {
  // Flexbox with column direction
  flexAlign: column, center;
  padding: 20;
  gap: 15;

  avatar: {
    size: 100;
    borderRadius: "round";
    border: solid, 2, 0xe5e7eb;
  }

  name: {
    fontSize: 1.2;
    fontWeight: 500;
    color: 0x1f2937;
  }

  // Styling a custom component (Button)
  Button: {
    width: 120;
    padding: 8, 16;
  }

  <this>
    <img avatar src="https://example.com/avatar.jpg" alt="User avatar" />
    <span name>John Doe</span>
    <Button active>Edit Profile</Button>
  </this>
}

/** @type {React.FC<{ step?: number, total?: number }>} */
const ProgressIndicator = ({ step = 1, total = 5 }) => {
  // CSS variable for color
  $progressColor: 0x8b5cf6; // Purple
  height: 8;
  background: 0xe5e7eb;
  borderRadius: "round";
  overflow: hidden;

  bar: {
    height: "100%";
    background: $progressColor;
    transition: "width 0.3s ease";
  }

  // Dynamic inline style for calculated width
  <this>
    <bar style={{ width: `${(step / total) * 100}%` }} />
  </this>
}

/** @type {React.FC} */
const Modal = () => {
  // Absolute positioning macro to fill parent
  absolute: "fill";
  background: 0x00000080;
  flexAlign: center, center;
  zIndex: 1000;

  content: {
    background: white;
    padding: 20;
    borderRadius: 12;
    size: 400, 300;
    shadow: "0x00000033", 8, 0, 4;
  }

  close: {
    absolute: "top-right";
    size: 30;
    flexAlign: center, center;
    cursor: pointer;
    color: 0x6b7280;

    if (":hover")
      color: 0x1f2937;
  }

  // Margin and padding shorthand macros
  marginHorizontal: 20;
  paddingVertical: 10;

  <this>
    <content>
      <close>X</close>
      Modal Content
    </content>
  </this>
}

/** @type {React.FC} */
const GridLayout = () => {
  // Grid layout with columns macro (1.0 instead of "1fr")
  gridColumns: 1.0, 1.0;
  gap: 20;

  item: {
    background: 0xe5e7eb;
    padding: 10;
  }

  <this>
    <div item>Item 1</div>
    <div item>Item 2</div>
  </this>
}

/** @type {React.FC} */
const ImplicitReturn = () => {
  // Implicit <this /> return with only styles
  color: 0x0000ff;
}

/** @type {React.FC} */
const CustomMacro = () => {
  // Custom macro (assumes `highlight` defined in Babel config: { background: value })
  highlight: "yellow";
  <this>Highlighted</this>
}

export {
  Button,
  Card,
  ToggleSwitch,
  NavBar,
  Alert,
  SpecialAlert,
  Profile,
  ProgressIndicator,
  Modal,
  GridLayout,
  ImplicitReturn,
  CustomMacro
};