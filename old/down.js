function getTabsToClose(tabs, args) {
    var foundActiveTab = false;
    var toClose = [];


    function checkTab(tab) {
        var add = args === "above" ? !foundActiveTab : foundActiveTab;

        if (add) {
            if (!toClose.includes(tab.id)) {
                console.log(`Adding ${tab.id} - "${tab.title}" to toClose.`);
                toClose.push(tab.id);
            }

        }


        if (tab.states.includes("active")) {
            console.log(`Found active tab: ${tab.id} - "${tab.title}"`);
            foundActiveTab = true;
            toClose.pop();
        }
        if (tab.children === undefined || tab.children.length == 0) {
            return;
        }

        for (const child of tab.children) {
            checkTab(child);
        }
    }

    for (const tab of tabs) {
        checkTab(tab);
    }
    console.log(`got ${toClose.length} tabs to close. ids=${toClose.join(",")}`);

    executeInBackground(toClose => {
        browser.tabs.remove(toClose);
    }, [toClose])
        .then(() => console.log("executing in bg complete"))
        .catch(e => console.log(`caught exception: ${e}`));
}


console.log("running method");
const kTST_ID = 'treestyletab@piro.sakura.ne.jp';

async function something() {
    console.log("starting something");
    var tabs = await browser.runtime.sendMessage(kTST_ID, {
        type:   'get-tree', // or 'demote'
        tab:    '*',
        window: 0
    });
    console.log(`got ${tabs.length} tabs`);
    getTabsToClose(tabs, "below");
    return true;
}

something().then(q => console.log(`something completed: ${q}`)).catch(
    e => console.log(`caught something error - ${e}`));
