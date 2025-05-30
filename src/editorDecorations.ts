import * as vscode from "vscode";
import { MiniNode } from "./tsParser";

/**
 * `DecorationType` class definition
 */
class DecorationType {
    private _decorationType: vscode.TextEditorDecorationType;
    private _ranges: vscode.Range[] = [];
    constructor(color: string, private editor: vscode.TextEditor) {
        this._decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: color,
            color: '#FFFFFF',
            borderRadius: "4px",

        });
    }

    get decorationType() {
        return this._decorationType;
    }
    get ranges() {
        return this._ranges;
    }

    /**
     * Renders the specified range
     * @param range 
     */
    render(range: vscode.Range) {
        this._ranges.push(range);
        this.editor.setDecorations(this._decorationType, this._ranges);
    }

    /**
     * Clean up all the decorations
     */
    clear() {
        this._ranges = [];
        this.editor.setDecorations(this._decorationType, this._ranges);
    }
}

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
const editorDecorationType: Map<string, DecorationType> = new Map();

/**
 * Get the decoration type corresponding to the color
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


/**
 * Editor Decorator
 */
export class EditorDecorationer {
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
