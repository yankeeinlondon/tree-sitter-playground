import path from "path";
import * as vscode from "vscode";
import  { Tree, Parser, Point } from "web-tree-sitter";
import { Colors } from "./colors";
import { EditorDecorationer, selectedDecorationType } from "./editorDecorations";
import { 
    EditRange, 
    editTree, 
    getParser, 
    handlerSyntaxNodeByRecursion, 
    MiniCapture, 
    MiniNode 
} from "./tsParser";

/** Log Output */
const logOutput = vscode.window.createOutputChannel("Tree-Sitter-Viewer", { log: true });


/**
 * WebView state data type
 */
export interface AstWebviewState {
    /** The URI address of the document */
    docUri: string;
    /** Flattened array of syntax tree nodes */
    nodes: MiniNode[];
    /** Whether to enable query */
    enableQuery: boolean;
    /** Cached query statements */
    queryText: string;
    /** Whether to display anonymous nodes */
    showAnonymousNodes: boolean;
    /** Whether to enable node mapping */
    enableNodeMapping: boolean;
    /** Whether to output logs */
    logOutput: boolean;
}

/**
 * Serialized Abstract Syntax Tree WebView
 */
interface SerializeAstWebview {
    /** Serialized webview panel */
    webviewPanel: vscode.WebviewPanel;
    /** Serialized state data */
    state: AstWebviewState;
}

/**
 * `ASTWebviewManager` class, used to manage the creation and restoration 
 * of the syntax tree Webview.
 */
export class ASTWebviewManager {
    private static _extensionContext: vscode.ExtensionContext;
    private static _cache = new Map<string, AstWebview>();

    /**
     * Get the extension context
     * 
     * @returns {vscode.ExtensionContext} Extended context
     */
    public static get extensionContext(): vscode.ExtensionContext {
        return this._extensionContext;
    }

    /**
     * Initialization Manager
     * 
     * @param {vscode.ExtensionContext} extensionContext Extended context
     */
    static initManager(extensionContext: vscode.ExtensionContext) {
        if (this._extensionContext) {
            console.error(`ASTWebviewManager has been initialized successfully.`);
            return;
        }
        this._extensionContext = extensionContext;
        // Register a web view serializer
        vscode.window.registerWebviewPanelSerializer(
            AstWebview.viewType, 
            new AstWebviewSerializer()
        );
    }

    /**
     * Create a web view of a syntax tree
     * 
     * @param {vscode.TextDocument} doc documents opened by vscode
     * @param {SerializeAstWebview} serializeWebview optional, serialized webview
     */
    static async createAstWebview(doc: vscode.TextDocument, serializeWebview?: SerializeAstWebview) {
        let astWebview = this._cache.get(doc.uri.toString());
        if (astWebview) {
            astWebview.webviewPanel.reveal();
            return;
        }
        astWebview = new AstWebview(doc, serializeWebview);
        this._cache.set(doc.uri.toString(), astWebview);
    }

    /**
     * Deletes the cache for the specified URI.
     *
     * @param uri - The URI whose cache is to be deleted.
     */
    static deleteCache(uri: vscode.Uri) {
        this._cache.delete(uri.toString());
    }
}

/**
 * `AstWebviewSerializer` class, used to serialize and deserialize Webview
 */
export class AstWebviewSerializer implements vscode.WebviewPanelSerializer<AstWebviewState> {
    /**
     * Deserialize Webview
     * @param {vscode.WebviewPanel} webviewPanel Webview 面板
     * @param {any} state 在 Webview 中持久化的状态
     */
    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: AstWebviewState) {
        //Restore the content of the Webview, making sure we preserve the passed in 
        // `webviewPanel` and restore any event listeners we need
        try {
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(state.docUri));
            ASTWebviewManager.createAstWebview(doc, { webviewPanel, state });
        } catch (error) {
            console.error(error);
        }
    }
}

/**
 * Syntax tree web view class
 */
class AstWebview {
    public static readonly viewType = "tree-sitter-viewer.ast-webview";
    // Open code document
    private readonly doc: vscode.TextDocument;
    private _webviewPanel!: vscode.WebviewPanel;
    private visible: boolean = false;
    private state!: AstWebviewState;
    private tsParser!: Parser;
    private astTree!: Tree;
    private editorDecorationer!: EditorDecorationer;
    public get webviewPanel() {
        return this._webviewPanel;
    }

    /**
     * Constructor
     * 
     * @param {vscode.TextDocument} doc documents opened by vscode
     * @param {SerializeAstWebview} serializeAstWebview serialized Webview
     */
    constructor(doc: vscode.TextDocument, serializeAstWebview?: SerializeAstWebview) {
        this.doc = doc;

        // Initialize webview panel
        this.initWebviewPanel(serializeAstWebview);

        // Get the parser to parse the syntax tree and refresh the web page
        getParser(doc.languageId).then((parser) => {
            this.tsParser = parser;
            this.astTree = this.tsParser.parse(doc.getText()) as Tree;
            // Setting up logging
            this.setLogOutput();
            // Refresh the web page
            this.refreshWebview();
        });

        /** The **editor** of the current document */
        const editor = vscode.window.visibleTextEditors.find(
            (editor) => editor.document.uri.toString() === this.doc.uri.toString()
        );

        if (editor) {
            // Initialize the editor decorator
            this.editorDecorationer = new EditorDecorationer(editor);
        }
    }

    /**
     * Initialize the webview panel
     * 
     * @param serializeAstWebview vscode serialized Webview
     */
    private initWebviewPanel(serializeAstWebview?: SerializeAstWebview) {
        if (serializeAstWebview) {
            this._webviewPanel = serializeAstWebview.webviewPanel;
            this.state = serializeAstWebview.state;
        } else {
            // Create a new WebviewPanel
            const viewTitle = `${path.basename(this.doc.fileName)} - Ast`;
            this._webviewPanel = vscode.window.createWebviewPanel(
                AstWebview.viewType,
                viewTitle,
                vscode.ViewColumn.Beside,
                { enableFindWidget: true }
            );
            this._webviewPanel.webview.options = { enableScripts: true };
            this.state = {
                docUri: this.doc.uri.toString(),
                nodes: [],
                enableQuery: false,
                queryText: "",
                showAnonymousNodes: false,
                enableNodeMapping: false,
                logOutput: false,
            };
        }
        this.visible = this._webviewPanel.visible;
        this.handlerEvent();
        // Update webview page content
        this._webviewPanel.webview.html = this.getHtml();
    }

    /**
     * Handling event monitoring
     */
    private handlerEvent() {
        // Listen for messages sent by webview
        const receiveMessageDispose = this._webviewPanel.webview.onDidReceiveMessage((event) =>
            this.handleReceiveMessageEvent(event)
        );
        // Monitor webview status changes
        const webviewSateChangeDispose = this._webviewPanel.onDidChangeViewState((event) =>
            this.handleChangeViewStateEvent(event)
        );
        // Listen for document modification events
        const textDocChangeDispose = vscode.workspace.onDidChangeTextDocument((event) =>
            this.handleChangeTextDocumentEvent(event)
        );
        // Listen for editor click and text selection events
        const changeSelectionDispose = vscode.window.onDidChangeTextEditorSelection((event) =>
            this.handleTextEditorChangeSelectEvent(event)
        );

        // webview destroy event
        this._webviewPanel.onDidDispose(() => {
            receiveMessageDispose.dispose();
            webviewSateChangeDispose.dispose();
            textDocChangeDispose.dispose();
            changeSelectionDispose.dispose();

            // Remove Selection Style
            vscode.window.activeTextEditor?.setDecorations(selectedDecorationType, []);
            ASTWebviewManager.deleteCache(this.doc.uri);
            this.editorDecorationer.clear();
        });
    }

    /**
     * Handle receiving message events
     * 
     * @param {any} event Received message events
     */
    private handleReceiveMessageEvent(event: any) {
        const { command, value } = event;
        switch (command) {
            case "showAnonymousNodes":
                this.state.showAnonymousNodes = value;
                this.refreshWebview();
                break;
            case "enableNodeMapping":
                this.state.enableNodeMapping = value;
                break;
            case "selectEditorText":
                const { startIndex, endIndex, isClick } = value;
                if (isClick || (this.state.enableNodeMapping && this._webviewPanel.active)) {
                    this.editorDecorationer.renderSelectRange(startIndex, endIndex);
                }
                break;
            case "enableQuery":
                this.state.enableQuery = value;
                if (this.state.enableQuery && this.state.queryText) {
                    this.querySyntaxNode(this.state.queryText);
                } else {
                    this.querySyntaxNode('');
                }
                break;
            case "queryNode":
                this.state.queryText = value;
                this.querySyntaxNode(value);
                break;
            case "logOutput":
                this.state.logOutput = value;
                this.setLogOutput();
            default:
        }
    }

    /**
     * Handling view state change events
     * 
     * @param {vscode.WebviewPanelOnDidChangeViewStateEvent} event View state change events
     */
    private handleChangeViewStateEvent(event: vscode.WebviewPanelOnDidChangeViewStateEvent) {
        if (!this.visible && this._webviewPanel.visible) {
            // Refresh the view content
            this.refreshWebview();
            let viewColumn = vscode.ViewColumn.One;
            if (this._webviewPanel.viewColumn === vscode.ViewColumn.One) {
                viewColumn = vscode.ViewColumn.Beside;
            }
            // Set the text editor corresponding to doc to be visible
            vscode.window.showTextDocument(this.doc, { preserveFocus: true, preview: false, viewColumn });
        }
        this.visible = this._webviewPanel.visible;
    }

    /**
     * Handle document content change events
     * @param {vscode.TextDocumentChangeEvent} event content change event
     */
    private async handleChangeTextDocumentEvent(event: vscode.TextDocumentChangeEvent) {
        const { document, contentChanges } = event;
        if (document.uri.toString() === this.doc.uri.toString()) {
            for (const change of contentChanges) {
                // 增量更新语法树
                this.astTree = await editTree(this.astTree, change, document);
            }
            if (contentChanges.length > 0) {
                await this.refreshWebview();
            }
        }
    }

    /**
     * Handle text editor selection change events
     * @param {vscode.TextEditorSelectionChangeEvent} event text editor change event
     */
    private handleTextEditorChangeSelectEvent(event: vscode.TextEditorSelectionChangeEvent) {
        const { textEditor, selections, kind } = event;
        const eventDoc = textEditor.document;
        const activeEditor = vscode.window.activeTextEditor;
        if (kind === vscode.TextEditorSelectionChangeKind.Mouse) {
            textEditor.setDecorations(selectedDecorationType, []);
        }
        if (
            !this._webviewPanel.active &&
            activeEditor?.document.uri.toString() === eventDoc.uri.toString() &&
            this.visible &&
            this.doc.uri.toString() === eventDoc.uri.toString()
        ) {
            const { anchor, active, isReversed, isEmpty } = selections[0];
            let startPosition: Point, endPosition: Point;
            if (isEmpty) {
                const range = eventDoc.getWordRangeAtPosition(anchor);
                if (range) {
                    startPosition = EditRange.asTSPoint(range.start);
                    endPosition = EditRange.asTSPoint(range.end);
                }
            } else {
                startPosition = EditRange.asTSPoint(isReversed ? active : anchor);
                endPosition = EditRange.asTSPoint(isReversed ? anchor : active);
            }

            // @ts-ignore
            if (startPosition && endPosition) {
                const gotoNode = this.astTree.rootNode.descendantForPosition(startPosition, endPosition);
                this._webviewPanel.webview.postMessage({
                    command: "gotoNode",
                    data: JSON.stringify(new MiniNode(gotoNode)),
                });
            }
        }
    }

    /**
     * Query syntax tree nodes
     * 
     * @param queryText Query Statement
     */
    querySyntaxNode(queryText: string) {
        this.editorDecorationer.clear();
        Colors.reset();
        try {
            let flatCaptures: MiniCapture[] = [];
            if (queryText && this.state.enableQuery) {
                const query = this.tsParser.getLanguage().query(queryText);
                const matches = query.matches(this.astTree.rootNode);
                for (const { pattern, captures } of matches) {
                    for (const { name, node } of captures) {
                        const miniNode = new MiniNode(node);
                        const color = Colors.getColorForCaptureName(name);
                        flatCaptures.push({ pattern, name, node: miniNode, color });
                        this.editorDecorationer.renderCaptureRange(miniNode, color);
                    }
                }

            }
            this._webviewPanel.webview.postMessage({ command: 'queryDone', data: flatCaptures });

        } catch (error: any) {
            const data = Object.assign({}, error);
            // An explicit assignment must be made
            data.message = error.message;
            this._webviewPanel.webview.postMessage({ command: 'queryError', data });
        }
    }

    /**
     * Setting up log output
     */
    private setLogOutput() {
        if (this.state.logOutput) {
            this.tsParser.setLogger((message: string, params: { [param: string]: string }, type: any) => {
                // Adapt different versions of log interfaces by judging type
                if (type) {
                    let paramsText = "";
                    for (const key in params) {
                        paramsText += `\t${key}: ${params[key]}`;
                    }
                    logOutput.appendLine(`[${type}]: ${message}. params:\n${paramsText}`);
                } else {
                    logOutput.appendLine(`${params ? "\t" : ""}${message}`);
                }
            });
            logOutput.show();
        } else {
            this.tsParser.setLogger(null);
        }
    }

    /**
     * Convert the path to a Webview URI
     * 
     * @param {...string} paths path
     * @returns {vscode.Uri} Webview URI
     */
    private asWebviewUri(...paths: string[]): vscode.Uri {
        const path = vscode.Uri.joinPath(ASTWebviewManager.extensionContext.extensionUri, "resources", ...paths);
        return this._webviewPanel.webview.asWebviewUri(path);
    }

    /**
     * Refresh Webview content
     */
    async refreshWebview() {
        this.state.nodes = [];
        await handlerSyntaxNodeByRecursion(this.astTree.rootNode, (node, walk) => {
            if (this.state.showAnonymousNodes || walk.nodeIsNamed) {
                this.state.nodes.push(new MiniNode(node, walk));
            }
        });

        this._webviewPanel.webview.postMessage({
            command: "refresh",
            data: JSON.stringify(this.state),
        });
    }

    /**
     * Get HTML content
     * 
     * @returns {string} HTML content
     */
    private getHtml(): string {
        const styleVSCodeUri = this.asWebviewUri("css", "vscode.css");
        const astEditorUri = this.asWebviewUri("css", "astEditor.css");
        const scriptUri = this.asWebviewUri("..", "dist/webviewScript.js");
        const editorWorkJsUri = this.asWebviewUri("..", "dist/editor.worker.js");
        const cspSource = this._webviewPanel.webview.cspSource;
        const nonce = getNonce();
        return /* html */ `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <!-- 使用内容安全策略限制资源加载
                <meta
                    http-equiv="Content-Security-Policy"
                    content="default-src 'none'; img-src ${cspSource}; style-src ${cspSource}; script-src 'nonce-${nonce}';"/>
                 -->
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Syntax Tree</title>
                <link href="${styleVSCodeUri}" rel="stylesheet" />
                <link href="${astEditorUri}" rel="stylesheet" />
                <script nonce="${nonce}">const editorWorkJsUri='${editorWorkJsUri}';</script>
            </head>
            <body data-vscode-context='{"preventDefaultContextMenuItems": true}'>
                <div class="tool-container">
                    <div class="tool-item">
                        <input type="checkbox" id="log-output-checkbox" ></input>
                        <label for="log-output-checkbox">显示日志</label>
                    </div>
                    <div class="tool-item">
                        <input type="checkbox" id="show-anonymous-checkbox" ></input>
                        <label for="show-anonymous-checkbox">显示匿名节点</label>
                    </div>
                    <div class="tool-item">
                        <input type="checkbox" id="node-mapping-checkbox" ></input>
                        <label for="node-mapping-checkbox">映射节点</label>
                    </div>
                    <div class="tool-item"> <!-- TODO 功能未实现，暂时不显示 -->
                        <input type="checkbox" id="enabled-query-checkbox"></input>
                        <label for="enabled-query-checkbox">启用查询</label>
                    </div><br>
                </div>
                <div class="query-container" id="query-container" style="border-bottom: 1px solid #333333; height: 150px;">
                </div>
                <div id="row-resize"></div>
                <div class="split-line"><div>Abstract Syntax Tree: </div></div>
                <div id="output-container-scroll">
                    <div class="tree-container" id="tree-container">
                        <div class="row-number-container" id="row-number-container"></div>
                        <div id="output-container" class="highlight" tabindex="0" style="counter-increment: clusterize-counter -1">
                        </div>
                    </div>
                </div>
            </body>
            <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
        </html>
        `;
    }
}

/**
 * Generate a random string
 */
function getNonce(): string {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
