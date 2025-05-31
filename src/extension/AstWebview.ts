import * as vscode from "vscode";
import { Parser, Tree } from "web-tree-sitter";
import { AstWebviewState } from "~/types";
import { EditorDecorator } from "./EditorDectorator";
import { SerializeAstWebview } from "./SerializeAstWebview";
import { ASTWebviewManager } from "./AstWebviewManager";
import { logOutput, selectedDecorationType } from "./utils";
import { getParser } from "./treeParser";

/**
 * Syntax tree web view class
 */
export class AstWebview {
    public static readonly viewType = "tree-sitter-playground.ast-webview";
    // Open code document
    private readonly doc: vscode.TextDocument;
    private _webviewPanel!: vscode.WebviewPanel;
    private visible: boolean = false;
    private state!: AstWebviewState;
    private tsParser!: Parser;
    private astTree!: Tree;
    private editorDecorationer!: EditorDecorator;
    public get webviewPanel() {
        return this._webviewPanel;
    }

    /**
     * Constructor
     * 
     * @param {vscode.TextDocument} doc documents opened by vscode
     * @param {SerializeAstWebview} serializeAstWebview serialized Webview
     */
    constructor(
        doc: vscode.TextDocument, 
        serializeAstWebview?: SerializeAstWebview
    ) {
        this.doc = doc;

        // Initialize webview panel
        this.initWebviewPanel(serializeAstWebview);

        // Get the parser to parse the syntax tree and refresh the web page
        getParser(doc.languageId).then((parser) => {
            this.tsParser = parser;
            this.astTree = this.tsParser.parse(doc.getText()) as Tree;
            // Setting up logging
            this.setLogOutput((message: string, isLex: boolean) => {
                logOutput.appendLine(`[${isLex ? 'LEX' : 'PARSE'}]: ${message}`);
            });
            // Refresh the web page
            this.refreshWebview();
        });

        /** The **editor** of the current document */
        const editor = vscode.window.visibleTextEditors.find(
            (editor) => editor.document.uri.toString() === this.doc.uri.toString()
        );

        if (editor) {
            // Initialize the editor decorator
            this.editorDecorationer = new EditorDecorator(editor);
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
                this.setLogOutput((message: string, isLex: boolean) => {
                    logOutput.appendLine(`[${isLex ? 'LEX' : 'PARSE'}]: ${message}`);
                });
                break;
            default:
        }
    }

    /**
     * Handling view state change events
     * 
     * @param {vscode.WebviewPanelOnDidChangeViewStateEvent} event View state change events
     */
    private handleChangeViewStateEvent(_event: vscode.WebviewPanelOnDidChangeViewStateEvent) {
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
                // Incremental update syntax tree
                this.astTree = await editTree(this.astTree, change, document) as Tree;
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
                const gotoNode = this.astTree.rootNode.descendantForPosition(startPosition, endPosition) as Node;
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
            if (queryText && this.state.enableQuery && this.tsParser.language) {
                // web-tree-sitter >=0.25.0: use new Query(language, queryText)
                const query = new Query(this.tsParser.language, queryText);
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
    private setLogOutput(callback?: (message: string, isLex: boolean) => void) {
        if (this.state.logOutput && callback) {
            this.tsParser.setLogger(callback);
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
                <!-- Restricting resource loading using Content Security Policy
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
                        <label for="log-output-checkbox">Show logs</label>
                    </div>
                    <div class="tool-item">
                        <input type="checkbox" id="show-anonymous-checkbox" ></input>
                        <label for="show-anonymous-checkbox">Show anonymous nodes</label>
                    </div>
                    <div class="tool-item">
                        <input type="checkbox" id="node-mapping-checkbox" ></input>
                        <label for="node-mapping-checkbox">Mapping nodes</label>
                    </div>
                    <div class="tool-item"> <!-- TODO Function not implemented, not displayed for the time being -->
                        <input type="checkbox" id="enabled-query-checkbox"></input>
                        <label for="enabled-query-checkbox">Enable query</label>
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
