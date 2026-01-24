# @expressive/nextjs-plugin

Next.js plugin for Expressive JSX - a CSS-in-JS solution with compile-time optimizations.

## Installation

```bash
npm install @expressive/nextjs-plugin
# or
yarn add @expressive/nextjs-plugin
# or
pnpm add @expressive/nextjs-plugin
```

## Usage

### Next.js 15+ (Turbopack)

```javascript
// next.config.js
const withExpressiveJSX = require('@expressive/nextjs-plugin');

module.exports = withExpressiveJSX({
  enableCSSModules: true,
  cssModulePattern: '[name].[hash].module.css'
})(
  {
    // your existing Next.js config
  }
);
```

### TypeScript Configuration

```typescript
// next.config.ts
import withExpressiveJSX from '@expressive/nextjs-plugin';

const nextConfig = withExpressiveJSX({
  enableCSSModules: true,
})(
  {
    // your existing Next.js config
  }
);

export default nextConfig;
```

## Options

- `enableCSSModules` (boolean, default: `true`): Enable CSS module generation
- `cssModulePattern` (string, default: `"[name].[hash].module.css"`): CSS module naming pattern
- All other options from `@expressive/babel-preset` are supported

## Compatibility

- ✅ Next.js 15+ with Turbopack
- ✅ Next.js 13-14 with webpack (fallback)
- ✅ TypeScript support
- ⚠️ CSS injection in Turbopack mode requires additional setup

## Limitations

Due to Turbopack's architecture, some features available in the webpack plugin may not work identically:

1. **CSS Virtual Modules**: Turbopack doesn't have direct equivalent to webpack's virtual modules plugin
2. **Runtime CSS Injection**: May require different approach compared to webpack version

## Example

```jsx
// pages/index.jsx or app/page.jsx
export default function Home() {
  return (
    <div>
      <h1 style={{ color: 'blue', fontSize: '2rem' }}>
        Hello Expressive JSX!
      </h1>
    </div>
  );
}
```

The plugin will automatically transform your JSX and generate optimized CSS.
