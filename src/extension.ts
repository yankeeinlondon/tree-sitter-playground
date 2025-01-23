import * as vscode from "vscode";
import { AstEditorProvider } from "./astEditor";
import { ASTWebviewManager } from "./astView";

/**
 * 扩展插件的入口函数，激活扩展时将调用此方法
 * @param context 扩展插件的上下文
 */
export function activate(context: vscode.ExtensionContext) {
    ASTWebviewManager.initManager(context);
    // 注册抽象语法树编辑器AstEditor
    const astEditorProvider = new AstEditorProvider(context);
    const astEditorDisposable = vscode.window.registerCustomEditorProvider(
        AstEditorProvider.viewType,
        astEditorProvider
    );
    context.subscriptions.push(astEditorDisposable);

    // 注册查看语法树命令
    const disposable = vscode.commands.registerCommand("tree-sitter-viewer.view-syntax-tree", viewSyntaxTreeCommand);
    context.subscriptions.push(disposable);
}

// 停用扩展时将调用此方法
export function deactivate() { }

/**
 * 查看语法树命令处理函数
 * @param args
 * @returns
 */
async function viewSyntaxTreeCommand(uri: vscode.Uri) {
    let resource: vscode.Uri = uri, doc: vscode.TextDocument | undefined;
    if (resource) {
        const editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
        if (!editor || (resource.toString() !== editor.document.uri.toString())) {
            await vscode.commands.executeCommand('vscode.open', resource);
        }
        doc = vscode.window.activeTextEditor?.document;
    }

    if (!doc) {
        vscode.window.showInformationMessage("No provided any resources");
        return;
    }
    ASTWebviewManager.createAstWebview(doc);
}