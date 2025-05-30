import * as monaco from 'monaco-editor';
import { QueryError } from '../tsParser';

const LANGUAGE_ID = 'tree-sitter-query';

// @ts-ignore
self.MonacoEnvironment = {
    getWorkerUrl: function (moduleId: any, label: string) {
        // @ts-ignore
        return editorWorkJsUri;
    }
};

// Registered Language
monaco.languages.register({ id: LANGUAGE_ID });

// Automatic closing characters
monaco.languages.setLanguageConfiguration(LANGUAGE_ID, {
    autoClosingPairs: [
        { open: "(", close: ")" },
        { open: "[", close: "]" },
        { open: "{", close: "}" },
        { open: "\"", close: "\"", notIn: ["string"] },
        { open: "'", close: "'", notIn: ["string"] }
    ],
});
const keywords = ['eq?', 'not-eq?', "any-eq?", "any-of?", 'match?', 'is?', 'is-not?', 'set!', 'select-adjacent!', 'strip!'];
// 定义语法高亮
monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
    tokenizer: {
        root: [
            // Capture variables such as `@capture`
            [/@[a-zA-Z_][\w-]*/, "capture"],

            // Query operators such as `(#match? ...)`
            [/#\w+[\?\!]/, "keyword"],

            // Field properties, such as `(name: ...)`
            [/\w+\:/, "field"],

            // Comments (parts beginning with ;)
            [/;.*/, "comment"],

            // Double-quoted strings
            [/"/, { token: "string", next: "@string" }],

            // Single quoted strings
            [/'/, { token: "string", next: "@sqstring" }],

            // S-expression structure, such as `(node_type ...)`
            [/\(/, "paren"],
            [/\)/, "paren"],

            // Identifier (node ​​type)
            [/[a-zA-Z_][\w-]*/, "identifier"],
        ],

        // Handling double quoted strings
        string: [
            [/[^"]+/, "string"],
            [/"/, { token: "string", next: "@pop" }],
        ],

        // Handling single quoted strings
        sqstring: [
            [/[^']+/, "string"],
            [/'/, { token: "string", next: "@pop" }],
        ],
    },
});

// Code completion
monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
        );
        const words = [...keywords];
        words.map((item) => {
            return {
                label: item,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: item,
                range: range
            };
        });
        const suggestions = words.map((item) => {
            return {
                label: item,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: item,
                range: range
            };
        });
        return { suggestions };
    }
});

export type MonacoColors = monaco.editor.IColors;
export interface QueryEditorTheme {
    themeKind?: string;
    colors?: MonacoColors
}
export interface QueryEditorOptions {
    defaultValue?: string;
    themeConfig?: QueryEditorTheme
}
/**
 * Define a syntax tree query editor class
 */
export class QueryEditor {
    /** Monaco Editor */
    private editor!: monaco.editor.IStandaloneCodeEditor;
    /** Monaco Editor Configuration Items */
    private options: monaco.editor.IStandaloneEditorConstructionOptions;
    private model: monaco.editor.ITextModel;
    private errors: any[] = [];
    /**
     * Syntax tree query editor class constructor
     * @param element The target element for the editor to render
     * @param options Editor Configuration Options
     */
    constructor(private element: HTMLElement, options: QueryEditorOptions) {
        this.options = {
            theme: "tree-sitter-theme",
            minimap: { enabled: false },
            contextmenu: false,
            automaticLayout: true,
            renderValidationDecorations: "on",
            quickSuggestions: false, // Turn off code suggestions
            suggestOnTriggerCharacters: false, // Turn off trigger suggestions
            hover: { sticky: false },
            folding: false
        };
        this.setTheme(options.themeConfig || {});
        this.model = monaco.editor.createModel('', 'tree-sitter-query');
    }

    /**
     * Rendering Editor Example
     * @returns Editor Instance
     */
    public create() {
        if (!this.editor) {
            this.editor = monaco.editor.create(this.element, this.options);
            this.editor.setModel(this.model);
        }
        return this;
    }

    /**
     * Listener when the text in the editor changes
     * @param changeEvent The event handler called when the text in the editor changes
     */
    public onValueChange(changeEvent: (value: string) => void) {
        // TODO should return `event.changes`
        this.editor.onDidChangeModelContent((event) => {
            changeEvent(this.editor.getValue());

            this.editor.updateOptions({ hover: { enabled: false } });
            setTimeout(() => this.editor.updateOptions({ hover: { enabled: true } }), 100);
        });
    }

    /**
     * Set the editor text content
     * @param value 
     */
    public setValue(value: string) {
        this.editor.setValue(value);
    }

    public showQueryError(error: QueryError | null) {
        this.errors = [];
        if (error && this.model) {
            const { message, index, length } = error;
            const start = this.model.getPositionAt(index);
            const end = this.model.getPositionAt(index + (length || 1));
            this.errors = [{
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: end.lineNumber,
                endColumn: end.column,
                message: message,
                severity: monaco.MarkerSeverity.Hint
            }];
        }
        monaco.editor.setModelMarkers(this.model, 'query-syntax-check', this.errors);
    }

    /**
     * Set the editor's theme color
     * @param themeConfig Theme Configuration
     */
    private setTheme(themeConfig: QueryEditorTheme) {
        let baseTheme: monaco.editor.BuiltinTheme = 'vs-dark', colors = {};
        const themeKind = themeConfig.themeKind;
        if (themeKind && themeKind.includes('light')) {
            baseTheme = 'vs';
        }
        themeConfig.colors && (colors = themeConfig.colors);
        monaco.editor.defineTheme("tree-sitter-theme", {
            base: baseTheme,
            inherit: true,
            rules: [
                { token: "capture", foreground: "4ec9b0", },
                { token: "keyword", foreground: "c586c0" },
                { token: "operator", foreground: "c586c0" },
                { token: "comment", foreground: "808080", fontStyle: "italic" },
                { token: "string", foreground: "ffaa00" },
                { token: "paren", foreground: "ffd700" },
                { token: "field", foreground: "ffffff" },
                { token: "identifier", foreground: "4daafc" },
            ],
            colors,
        });
    }
}
