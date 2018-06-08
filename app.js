"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tree_style_tabs_1 = require("tree-style-tabs");
function tab_to_string(tab) {
    `Tab { id:${tab.id}, title:'${tab.title}', url:'${tab.url}', active:${tab.active} }}`;
}
var RelativePosition;
(function (RelativePosition) {
    RelativePosition[RelativePosition["Above"] = 0] = "Above";
    RelativePosition[RelativePosition["Below"] = 1] = "Below";
    RelativePosition[RelativePosition["Active"] = 2] = "Active";
})(RelativePosition || (RelativePosition = {}));
class TabInfo {
    constructor(tab, level, parent) {
        this.parent = null;
        this.parentId = null;
        this.children = [];
        this.childIds = [];
        this.tab = tab;
        this.id = tab.id;
        this.level = level;
        if (parent !== null) {
            this.parent = parent;
            this.parentId = parent.id;
        }
        if (this.hasChildren()) {
            for (const child of tab.children) {
                let childInfo = new TabInfo(child, level + 1, this);
                this.children.push(childInfo);
                this.childIds.push(childInfo.id);
            }
        }
    }
    hasChildren() {
        return this.tab != null && this.tab.children != null && this.tab.children.length > 0;
    }
}
TabInfo.default = new TabInfo({ id: 0, states: [], children: [], ancestorTabIds: [] }, 0);
class ArrayIterator {
    constructor(arr) {
        this.values = arr.entries();
    }
    getResult(r) {
        return {
            value: r.value[1],
            done: r.done
        };
    }
    next(value) {
        let r = this.values.next(value);
        return this.getResult(r);
    }
    return(value) {
        let r = this.values.return(value);
        return this.getResult(r);
    }
    throw(e) {
        let r = this.values.throw(e);
        return this.getResult(r);
    }
}
function arrayToIterator(arr) {
    return new ArrayIterator(arr);
}
class TabInfoCollection {
    constructor(tabs, window) {
        this.current_level = 0;
        this.window = 0;
        this.tabs = new Map();
        let enumerator = arrayToIterator(tabs);
        this.tabs.set(this.current_level, enumerator);
    }
    next(value) {
        let iterator = this.tabs.get(this.current_level);
        if (iterator == undefined) {
            return {
                value: TabInfo.default,
                done: true,
            };
        }
        let iteratorResult = iterator.next();
        if (iteratorResult.done) {
            return iteratorResult;
        }
        let tab = iteratorResult.value;
        while (tab.hasChildren()) {
            let childIter = arrayToIterator(tab.children);
            this.current_level++;
            this.tabs.set(this.current_level, childIter);
            var next = childIter.next();
            if (next.done) {
                this.current_level--;
                break;
            }
            tab = next.value;
        }
        return {
            value: iteratorResult.value,
            done: false,
        };
    }
    return(value) {
        throw new Error("Return is invalid");
    }
    throw(e) {
        throw e;
    }
}
function crawl_tab(tab) {
    let ids = [];
    if (tab.states.includes('active')) {
    }
}
async function get_tabs_in_current_window() {
    let message = {
        type: 'get-tree',
        tabs: '*',
    };
    let tabs = await tree_style_tabs_1.browser.runtime.sendMessage(tree_style_tabs_1.kTST_ID, message);
}
//https://github.com/piroor/treestyletab/wiki/API-for-other-addons#add-new-item-to-the-context-menu-on-tabs
async function run() {
    let params = {
        id: 'log-selection',
        title: "Log '%s' to the console",
        contexts: ["tab"]
    };
    await tree_style_tabs_1.browser.menus.create(params);
    await tree_style_tabs_1.browser.runtime.sendMessage(tree_style_tabs_1.kTST_ID, {
        type: 'fake-contextMenu-create',
        params: params
    }).catch(e => console.log(`TST is not available. Caught error: ${e}`));
    let onMenuItemClick = (aInfo, aTab) => {
        console.log(`Menu item clicked. menuItemId: ${aInfo.menuItemId}. editable:${aInfo.editable}. modifiers: [${aInfo.modifiers.join(',')}]`);
        switch (aInfo.menuItemId) {
            case 'click-menu-item':
                console.log(`click-menu-item invoked on ${tab_to_string(aTab)}`);
                break;
        }
    };
    tree_style_tabs_1.browser.contextMenus.onClicked.addListener(onMenuItemClick);
    tree_style_tabs_1.browser.runtime.onMessageExternal.addListener((aMessage, aSender) => {
        switch (aSender.id) {
            case tree_style_tabs_1.kTST_ID:
                switch (aMessage.type) {
                    case 'fake-contextMenu-click':
                        onMenuItemClick(aMessage.info, aMessage.tab);
                }
        }
    });
    let queryInfo = {
        active: true,
        currentWindow: true,
    };
    let [activeTab,] = await tree_style_tabs_1.browser.tabs.query(queryInfo);
    await tree_style_tabs_1.browser.tabs.create({
        url: 'http://www.google.com',
        openerTabId: activeTab.id
    });
    let props = {
        type: "get-tree",
        tab: 1
    };
    let tabs = await tree_style_tabs_1.browser.runtime.sendMessage(tree_style_tabs_1.kTST_ID, props);
    tabs;
}
