import {
    browser, ChromeTab, Tab, TstId, kTST_ID, Properties, State, ContextType, ItemType, MutedInfoReason, MutedInfo,
    OnClickData, ContextMenuOnClickedFunction, EvListener,Listener,
    ContextMenuCreate,ContextMenuCreateContext,CreateMenuItemParameters,CreateMenuItemProperties,
    ContextMenuUpdate, UpdateContextMenuParameters, UpdateContextMenuItemPropeties,
    ContextMenuRemove, ContextMenuRemoveCommand, RemoveContextMenuItemPropeties,
    RemoveAllContextItems, RemoveAllContextMenuItemPropeties,
    GetTree, TabId, TabAlias, GetTabSingleMessage, GetMultipleTabsMessage, GetTabsForWindowMessage,GetWindowTabsFlatMessage,
    IndentMessage, OutdentMessage, AttachMessage, DetachMessage, CollapseMessage, ExpandMessage, MoveMessage, FocusMessage,
    DuplicateMessage, DuplicateAs, CreateGroupMessage, ScrollMessage,
    Msg, MenuItemClickMessage, TabClosedMessage, TabClickedMessage, NonTabAreaClickedMessage, MouseOverTabsMessage, Message,
} from 'tree-style-tabs';

import MessageSender = browser.runtime.MessageSender;
import QueryInfo = browser.tabs.QueryInfo;


function tab_to_string(tab: ChromeTab) {
    `Tab { id:${tab.id}, title:'${tab.title}', url:'${tab.url}', active:${tab.active} }}`
}
enum RelativePosition {
    Above = 0,
    Below = 1,
    Active = 2
}

class TabInfo {
    id:number;
    tab:Tab;
    level: number;
    parent: TabInfo | null = null;
    parentId: number | null = null;
    children: TabInfo[] = [];
    childIds: number[] = [];

    constructor(tab:Tab,level:number,parent?:TabInfo|null) {
        this.tab = tab;
        this.id = tab.id;
        this.level = level;
        if (parent !== null) {
            this.parent = parent!;
            this.parentId = parent!.id;
        }
        if (this.hasChildren()){
            for (const child of tab.children) {
                let childInfo = new TabInfo(child,level+1,this);
                this.children.push(childInfo);
                this.childIds.push(childInfo.id);
            }
        }
    }
    hasChildren() :boolean {
        return this.tab != null && this.tab.children != null && this.tab.children.length > 0;
    }
    static default:TabInfo = new TabInfo({id: 0, states: [], children: [], ancestorTabIds: []}, 0);
}
class ArrayIterator<T> implements Iterator<T> {
    values:IterableIterator<[number,T]>;
    constructor(arr:Array<T>){
        this.values = arr.entries();
    }
    private getResult(r: IteratorResult<[number, T]>) {
        return {
            value: r.value[1],
            done: r.done
        }
    }
    next(value?: any): IteratorResult<T> {
        let r = this.values.next(value);
        return this.getResult(r);
    }
    return(value?: any): IteratorResult<T> {
        let r = this.values.return(value);
        return this.getResult(r);
    }
    throw(e?: any): IteratorResult<T> {
        let r = this.values.throw(e);
        return this.getResult(r);
    }
}
function arrayToIterator<T>(arr:Array<T>):Iterator<T> {
    return new ArrayIterator<T>(arr);
}
class TabInfoCollection implements Iterator<TabInfo>{
    current_level:number;
    window:number;
    tabs:Map<number,Iterator<TabInfo>>;
    constructor(tabs:TabInfo[],window:number){
        this.current_level = 0;
        this.window = 0;
        this.tabs = new Map<number, Iterator<TabInfo>>();
        let enumerator = arrayToIterator(tabs);
        this.tabs.set(this.current_level, enumerator);
    }
    next(value?: any): IteratorResult<TabInfo> {
        let iterator = this.tabs.get(this.current_level);
        if (iterator == undefined){
            return {
                value: TabInfo.default,
                done: true,
            }
        }

        let iteratorResult = iterator.next();
        if(iteratorResult.done){
            return iteratorResult;
        }
        let tab = iteratorResult.value;
        while(tab.hasChildren()){
            let childIter = arrayToIterator(tab.children);
            this.current_level++;
            this.tabs.set(this.current_level,childIter);
            var next = childIter.next();
            if(next.done){
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
    return(value?: any): IteratorResult<TabInfo> {
        throw new Error("Return is invalid")
    }
    throw(e?: any): IteratorResult<TabInfo> {
        throw e;
    }


}
function crawl_tab(tab: Tab) {
    
    let ids = [];
    if(tab.states.includes('active')){

    }
}

async function get_tabs_in_current_window() {
    let message:GetWindowTabsFlatMessage = {
        type:'get-tree',
        tabs: '*',
    };
    let tabs:Tab[] = await browser.runtime.sendMessage(kTST_ID,message);
}

//https://github.com/piroor/treestyletab/wiki/API-for-other-addons#add-new-item-to-the-context-menu-on-tabs
async function run() {
    let params:Properties = {
        id: 'log-selection',
        title: "Log '%s' to the console",
        contexts: ["tab"]
    };
    await browser.menus.create(params);
    await browser.runtime.sendMessage(kTST_ID, {
        type: 'fake-contextMenu-create',
        params:params
    }).catch(e =>console.log(`TST is not available. Caught error: ${e}`));

    let onMenuItemClick = (aInfo:OnClickData,aTab:ChromeTab) => {
        console.log(`Menu item clicked. menuItemId: ${aInfo.menuItemId}. editable:${aInfo.editable}. modifiers: [${aInfo.modifiers.join(',')}]`);
        switch (aInfo.menuItemId) {
            case 'click-menu-item':
                console.log(`click-menu-item invoked on ${tab_to_string(aTab)}`);
                break;
        }
    };
    browser.contextMenus.onClicked.addListener(onMenuItemClick);
    browser.runtime.onMessageExternal.addListener((aMessage: any, aSender:MessageSender) => {
        switch (aSender.id) {
            case kTST_ID:
                switch (aMessage.type) {
                    case 'fake-contextMenu-click':
                        onMenuItemClick(aMessage.info,aMessage.tab);
                }
        }
    });
    let queryInfo:QueryInfo = {
        active: true,
        currentWindow: true,
    };
    let [activeTab, ] = await browser.tabs.query(queryInfo);
    await browser.tabs.create({
        url:'http://www.google.com',
        openerTabId: activeTab.id
    })
    let props: GetTabSingleMessage = {
        type: "get-tree",
        tab: 1
    };
    let tabs = await browser.runtime.sendMessage(kTST_ID,props);
    tabs
}
