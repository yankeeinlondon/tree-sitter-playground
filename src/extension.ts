import * as vscode from "vscode";
import { ASTWebviewManager } from "./astView";

/**
 * The entry function of the extension plug-in. This method 
 * will be called when the extension is activated.
 * @param context Extension context
 */
export function activate(context: vscode.ExtensionContext) {
    // Initialize Ast webview manager
    ASTWebviewManager.initManager(context);
    // Register to view the syntax tree command
    const disposable = vscode.commands.registerCommand("tree-sitter-viewer.view-syntax-tree", viewSyntaxTreeCommand);
    context.subscriptions.push(disposable);
}

/** This method will be called when the extension is disabled */
export function deactivate() { }

/**
 * View syntax tree command processing function
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
