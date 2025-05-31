import { Edit, Point } from "web-tree-sitter";
import * as vscode from "vscode";

/**
 * Indicates the code editing scope, used to update the syntax tree
 */
export class EditRange implements Edit {
    startIndex: number;
    oldEndIndex: number;
    newEndIndex: number;

    startPosition: Point;
    oldEndPosition: Point;
    newEndPosition: Point;

    /**
     * Constructor.
     * 
     * Create editing scope according to VSCode text change event
     * 
     * @param editChangeEvent VSCode text change event
     * @param document VSCode Document Object
     */
    constructor(
        editChangeEvent: vscode.TextDocumentContentChangeEvent, 
        document: vscode.TextDocument
    ) {
        const { range, rangeOffset, rangeLength, text } = editChangeEvent;

        this.startIndex = rangeOffset;
        this.oldEndIndex = rangeOffset + rangeLength;
        this.newEndIndex = rangeOffset + text.length;

        this.startPosition = EditRange.asTSPoint(range.start);
        this.oldEndPosition = EditRange.asTSPoint(range.end);
        this.newEndPosition = EditRange.asTSPoint(document.positionAt(this.newEndIndex));
    }

    /**
     * Convert VSCode's Position to Tree-sitter's Point
     * 
     * @param position VSCode's Position object
     * @returns Tree-sitter Point object
     */
    static asTSPoint(position: vscode.Position): Point {
        const { line, character } = position;
        return { row: line, column: character };
    }

    /**
     * Convert Tree-sitter's Point to VSCode's Position
     * 
     * @param Position Tree-sitter Point object
     * @returns VSCode's Position object
     */
    static asVsPosition(point: Point):vscode.Position{
        const {row, column} = point;

        return new vscode.Position(row, column);
    }
}
