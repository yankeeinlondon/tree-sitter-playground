import { Point, TreeCursor } from "web-tree-sitter";
import { SyntaxNode } from "~/types";

/**
 * Represents a simplified node of the syntax tree, containing 
 * basic information about the node
 */
export class MiniNode {
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
    parentId?: number;
    children?: Array<MiniNode>;
    namedChildren?: Array<MiniNode>;
    childCount: number;
    namedChildCount: number;
    descendantCount: number;
    level: number;
    fieldId: number;
    fieldName?: string;

    /**
     * Constructor, creates a simplified node based on the syntax node of Tree-sitter
     * @param node Tree-sitter Node (from web-tree-sitter)
     * @param walk Tree-sitter cursor object
     */
    constructor(node: SyntaxNode, walk?: TreeCursor) {
        this.id = node.id;
        this.typeId = node.typeId;
        this.grammarId = node.grammarId;
        this.type = node.type;
        this.grammarType = node.grammarType;
        this.isNamed = node.isNamed;
        this.isMissing = node.isMissing;
        this.isExtra = node.isExtra;
        this.hasChanges = node.hasChanges;
        this.hasError = node.hasError;
        this.isError = node.isError;
        this.text = node.text;
        this.parseState = node.parseState;
        this.nextParseState = node.nextParseState;
        this.startPosition = node.startPosition;
        this.endPosition = node.endPosition;
        this.startIndex = node.startIndex;
        this.endIndex = node.endIndex;
        this.parentId = node.parent?.id;
        this.childCount = node.childCount;
        this.namedChildCount = node.namedChildCount;
        this.descendantCount = node.descendantCount;
        this.level = walk?.currentDepth || 0;
        this.fieldId = walk?.currentFieldId || -1;
        this.fieldName = walk?.currentFieldName || "";
    }
}

