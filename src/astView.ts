import path from "path";
import * as vscode from "vscode";
import Parser, { Tree } from "web-tree-sitter";
import { EditRange, editTree, getParser, handlerSyntaxNodeByRecursion, MiniNode } from "./parser";

// 日志输出
const logOutput = vscode.window.createOutputChannel("Tree-Sitter-Viewer", { log: true });

// 编辑器内的选中装饰类型，即编辑器内字符选中后的样式
const astWebviewSelectedDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "#125381",
    borderRadius: "4px",
});

/**
 * webview状态数据类型
 */
interface AstWebviewState {
    // 文档的uri地址
    docUri: string;
    // 扁平化的语法树节点数组
    nodes: MiniNode[];
    // 是否启用查询
    enableQuery: boolean;
    // 缓存的查询语句
    queryText: string;
    // 是否显示匿名节点
    showAnonymousNodes: boolean;
    // 是否启用节点映射
    enableNodeMapping: boolean;
    // 是否输出日志
    logOutput: boolean;
}

/**
 * 序列化的抽象语法树webview
 */
interface SerializeAstWebview {
    // 序列化的webview面板
    webviewPanel: vscode.WebviewPanel;
    // 序列化的状态数据
    state: AstWebviewState;
}

/**
 * ASTWebviewManager 类，用于管理语法树 Webview 的创建和恢复
 */
export class ASTWebviewManager {
    private static _extensionContext: vscode.ExtensionContext;
    private static _cache = new Map<string, AstWebview>();

    /**
     * 获取扩展上下文
     * @returns {vscode.ExtensionContext} 扩展上下文
     */
    public static get extensionContext(): vscode.ExtensionContext {
        return this._extensionContext;
    }

    /**
     * 初始化管理器
     * @param {vscode.ExtensionContext} extensionContext 扩展上下文
     */
    static initManager(extensionContext: vscode.ExtensionContext) {
        if (this._extensionContext) {
            console.error(`ASTWebviewManager has been initialized successfully.`);
            return;
        }
        this._extensionContext = extensionContext;
        // 注册一个web视图序列化器
        vscode.window.registerWebviewPanelSerializer(AstWebview.viewType, new AstWebviewSerializer());
    }

    /**
     * 创建一个语法树的web视图
     * @param {vscode.TextDocument} doc vscode打开的文档
     * @param {SerializeAstWebview} serializeWebview 可选，序列化的webview
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
     * 删除指定 URI 的缓存。
     *
     * @param uri - 要删除缓存的 URI。
     */
    static deleteCache(uri: vscode.Uri) {
        this._cache.delete(uri.toString());
    }
}

/**
 * AstWebviewSerializer 类，用于序列化和反序列化 Webview
 */
export class AstWebviewSerializer implements vscode.WebviewPanelSerializer<AstWebviewState> {
    /**
     * 反序列化 Webview
     * @param {vscode.WebviewPanel} webviewPanel Webview 面板
     * @param {any} state 在 Webview 中持久化的状态
     */
    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: AstWebviewState) {
        //恢复 Webview 的内容，确保我们保留传入的 `webviewPanel` 并恢复我们需要的任何事件监听器
        try {
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(state.docUri));
            ASTWebviewManager.createAstWebview(doc, { webviewPanel, state });
        } catch (error) {
            console.error(error);
        }
    }
}

/**
 * 语法树web视图类
 */
class AstWebview {
    public static readonly viewType = "tree-sitter-viewer.ast-webview";
    // 打开的代码文档
    private readonly doc: vscode.TextDocument;
    private _webviewPanel!: vscode.WebviewPanel;
    private visible: boolean = false;
    private state!: AstWebviewState;
    private tsParser!: Parser;
    private astTree!: Tree;
    public get webviewPanel() {
        return this._webviewPanel;
    }

    /**
     * 构造函数
     * @param {vscode.TextDocument} doc vscode打开的文档
     * @param {SerializeAstWebview} serializeAstWebview 序列化的Webview
     */
    constructor(doc: vscode.TextDocument, serializeAstWebview?: SerializeAstWebview) {
        this.doc = doc;

        // 初始化webview面包
        this.initWebviewPanel(serializeAstWebview);

        // 获取解析器解析语法树并刷新web页面
        getParser(doc.languageId).then((parser) => {
            this.tsParser = parser;
            this.astTree = this.tsParser.parse(doc.getText());
            // 设置日志
            this.setLogOutput();
            // 刷新web页面
            this.refreshWebview();
        });
    }

    /**
     * 初始化webview面板
     * @param serializeAstWebview vscode序列化的webview
     */
    private initWebviewPanel(serializeAstWebview?: SerializeAstWebview) {
        if (serializeAstWebview) {
            this._webviewPanel = serializeAstWebview.webviewPanel;
            this.state = serializeAstWebview.state;
        } else {
            // 创建一个新的webviewPanel
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
                enableNodeMapping: true,
                logOutput: false,
            };
        }
        this.visible = this._webviewPanel.visible;
        this.handlerEvent();
        // 更新webview页面内容
        this._webviewPanel.webview.html = this.getHtml();
    }

    /**
     * 处理事件监听
     */
    private handlerEvent() {
        // 监听由webview传递的消息
        const receiveMessageDispose = this._webviewPanel.webview.onDidReceiveMessage((event) =>
            this.handleReceiveMessageEvent(event)
        );
        // 监听webview的状态变化
        const webviewSateChangeDispose = this._webviewPanel.onDidChangeViewState((event) =>
            this.handleChangeViewStateEvent(event)
        );
        // 监听文档的修改事件
        const textDocChangeDispose = vscode.workspace.onDidChangeTextDocument((event) =>
            this.handleChangeTextDocumentEvent(event)
        );
        // 监听文本编辑器的滚动事件
        const changeVisibleRangesDispose = vscode.window.onDidChangeTextEditorVisibleRanges((event) =>
            this.handleChangeTextEditorVisibleRangesEvent(event)
        );
        // 监听编辑器的点击和文本选中事件
        const changeSelectionDispose = vscode.window.onDidChangeTextEditorSelection((event) =>
            this.handleTextEditorChangeSelectEvent(event)
        );
        // webview销毁事件
        this._webviewPanel.onDidDispose(() => {
            receiveMessageDispose.dispose();
            webviewSateChangeDispose.dispose();
            textDocChangeDispose.dispose();
            changeVisibleRangesDispose.dispose();
            changeSelectionDispose.dispose();
            ASTWebviewManager.deleteCache(this.doc.uri);
        });
    }

    /**
     * 处理接收消息事件
     * @param {any} event 接收到的消息事件
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
                    // 获取当前活动的文本编辑器
                    const editor = vscode.window.visibleTextEditors.find(
                        (editor) => editor.document.uri.toString() === this.doc.uri.toString()
                    );

                    if (editor) {
                        const selectRange: vscode.Range[] = [];
                        editor.setDecorations(astWebviewSelectedDecorationType, selectRange);
                        if (startIndex && endIndex) {
                            const start = this.doc.positionAt(startIndex);
                            const end = this.doc.positionAt(endIndex);
                            // 设置编辑器的选中内容
                            editor.selection = new vscode.Selection(start, end);

                            selectRange.push(new vscode.Range(start, end));
                            editor.setDecorations(astWebviewSelectedDecorationType, selectRange);
                            // 滚动到选中的内容
                            editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenter);
                        }
                    }
                }
                break;
            case "enableQuery":
                this.state.enableQuery = value;
                break;
            case "queryNode":
                this.state.queryText = value;
            // TODO 实现节点查询功能
            case "logOutput":
                this.state.logOutput = value;
                this.setLogOutput();
            default:
        }
    }

    /**
     * 处理视图状态变化事件
     * @param {vscode.WebviewPanelOnDidChangeViewStateEvent} event 视图状态变化事件
     */
    private handleChangeViewStateEvent(event: vscode.WebviewPanelOnDidChangeViewStateEvent) {
        if (!this.visible && this._webviewPanel.visible) {
            // 刷新视图内容
            this.refreshWebview();
            let viewColumn = vscode.ViewColumn.One;
            if (this._webviewPanel.viewColumn === vscode.ViewColumn.One) {
                viewColumn = vscode.ViewColumn.Beside;
            }
            // 将doc对应的文本编辑器设置为可见状态
            vscode.window.showTextDocument(this.doc, { preserveFocus: true, preview: false, viewColumn });
        }
        this.visible = this._webviewPanel.visible;
    }

    /**
     * 处理文档内容变化事件
     * @param {vscode.TextDocumentChangeEvent} event 文档内容变化事件
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
     * 处理文本编辑器可见范围变化事件
     * @param {vscode.TextEditorVisibleRangesChangeEvent} event 文本编辑器可见范围变化事件
     */
    private handleChangeTextEditorVisibleRangesEvent(event: vscode.TextEditorVisibleRangesChangeEvent) {
        // 使用此方式同步滚动语法树web视图的体验不太好，暂时注释该代码
        /*const { textEditor, visibleRanges } = event;
        const eventDoc = textEditor.document;
        const activeEditor = vscode.window.activeTextEditor;
        if (
            activeEditor?.document.uri.toString() === eventDoc.uri.toString() &&
            this.state.enableNodeMapping &&
            this.visible &&
            this.doc.uri.toString() === eventDoc.uri.toString()
        ) {
            this._webviewPanel.webview.postMessage({
                command: "scroll",
                data: JSON.stringify(visibleRanges[0].start),
            });
        } */
    }

    /**
     * 处理文本编辑器选择变化事件
     * @param {vscode.TextEditorSelectionChangeEvent} event 文本编辑器选择变化事件
     */
    private handleTextEditorChangeSelectEvent(event: vscode.TextEditorSelectionChangeEvent) {
        const { textEditor, selections, kind } = event;
        const eventDoc = textEditor.document;
        const activeEditor = vscode.window.activeTextEditor;
        if (kind === vscode.TextEditorSelectionChangeKind.Mouse) {
            textEditor.setDecorations(astWebviewSelectedDecorationType, []);
        }
        if (
            this.state.enableNodeMapping &&
            !this._webviewPanel.active &&
            activeEditor?.document.uri.toString() === eventDoc.uri.toString() &&
            this.visible &&
            this.doc.uri.toString() === eventDoc.uri.toString()
        ) {
            const { anchor, active, isReversed, isEmpty } = selections[0];
            let startPosition: Parser.Point, endPosition: Parser.Point;
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
     * 设置日志输出
     */
    private setLogOutput() {
        if (this.state.logOutput) {
            this.tsParser.setLogger((message, params: { [param: string]: string }, type) => {
                // 通过判断type以适配不同版本的日志接口
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
     * 将路径转换为 Webview URI
     * @param {...string} paths 路径
     * @returns {vscode.Uri} Webview URI
     */
    private asWebviewUri(...paths: string[]): vscode.Uri {
        const path = vscode.Uri.joinPath(ASTWebviewManager.extensionContext.extensionUri, "resources", ...paths);
        return this._webviewPanel.webview.asWebviewUri(path);
    }

    /**
     * 刷新 Webview 内容
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
     * 获取 HTML 内容
     * @returns {string} HTML 内容
     */
    private getHtml(): string {
        const styleVSCodeUri = this.asWebviewUri("css", "vscode.css");
        const astEditorUri = this.asWebviewUri("css", "astEditor.css");
        const scriptUri = this.asWebviewUri("js", "astView.js");
        const cspSource = this._webviewPanel.webview.cspSource;
        const nonce = getNonce();
        return /* html */ `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <!-- 使用内容安全策略限制资源加载 -->
                <meta
                    http-equiv="Content-Security-Policy"
                    content="default-src 'none'; img-src ${cspSource}; style-src ${cspSource}; script-src 'nonce-${nonce}';"/>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Syntax Tree</title>
                <link href="${styleVSCodeUri}" rel="stylesheet" />
                <link href="${astEditorUri}" rel="stylesheet" />
            </head>
            <body>
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
                <div class="query-container" id="query-container">
                    <label>查询语句：</label>
                    <textarea id="query-input" placeholder="此功能还没有实现。qwq"></textarea>
                </div>
                <div class="split-line"><div>Tree: </div><hr /></div>
                <div id="output-container-scroll">
                    <div class="tree-container" id="tree-container">
                        <div class="row-number-container" id="row-number-container"></div>
                        <div id="output-container" class="highlight" tabindex="0" style="counter-increment: clusterize-counter -1">
                        </div>
                    </div>
                </div>
            </body>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </html>
        `;
    }
}

/**
 * 生成随机字符串
 * @returns {string} 随机字符串
 */
function getNonce(): string {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
