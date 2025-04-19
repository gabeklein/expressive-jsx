/** @file examples.jsx
 * A style guide for Expressive JSX, showcasing key features with practical examples.
 * Each component demonstrates specific styling patterns and macros.
 * Use this as a reference for building components or generating training data.
 */

import { Link } from 'react-router-dom';

/** @type {React.FC<{ active?: boolean }>} */
const Button = ({ active }) => {
  // Basic styling with shorthand macros and CSS variables
  $primaryColor: 0x2563eb; // Blue hex color
  padding: 10, 20;
  borderRadius: 8;
  background: $primaryColor;
  color: white;
  fontSize: 1.0;
  cursor: pointer;
  transition: "background-color 0.2s ease";

  // Conditional styling based on props
  if (active)
    background: 0x1e40af; // Darker blue
  else
    background: $primaryColor;

  // Pseudo-class for hover effect
  if (":hover")
    background: 0x1d4ed8;

  <this>
    {active ? "Active" : "Click Me"}
  </this>
}

/** @type {React.FC} */
const Card = () => {
  // Flexbox layout with shorthand macro
  flexAlign: center, column;
  padding: 20;
  border: solid, 1, 0xe5e7eb;
  borderRadius: 12;
  shadow: "rgba(0, 0, 0, 0.1)", 4, 0, 2;
  background: white;
  maxWidth: 300;

  // Nested selector for child elements
  title: {
    fontSize: 1.5;
    fontWeight: 600;
    color: 0x1f2937;
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
      A simple card component with flexbox and shadow effects.
    </p>
  </this>
}

/** @type {React.FC<{ checked?: boolean, onClick?: () => void }>} */
const ToggleSwitch = ({ checked, onClick }) => {
  // Styling a custom toggle switch with conditional logic
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

    // Conditional positioning using if/else for macro argument
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
  // Horizontal flexbox navigation with hover effects
  flexAlign: row, center;
  padding: 10, 20;
  background: 0x1f2937;
  gap: 20;

  link: {
    color: white;
    textDecoration: none;
    fontSize: 1.0;

    if (":hover")
      color: 0x93c5fd;
  }

  <this>
    <Link link to="/">Home</Link>
    <Link link to="/about">About</Link>
    <Link link to="/contact">Contact</Link>
  </this>
}

/** @type {React.FC} */
const Alert = () => {
  // Styling with pseudo-elements and CSS variables for external control
  $alertColor: currentColor; // Inherit parent's color
  color: 0xdc2626; // Default red
  padding: 15;
  borderRadius: 8;
  background: "rgba(220, 38, 38, 0.1)";
  position: relative;

  if (":before") {
    content: '"⚠️"';
    marginR: 10;
    fontSize: 1.2;
    color: $alertColor; // Inherits from parent's color or overridden variable
  }

  <this>
    Warning: This is an alert message.
  </this>
}

/** @type {React.FC} */
const SpecialAlert = () => {
  // Demonstrate overriding Alert's $alertColor and color externally
  Alert: {
    color: 0x800000; // Maroon
    $alertColor: 0xffd700; // Gold
  }

  <Alert />
}

/** @type {React.FC} */
const Profile = () => {
  // Nested components and custom component styling
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

  // Styling a custom component
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

/** @type {React.FC} */
const ProgressIndicator = ({ step = 1, total = 5 }) => {
  // Dynamic styling with inline style for progress
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

  <this>
    <bar style={{ width: `${(step / total) * 100}%` }} />
  </this>
}

/** @type {React.FC} */
const Modal = () => {
  // Fixed positioning with macros and nested elements
  absolute: "fill";
  background: "rgba(0, 0, 0, 0.5)";
  flexAlign: center, center;
  zIndex: 1000;

  content: {
    background: white;
    padding: 20;
    borderRadius: 12;
    size: 400, 300;
    shadow: "rgba(0, 0, 0, 0.2)", 8, 0, 4;
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

  <this>
    <content>
      <close>X</close>
      Modal Content
    </content>
  </this>
}

export {
  Button,
  Card,
  ToggleSwitch,
  NavBar,
  Alert,
  Profile,
  ProgressIndicator,
  Modal,
  SpecialAlert
};