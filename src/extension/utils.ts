import * as vscode from "vscode";
import { DecorationType } from "./DecorationType";


/** 
 * The selected decoration type in the editor, that is, the style of the selected 
 * character in the editor
 */
export const selectedDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "#125381 !important",
    borderRadius: "4px",
    color: "#ea00b1",
    fontWeight: "bold",
    border: "1px solid #ea00b1",
});

/** Color decoration type in editor */
export const editorDecorationType: Map<
    string, 
    DecorationType
> = new Map();

/**
 * Get the decoration type corresponding to the color
 * 
 * @param color 
 * @param editor 
 * @returns 
 */
export function getDecorationTypeForColor(color: string, editor: vscode.TextEditor): DecorationType {
    if (editorDecorationType.has(color)) {
        return editorDecorationType.get(color)!;
    }
    const decorationType = new DecorationType(color, editor);
    editorDecorationType.set(color, decorationType);
    return decorationType;
}


/** Log Output */
export const logOutput = vscode.window.createOutputChannel(
    "Tree-Sitter-Playground", 
    { log: true }
);



/**
 * Generate a random string
 */
export function getNonce(): string {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
