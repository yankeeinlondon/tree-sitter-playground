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
// 注册语言
monaco.languages.register({ id: LANGUAGE_ID });

// 自动闭合字符
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
            // 捕获变量，如 @capture
            [/@[a-zA-Z_][\w-]*/, "capture"],

            // 查询操作符，如 (#match? ...)
            [/#\w+[\?\!]/, "keyword"],

            // 字段属性，如 (name: ...)
            [/\w+\:/, "field"],

            // 注释（以 ; 开头的部分）
            [/;.*/, "comment"],

            // 双引号字符串
            [/"/, { token: "string", next: "@string" }],

            // 单引号字符串
            [/'/, { token: "string", next: "@sqstring" }],

            // S-expression 结构，如 (node_type ...)
            [/\(/, "paren"],
            [/\)/, "paren"],

            // 标识符（节点类型）
            [/[a-zA-Z_][\w-]*/, "identifier"],
        ],

        // 处理双引号字符串
        string: [
            [/[^"]+/, "string"],
            [/"/, { token: "string", next: "@pop" }],
        ],

        // 处理单引号字符串
        sqstring: [
            [/[^']+/, "string"],
            [/'/, { token: "string", next: "@pop" }],
        ],
    },
});

// 代码补全
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
 * 定义一个语法树查询编辑器类
 */
export class QueryEditor {
    // Monaco 编辑器
    private editor!: monaco.editor.IStandaloneCodeEditor;
    // Monaco 编辑器配置项
    private options: monaco.editor.IStandaloneEditorConstructionOptions;
    private model: monaco.editor.ITextModel;
    private errors: any[] = [];
    /**
     * 语法树查询编辑器类构造函数
     * @param element 编辑器渲染的目标元素
     * @param options 编辑器配置选项
     */
    constructor(private element: HTMLElement, options: QueryEditorOptions) {
        this.options = {
            theme: "tree-sitter-theme",
            minimap: { enabled: false },
            contextmenu: false,
            automaticLayout: true,
            renderValidationDecorations: "on",
            quickSuggestions: false, // 关闭代码建议
            suggestOnTriggerCharacters: false, // 关闭触发建议
            hover: { sticky: false },
            folding: false
        };
        this.setTheme(options.themeConfig || {});
        this.model = monaco.editor.createModel('', 'tree-sitter-query');
    }

    /**
     * 渲染编辑器实例
     * @returns 编辑器实例
     */
    public create() {
        if (!this.editor) {
            this.editor = monaco.editor.create(this.element, this.options);
            this.editor.setModel(this.model);
        }
        return this;
    }

    /**
     * 当编辑器中的文本发生变化时的监听
     * @param changeEvent 编辑器中的文本发送变化时调用的处理函数
     */
    public onValueChange(changeEvent: (value: string) => void) {
        // TODO 应该返回 event.changes
        this.editor.onDidChangeModelContent((event) => {
            changeEvent(this.editor.getValue());

            this.editor.updateOptions({ hover: { enabled: false } });
            setTimeout(() => this.editor.updateOptions({ hover: { enabled: true } }), 100);
        });
    }

    /**
     * 
     * @param vlaue 设置编辑器文本内容
     */
    public setValue(vlaue: string) {
        this.editor.setValue(vlaue);
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
     * 设置编辑器的主题颜色
     * @param themeConfig 主题配置
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