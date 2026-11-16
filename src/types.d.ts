// Ambient declarations for dependencies that ship without their own types.

// Side-effect CSS imports (bundled by the build, no runtime binding).
declare module '*.css';

/** The Lit localization CLI generates this JavaScript module. */
declare module '*/locale-codes.js' {
    export const sourceLocale: string;
    export const targetLocales: readonly string[];
}

declare module "@webwriter/build/test" {
    export const getMochaConfig: () => Mocha.MochaOptions;
}
