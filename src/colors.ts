const COLORS: string[] = ['#80cbc4', '#ffb757', '#e0b8ff', '#ff9492', '#56d364', '#a5d6ff', '#ffa198', '#d2a8ff', '#ff7b72', '#7ee787', '#ffa657', '#9ca3af', '#79c0ff'];
let NAMES: string[] = [];


export class Colors {
    /**
     * 根据捕获的名称计算颜色的索引
     * @param name 捕获节点的名称
     * @returns 
     */
    static getColorForCaptureName(name: string): string {
        let index = NAMES.indexOf(name);
        if (index === -1) {
            NAMES.push(name);
            index = NAMES.length - 1;
        }
        return COLORS[index % 13];
    }

    /**
     * 重置颜色样式
     */
    static reset() {
        NAMES = [];
    }
}