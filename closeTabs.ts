import {browser, Tab,  kTST_ID, GetWindowTabsFlatMessage,executeInBackground} from 'tree-style-tabs';
function log(message: any) {
    let caller = arguments.callee.caller;
    const name = caller === undefined ? '[undefined]' : `[${caller.name}]`;
    console.log(`${name} ${message}`)
}

function arrayToString<T>(array: Array<T>) :string {
    return array === undefined
        ? '[]'
        : `[${array.join(',')}]`
}
function tabToString(tab:Tab):string {
    if(tab===undefined){
        return `tab=undefined`;
    }
    let states = arrayToString(tab.states);
    let ancestors = arrayToString(tab.ancestorTabIds);
    let children = tab.children === undefined ? '0' : `${tab.children.length}`;
    return `Tab - id=${tab.id}. states=${states}. ${children} children. ancestors=${ancestors}.`
}
interface Logger {
    log(message: any, ...optionalParams: any[]) :void;
}
class BaseLogger implements Logger {
    name():string {
        return this.constructor.toString().match(/\w+/g)[1]
    }
    log(message: any): void {
        // let caller = arguments.callee.caller;
        // const callingMethod = caller === undefined ? '[undefined]' : `[${caller.name}]`;
        console.log(`[${this.name()}]${message}`)
    }
}
class TabInfo extends BaseLogger {
    id: number;
    tab: Tab;
    level: number;
    parent: TabInfo | undefined = undefined;
    parentId: number | undefined = undefined;
    children: TabInfo[] = [];
    childIds: number[] = [];
    constructor(tab: Tab, level: number, parent?: TabInfo | undefined) {
        super();
        this.tab = tab;
        this.id = tab.id;
        this.level = level;
        this.log(`Constructed new TabInfo for tab:\n${tabToString(tab)}`);
        if (parent !== undefined) {
            this.parent = parent!;
            this.parentId = parent!.id;
            this.log(`TabInfo.parentId = ${parent!.id}`);
        }
        if (this.hasChildren()) {
            let children = tab.children;
            this.log(`TabInfo has ${children.length} children.`);
            for (const child of children) {
                this.log(`Initializing child ${tabToString(child)}`);
                let childInfo = new TabInfo(child, level + 1, this);
                this.children.push(childInfo);
                this.childIds.push(childInfo.id);
                console.log(`Finished initializing child ${child.id}`);
            }
        }
    }
    name():string {
        return `${super.name()}][${this.id}]`;
    }
    toString():string {
        let pid = this.parentId === undefined ? 'undefined' : `${this.parentId}`;
        let children = this.children === undefined ? '0' : `${this.children.length}`;
        let childIds= this.childIds === undefined ? '0' : `${this.childIds.length}`;
        return `TabInfo
    id: ${this.id}
    ${tabToString(this.tab)}
    level: ${this.level}.
    parent: ${pid}.
    children: ${children}.
    childIds: ${childIds}.`;
    }
    hasChildren(): boolean {
        return this.tab != undefined && this.tab.children != undefined && this.tab.children.length > 0;
    }
    hasParent():boolean {
        return this.tab != undefined && this.parent!= undefined;
    }
    isActive():boolean {
        return this.tab != undefined && this.tab.states != undefined && this.tab.states.includes('active')
    }

    static default: TabInfo = new TabInfo({id: 0, states: [], children: [], ancestorTabIds: []}, 0);
}

enum TabsToClose {
    Above  = 0,
    Below  = 1,
    All = 2
}
class WindowTree extends BaseLogger{
    above:TabInfo[];
    below:TabInfo[];
    ids:number[];
    active: TabInfo | null;
    foundActive:boolean;
    activeParentIds:number[];
    constructor(tabs:TabInfo[]) {
        super();
        this.ids = [];
        this.above = [];
        this.active = null;
        this.below = [];
        this.foundActive = false;
        for (let tab of tabs) {
            this.walk(tab)
        }
    }
    getIdsAbove():number[] {
        let arr = [];
        for (let tab of this.above) {
            if (this.activeParentIds.includes(tab.id)){
                continue;
            }
            arr.push(tab.id)
        }
        return arr;
    }
    getIdsBelow():number[] {
        let arr = [];
        for (let tab of this.below) {
            arr.push(tab.id)
        }
        return arr;
    }
    getAllCloseableIds():number[] {
        let arr = [];
        for (let id of this.getIdsAbove()) {
            arr.push(id)
        }
        for (let id of this.getIdsBelow()) {
            arr.push(id)
        }
        return arr;
    }
    private walk(info: TabInfo) {
        let id = info.id;
        this.log(`walking TabInfo ${id}`);
        if(this.ids.includes(id)){
            this.log(`already processed tab info ${id}. returning`);
            return;
        }
        this.log(`pushing id ${id} onto ids`);
        this.ids.push(id);
        if (this.foundActive){
            this.log(`foundActive = true. Pushing TabInfo ${id} onto below`);
            this.below.push(info);
        }
        else if (info.isActive()) {
            this.log(`TabInfo ${id} is active! Setting foundActive to true;`);
            this.active = info;
            this.foundActive = true;
            let parentIds = WindowTree.getParentIds(this.active);
            this.log(`TabInfo ${id} has ${parentIds.length} parents: [${parentIds.join(',')}]`);
            this.activeParentIds = parentIds;
        }
        else {
            this.log(`foundActive = false. Pushing TabInfo ${id} onto above`);
            this.above.push(info);
        }
        if(info.hasChildren()){
            this.log(`TabInfo ${id} has children. Beginning walking each.`);
            for (const child of info.children) {
                this.walk(child);
            }
        }
        this.log(`Finished walking TabInfo ${id}`);
    }
    private static getParentIds(tab:TabInfo) :number[] {
        let parentIds = [];
        while (tab.hasParent()) {
            tab = tab.parent;
            parentIds.push(tab.id!);
        }
        return parentIds;
    }
}
async function getCurrentWindowTree():Promise<WindowTree> {
    let message:GetWindowTabsFlatMessage = {
        type:'get-tree',
        tabs: '*',
    };
    let tabs = await browser.runtime.sendMessage(kTST_ID, message);
    return new WindowTree(tabs);
}

async function closeTabs(ids:number[]) {
    console.log(`closing tabs: [${ids.join(',')}]`);
    await executeInBackground(idsAbove => {
        browser.tabs.remove(idsAbove)
               .then(() => console.log(`finished closing tabs above`))
               .catch(e => console.log(`Caught exception executing browser.tabs.remove: ${e}`));
    }, [ids])
        .then(() => console.log(`finished executeInBackground`))
        .catch(e => console.log(`Caught exception executing executeInBackground: ${e}`));
}
async function getWindowAndClose(fn: (WindowTree) => number[]) {
    let window = await getCurrentWindowTree()
        .catch(e=>console.log(`Caught exception executing getCurrentWindowTree: ${e}`));
    let ids = fn(window);
    await closeTabs(ids);
}
async function closeTabsWrapper(fn: (WindowTree) => number[],name:string) {
    await getWindowAndClose(fn)
        .then(()=>console.log(`Completed execution of ${name}`))
        .catch(e=>console.log(`Caught exception executing ${name}: ${e}`));
}
async function closeTabsAbove() {
    return closeTabsWrapper(w=>w.getIdsAbove(),'closeTabsWrapper(w=>w.getIdsAbove())');
}
async function closeTabsBelow() {
    return closeTabsWrapper(w => w.getIdsBelow(), 'closeTabsWrapper(w=>w.getIdsBelow())');
}
async function closeTabsAll() {
    return closeTabsWrapper(w => w.getAllCloseableIds(), 'closeTabsWrapper(w=>w.getAllCloseableIds())');
}



async function closeTabsAsync(pos: TabsToClose) {
    switch (pos) {
        case TabsToClose.Above:
            return await closeTabsAbove();
        case TabsToClose.Below:
            return await closeTabsBelow();
        case TabsToClose.All:
            return await closeTabsAll();
    }
}

closeTabsAsync(TabsToClose.Above)
    .then(() => console.log(`finished closeTabsAsync(TabsToClose.Above)`))
    .catch(e => console.log(`Caught exception executing closeTabsAsync(TabsToClose.Above): ${e}`));