const queryContainer = document.getElementById('query-container');
const queryTextarea = document.getElementById('query-input');
const showAnonymousCheckbox = document.getElementById('show-anonymous-checkbox');
const enableQueryCheckbox = document.getElementById('enabled-query-checkbox');
const editorSyncCheckbox = document.getElementById('editor-sync-checkbox');

const vscode = acquireVsCodeApi();
class GlobalState {
    docUri = "";
    nodes = [];
    enableQuery = false;
    queryText = '';
    showAnonymousNodes = false;
    enableEditorSync = true;

    setState(state) {
        Object.assign(this, state);
        vscode.setState(this);

        showAnonymousCheckbox.checked = this.showAnonymousNodes;
        enableQueryCheckbox.checked = this.enableQuery;
        editorSyncCheckbox.checked = this.enableEditorSync;
        queryTextarea.value = this.queryText;
        queryContainer.style.display = this.enableQuery ? "block" : "none";

        updateTree(this.nodes);
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
        queryContainer.style.display = this.enableQuery ? "block" : "none";
    }

    setQueryText(value) {
        this.queryText = value;
        vscode.setState(this);
    }

    setShowAnonymousNodes(value) {
        this.showAnonymousNodes = value;
        vscode.setState(this);
    }
    setEnableEditorSync(value) {
        this.enableEditorSync = value;
        vscode.setState(this);
    }
}

(function () {
    const globalState = new GlobalState();// 每次重新加载页面时尝试恢复状态中的数据

    // 添加接收消息的监听
    window.addEventListener('message', event => {
        const { command, data } = event.data;
        switch (command) {
            case 'refresh':
                globalState.setState(JSON.parse(data));
                break;
            case 'scroll':
                // 随编辑器滚动
                const { line } = JSON.parse(data);
                const items = document.getElementsByClassName(`row-${line}`);
                items && items[0].scrollIntoView({
                    behavior: 'smooth', // 平滑滚动
                    block: 'start' // 元素顶部对齐视口顶部
                })
                break;
            case 'goto':
                // 定位到指定节点
                break;
        }
    });

    showAnonymousCheckbox.addEventListener('change', (that, event) => {
        const checked = showAnonymousCheckbox.checked;
        vscode.postMessage({ command: 'showAnonymousNodes', value: checked });
        globalState.setShowAnonymousNodes(checked);
    });
    enableQueryCheckbox.addEventListener('change', (that, event) => {
        globalState.setEnableQuery(enableQueryCheckbox.checked);
    });
    queryTextarea.addEventListener('change', (that, event) => {
        globalState.setQueryText(queryTextarea.value);
    });
    editorSyncCheckbox.addEventListener('change', (that, event) => {
        const checked = editorSyncCheckbox.checked;
        vscode.postMessage({ command: 'enableEditorSync', value: checked });
        globalState.setEnableEditorSync(editorSyncCheckbox.checked);
    });
})();

/**
 * 更新语法树
 * @param {[*]} nodes 
 */
function updateTree(nodes) {
    if (!nodes || nodes.length <= 0) {
        return;
    }
    const nodeArray = typeof nodes === 'string' ? JSON.parse(nodes) : nodes;
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
        const indentHtml = `<span class="indent">&nbsp;&nbsp;</span>`.repeat(node.level);
        rows += `<div class="row">${indentHtml}${node.fieldName && node.fieldName + ': '}<a class="node-link ${node.isNamed ? 'named' : 'anonymous'}" href="#" data-id="${node.id}" data-range="${startRow},${startColumn},${endRow},${endColumn}">${node.type}</a> <span class="position-info">[${startRow},${startColumn}] - [${endRow},${endColumn}]</span></div>`;
        rowNumbers += `<div class="row row-${startRow}" id="rc-${startRow}-${startColumn}">${i + 1}</div>`;
    }
    return { rows, rowNumbers };
}