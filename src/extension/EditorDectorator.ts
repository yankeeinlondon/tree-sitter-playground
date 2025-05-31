import * as vscode from "vscode";
import { MiniNode } from "~/shared";
import { 
    editorDecorationType, 
    getDecorationTypeForColor, 
    selectedDecorationType 
} from "./utils";

/**
 * Editor Decorator
 */
export class EditorDecorator {
    private doc: vscode.TextDocument;
    constructor(private editor: vscode.TextEditor) {
        this.doc = editor.document;
    }

    /**
     * Render the selected range
     * 
     * @param startIndex 
     * @param endIndex 
     */
    renderSelectRange(startIndex: number, endIndex: number) {
        this.editor.setDecorations(selectedDecorationType, []);
        if (startIndex && endIndex) {
            const start = this.doc.positionAt(startIndex);
            const end = this.doc.positionAt(endIndex);
            
            this.editor.setDecorations(
                selectedDecorationType, 
                [new vscode.Range(start, end)]
            );
            // Scroll to selected content
            this.editor.revealRange(
                new vscode.Selection(start, end), vscode.TextEditorRevealType.InCenter
            );
        }
    }

    /**
     * Rendering capture node range
     * 
     * @param node 
     * @param color 
     */
    renderCaptureRange(node: MiniNode, color: string) {
        const decorationType = getDecorationTypeForColor(color, this.editor);
        const start = this.doc.positionAt(node.startIndex);
        const end = this.doc.positionAt(node.endIndex);
        decorationType.render(new vscode.Range(start, end));
    }

    /**
     * Clean up all the decorations
     */
    clear() {
        editorDecorationType.forEach((value) => value.clear());
        this.editor.setDecorations(selectedDecorationType, []);
    }
}
