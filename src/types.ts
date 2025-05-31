import { Point, TreeCursor } from "web-tree-sitter";
import type { MiniNode } from "./shared/MinNode";

// This covers the properties used in this file. Extend as needed.
export type SyntaxNode = {
    id: number;
    typeId: number;
    grammarId: number;
    type: string;
    grammarType: string;
    isNamed: boolean;
    isMissing: boolean;
    isExtra: boolean;
    hasChanges: boolean;
    hasError: boolean;
    isError: boolean;
    text: string;
    parseState: number;
    nextParseState: number;
    startPosition: Point;
    endPosition: Point;
    startIndex: number;
    endIndex: number;
    parent?: SyntaxNode | null;
    childCount: number;
    namedChildCount: number;
    descendantCount: number;
    walk(): TreeCursor;
    // ...add more if needed
};


/**
 * Tree-sitter query error
 */
export interface QueryError extends RangeError{
    // The character index where the error occurs
    index: number;
    // Character length
    length: number;
}

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

export interface MiniCapture{
    pattern: number;
    color: string;
    name: string;
    node: MiniNode;
}
