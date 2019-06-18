import { ComponentType, Component, StatelessComponent, ReactElement } from "react";

interface BunchOf<T> {
    [key: string]: T
}

type StylesBySelector = BunchOf<string>
type StylesByPriority = StylesBySelector[];
type StylesByQuery = BunchOf<StylesByPriority>;

export declare interface Modules {
    /**
     * (Typically consumed by `@expressive/babel-plugin-react`).
     * 
     * Registers css for global accumulator.
     * All styles registered with this function are available to [StyledApplication]
     */
    doesProvideStyle(css: StylesBySelector): void;
    doesProvideStyle(css: StylesByPriority): void;
    doesProvideStyle(css: StylesByQuery): void;
}

declare function StyledApplication<P>(extend: ComponentType<P>): ComponentType<P>;

interface StyledApplicationProps {
    children: Element | Element[]
}

declare interface ComponentStyledApplication 
    extends StatelessComponent<StyledApplicationProps> {

    /**
     * Register styles which should be inserted within <style> tag.
     * 
     * You may use the method anywhere in your application.
     * 
     * @param cssText CSS which should be present amongst computed styles.
     */
    shouldInclude(cssText: string): void;
}

/**
 * Use as a component or HOC constructor, both will work.
 * 
 * Integrates all style from imported/required modules, which call [Module.doesProvideStyle()]
 * 
 * `<ApplicationStyle />` - Include in your app, will render `<style>`.
 * 
 * `StyledApplication HOC` - Will return component which appends global `<style>` to source content.
 * 
 * @param extend The root component you wish to render with styles.
 * 
 * @returns Higher Order Component - Fragment with children `extend` and accumulated styles.
 */
declare const _default: ComponentStyledApplication & typeof StyledApplication;

export default _default

/**
 * Return children as array.
 * 
 * @param props Component props from which to retrieve children.
 */
export declare function body(props: { children: any | any[] }): any[];

/**
 * StyledApplication Element containing instantiated `Root`
 * 
 * Convenience argument for `ReactDOM.render()` and returnable from Components.
 * 
 * @param Root Component to initialize with [default] wrapper.
 * 
 * @returns `<StyledApplication><Root /></StyledApplication>`
 */
export declare function withStyles(Root: ComponentType): ReactElement;

export { withStyles as withStyle }

/**
 * Joins all truthy arguments using a space as delimiter.
 */
export declare function join(...args: string[]): string;