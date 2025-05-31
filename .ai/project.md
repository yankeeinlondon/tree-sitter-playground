# tree-sitter-playground Repository

## Project Context

- this repo is a plugin meant to provide a "playground" for tree-sitter queries.
- this extension is intended for the VSCode editor
- we use `tsdown` to build ESM or CJS Javascript:
    - the extension and the webview are transpiled to `CJS`
    - the webview is transpiled `ESM`
- Source File Structure
    - all source files reside in the `src` directory
    - the `src/extension` folder contains source files that should only be used by the extension (not by the Webview)
    - similarly the `src/webview` contains source files which should only be used by the Webview (not the extension)
    - most types should be placed in the `src/types.ts` file unless they propagate types from a dependency which is only in the extension or the webview
- `package.json`
    - scripts include:
        - `build` - transpiles extension, webview, and tests
            - both the extension and the webview are put in the `dist` folder as `dist/extension.cjs` and `dist/webviewScript.js` respecfully.
            - test files are transpiled to the `dist/test` directory
        - `test` - uses the `vscode-test` test runner
            - all tests must use the built-in mocha test runner which `vscode-test` provides
            - all test files are matched by the glob pattern of `test/**/*.test.ts`
    - the `package.json` can be referred to for all third party tools/dependencies which are used but the primary ones are:
    - `monaco-editor`
        - Used by the Webview to provide an editor scratchpad for building Tree Sitter 
    - `web-tree-sitter`
        - The web-tree-sitter library is a JavaScript (and WebAssembly) implementation of the Tree-sitter parsing system, designed to run in both Node.js and browser environments. Its primary function is to provide fast, incremental parsing of source code into concrete syntax trees for a wide variety of programming languages.

        - Key features:
            - Loads language grammars (as WASM files) and parses code into syntax trees.
            - Supports incremental parsing, so only changed parts of the code are re-parsed.
            - Exposes APIs to traverse, query, and analyze syntax trees.
            - Enables syntax highlighting, code folding, structural editing, and advanced code analysis in editors and web applications.
            - In this project:
                - web-tree-sitter is used to parse the contents of the active editor file, build the syntax tree, and enable Tree-sitter queries and AST visualization in the VS Code extension and its webview.


## User Question

