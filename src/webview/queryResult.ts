import { AstWebviewState } from "../astView";
import { MiniCapture } from "../tsParser";
const COLORS: string[] = ['#80cbc4', '#ffb757', '#e0b8ff', '#ff9492', '#56d364', '#a5d6ff', '#ffa198', '#d2a8ff', '#ff7b72', '#7ee787', '#ffa657', '#9ca3af', '#79c0ff'];
let NAMES: string[] = [];
const resultDecorativerCache: Map<number, ResultDecorativer> = new Map();

/**
 * 清除查询结果的样式
 */
function clear() {
    resultDecorativerCache.forEach((value) => value.remove())
    resultDecorativerCache.clear();
    NAMES = [];
}

/**
 * 根据捕获的名称计算颜色的索引
 * @param name 捕获节点的名称
 * @returns 
 */
function getColor(name: string): string {
    let index = NAMES.indexOf(name);
    if (index === -1) {
        NAMES.push(name);
        index = NAMES.length - 1;
    }
    return COLORS[index % 13];
}

/**
 * 语法树查询结果的装饰器
 */
class ResultDecorativer {
    private syntaxNodeDom: HTMLElement | null = null;
    private topLineDom: HTMLElement | null = null;
    private textDom: HTMLElement | null = null;
    private identLineDoms?: NodeListOf<HTMLElement>;
    private captureNameDom: HTMLElement | null = null;

    constructor(private nodeId: number, private name: string, private color: string, private state: AstWebviewState) {
        // 捕获的语法树节点的DOM
        this.syntaxNodeDom = document.querySelector<HTMLElement>(`.row.row-id-${this.nodeId}`);

        if (this.syntaxNodeDom) {
            this.topLineDom = this.syntaxNodeDom.querySelector<HTMLElement>('.node-str');
            // 语法树节点类型文本DOM，要设置字体颜色
            this.textDom = this.syntaxNodeDom.querySelector<HTMLElement>('.node-link');
            const deep = this.syntaxNodeDom.getAttribute('data-deep')
            if (deep) {
                // 获取缩进线的DOM
                this.identLineDoms = document.querySelectorAll<HTMLElement>(`.row.sp-${this.nodeId} .indent.d-${deep}`);
            }
            this.captureNameDom = this.syntaxNodeDom.querySelector<HTMLElement>('.capture-name');
            if (!this.captureNameDom) {
                // 如果不存在，就创建一个
                this.captureNameDom = document.createElement('span');
                this.captureNameDom.classList.add('capture-name');
                this.syntaxNodeDom.appendChild(this.captureNameDom);
            }

        }
    }

    /**
     * 重置颜色样式
     */
    remove() {
        if (this.topLineDom) {
            this.topLineDom.style.borderTop = '';
            this.topLineDom.style.borderLeft = '';
        }
        this.textDom && (this.textDom.style.color = '');
        this.identLineDoms && this.identLineDoms.forEach(dom => {
            dom.style.borderLeft = '';
        });
        this.captureNameDom && this.captureNameDom.remove();
        setTimeout(() => { }, 0)
    }

    /**
     * 设置捕获节点的名称和颜色
     * @param name 捕获节点的名称
     * @param color 颜色
     * @returns 
     */
    set(name: string, color: string) {
        this.name = name;
        this.color = color;
        return this;
    }

    /**
     * 渲染样式
     */
    render() {
        this.setTopLineStyle();
        this.setNodeTypeTextStyle();
        this.setIdentLineStyle();
        this.setCaptureNameDomStyle();
        setTimeout(() => { }, 0)
    }

    /**
     * 设置上边框线的样式
     */
    setTopLineStyle() {
        if (this.topLineDom) {
            this.topLineDom.style.borderTop = `1px inset ${this.color}`;
            this.topLineDom.style.borderLeft = `1px inset ${this.color}`;
        }
    }

    /**
     * 设置节点类型文本的字体颜色
     */
    setNodeTypeTextStyle() {
        if (this.textDom) {
            this.textDom.style.color = this.color;
        }
    }

    /**
     * 设置缩进线的样式
     */
    setIdentLineStyle() {
        if (this.identLineDoms) {
            // 获取缩进线的DOM
            this.identLineDoms.forEach(element => {
                element.style.borderLeft = `1px inset ${this.color}`;
            });
        }
    }

    /**
     * 设置捕获名称Dom的样式
     */
    setCaptureNameDomStyle() {
        // 获取捕获名称的DOM，并设置样式
        if (this.captureNameDom) {
            this.captureNameDom.style.color = this.color;
            this.captureNameDom.style.border = `1px inset ${this.color}40`;
            this.captureNameDom.style.borderTop = `1px inset ${this.color}`;
            this.captureNameDom.style.backgroundColor = this.color + '40';
            this.captureNameDom.textContent = '@' + this.name;

            this.captureNameDom.addEventListener('mouseover', () => {
                this.captureNameDom!.style.border = `1px solid ${this.color}`;
                if (this.topLineDom) {
                    this.topLineDom.style.borderTop = `1px solid ${this.color}`;
                    this.topLineDom.style.borderLeft = `1px solid ${this.color}`;
                }
                this.identLineDoms && this.identLineDoms.forEach(dom => {
                    dom.style.borderLeft = `1px solid ${this.color}`;
                })
                if (this.state?.enableNodeMapping) {
                    this.textDom && this.textDom.click();
                }
            });
            this.captureNameDom.addEventListener('mouseout', () => {
                this.captureNameDom!.style.border = `1px inset ${this.color}40`;
                this.captureNameDom!.style.borderTop = `1px inset ${this.color}`;
                if (this.topLineDom) {
                    this.topLineDom.style.borderTop = `1px inset ${this.color}`;
                    this.topLineDom.style.borderLeft = `1px inset ${this.color}`;
                }
                this.identLineDoms && this.identLineDoms.forEach(dom => {
                    dom.style.borderLeft = `1px inset ${this.color}`;
                })
            })
            this.captureNameDom.addEventListener('click', () => {
                this.textDom && this.textDom.click();
            });
        }
    }
}

/**
 * 装饰语法树查询结果到语法树页面
 * @param captures 捕获的查询结果
 */
export function decorativeResults(captures: MiniCapture[] = [], state: AstWebviewState) {
    clear();
    for (const { name, node } of captures) {
        // 获取要渲染的颜色
        const color = getColor(name);
        let resultDecorativer = resultDecorativerCache.get(node.id);
        if (!resultDecorativer) {
            resultDecorativer = new ResultDecorativer(node.id, name, color, state);
            resultDecorativerCache.set(node.id, resultDecorativer);
        } else {
            resultDecorativer.set(name, color);
        }
        resultDecorativer.render();
    }

}

