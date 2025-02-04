const queryContainer = document.getElementById('query-container');
const showAnonymousCheckbox = document.getElementById('show-anonymous-checkbox');
const enableQueryCheckbox = document.getElementById('enabled-query-checkbox');

const vscode = acquireVsCodeApi();
class GlobalState {
    docUri = "";
    nodes = [];
    enableQuery = false;
    showAnonymousNodes = false;
    constructor(state = {}) {
        Object.assign(this, state);
    }

    setDocUri(value) {
        this.docUri = value;
        vscode.setState(this);
    }
    
    setNodes(value = []) {
        this.nodes = value;
        vscode.setState(this);
        updateTree(this.nodes);
    }

    setEnableQuery(value) {
        this.enableQuery = value;
        vscode.setState(this);
        enableQueryCheckbox.checked = value;
        queryContainer.style.display = this.enableQuery  ? "block" : "none";
    }

    setShowAnonymousNodes(value) {
        this.showAnonymousNodes = value;
        vscode.setState(this);
        showAnonymousCheckbox.checked = value;
    }
}

(function () {
    const globalState = new GlobalState();// 每次重新加载页面时尝试恢复状态中的数据
    const state = vscode.getState();
    
    console.log("GLOBAL STATE", state);
    if (state) {
        state.nodes && globalState.setNodes(state.nodes);
        globalState.setEnableQuery(state.enableQuery);
        globalState.setShowAnonymousNodes(state.showAnonymousNodes);
    }

    // 发送一个消息
    vscode.postMessage({
        command: 'alert',
        text: '🐛  on line '
    });

    // 添加接收消息的监听
    window.addEventListener('message', event => {
        const message = event.data; // The JSON data our extension sent
        switch (message.command) {
            case 'update':
                const { docUri, nodes } = message;
                globalState.setDocUri(docUri);
                globalState.setNodes(nodes);
                break;
            case 'scroll':
                // TODO 随编辑器滚动
                break;
            case 'goto':
                // 定位到指定节点
                break;
        }
    });

    showAnonymousCheckbox.addEventListener('change', (that, event) => {
        globalState.setShowAnonymousNodes(showAnonymousCheckbox.checked);
    });
    enableQueryCheckbox.addEventListener('change', (that, event) => {
        globalState.setEnableQuery(enableQueryCheckbox.checked);
    });
})();

/**
 * 更新语法树
 * @param {[*]} nodes 
 */
function updateTree(nodes) {
    const nodeArray = JSON.parse(nodes);
    const htmls = treeNodeToHtml(nodeArray);
    const rowContianer = document.getElementById('output-container');
    const rowNumberContainer = document.getElementById('row-number-container');
    rowContianer.innerHTML = htmls.rows;
    rowNumberContainer.innerHTML = htmls.rowNumbers;
}

function treeNodeToHtml(nodes) {
    let rows = "", rowNumbers = "";
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const { row: startRow, column: startColumn } = node.startPosition;
        const { row: endRow, column: endColumn } = node.endPosition;
        // 设置缩进
        const indentHtml = `<span class="indent">&nbsp;&nbsp;&nbsp;&nbsp;</span>`.repeat(node.level);
        rows += `<div class="row">${indentHtml}${node.fieldName && node.fieldName + ': '}<a class="node-link ${node.isNamed ? 'named' : 'anonymous'}" href="#" data-id="${node.id}" data-range="${startRow},${startColumn},${endRow},${endColumn}">${node.type}</a> <span class="position-info">[${startRow},${startColumn}] - [${endRow},${endColumn}]</span></div>`;
        rowNumbers += `<div class="row">${i + 1}</div>`;
    }
    return { rows, rowNumbers };
}