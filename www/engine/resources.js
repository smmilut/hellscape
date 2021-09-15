import * as Engine from "../engine.js";
/*
    # Resources

    ## Purpose

    Resources are global objects available regardless of the Entities.
    They can be queried by Systems or by other Resources.
    Example : the keyboard input.

    ## Resource API

    ```
    Resource_Something = {
        name: "thisResourceName",
        initQueryResources: ["otherResource1", "otherResource2", ...],  // will be passed as argument to init()
        prepareInit: function(initOptions),  // return a Promise if you need order
        init: function(otherResource1, otherResource2, ...),
        update: function(),
    }
    ```
    
    It is referred by its `.name` property.
    It can query other Resources during initialization, through its `.initQueryResources` property.
    If it has an `.update()` function, then it will be called at every frame.

    ## Add a new Resource

    Register a new Resource with :
    
    ```
    registerResource(Resource_Something);
    ```

    This makes the Resource available by its name.

*/

/*
*   Store the current Resources configuration for one level
*/
const ResourceStore = {
    init: function ResourceStore_init() {
        /// List of Resources
        this.resources = [];
    },

    clear: function ResourceStore_clear() {
        this.resources = [];
    },

    add: function ResourceStore_add(resource, initOptions) {
        this.resources.push(resource);
        resource.prepareInit(initOptions);
        return this;
    },

    /*
    *   Get the first Resource that has the queried name
    */
    get: function ResourceStore_get(resourceName) {
        for (const resource of this.resources) {
            if (resource.name == resourceName) {
                /// found it, return the first match
                return resource;
            }
        }
        /// not found
        return null;
    },

    /*
    *   Given a list of Resource names, get a dictionary with the corresponding Resources
    *   (or no key for Resources not found)
    */
    query: function ResourceStore_query(resourceQuery) {
        const queryResult = {};
        if (resourceQuery !== undefined) {
            for (const queryName of resourceQuery) {
                const singleResult = this.get(queryName);
                if (singleResult !== null) {
                    queryResult[queryName] = singleResult;
                }
            }
        }
        return queryResult;
    },

    /*
    *   Initialize all Resources
    */
    initAll: async function ResourceStore_initAll() {
        for (let resource of this.resources) {
            // Resources may query for other resources during initialization
            const queryResult = Resources.queryAll(resource.initQueryResources);
            let queryResourcesResult =
            {
                engine: Engine,
                resources: queryResult,
            };
            // initiate initialization
            await resource.init(queryResourcesResult);
        }
    },

    /*
    *   Update all Resources
    */
    updateAll: async function ResourceStore_updateAll() {
        let resourceUpdatePromises = [];
        for (let resource of this.resources) {
            if (resource.update) {
                let updateResult = resource.update();
                if (updateResult && updateResult.then != undefined) {
                    // add to wait list
                    resourceUpdatePromises.push(updateResult);
                }
            }
        }
        await Promise.all(resourceUpdatePromises);
    },
};

/*
*   Instantiate a ResourceStore
*/
function newResourceStore() {
    const resourceStore = Object.create(ResourceStore);
    resourceStore.init();
    return resourceStore;
}

/*
*   template object to store all Resources centrally, to make them available for loading on-demand in levels
*/
const ResourceRegistry = {
    init: function ResourceRegistry_init() {
        /// All registered Resources by name :
        /// { "resourceName": resource }
        this.storage = new Map();
    },
    register: function ResourceRegistry_register(resource) {
        this.storage.set(resource.name, resource);
    },
    get: function ResourceRegistry_get(resourceName) {
        return this.storage.get(resourceName);
    },
};

/*
* Instantiate a ResourceRegistry
*/
function newResourceRegistry() {
    const resourceRegistry = Object.create(ResourceRegistry);
    resourceRegistry.init();
    return resourceRegistry;
}

/*
* Manage Resources
*/
export const Resources = (function build_Resources() {
    const obj_Resources = {};

    let Resources_global, Resources_currentLevel;

    obj_Resources.init = function Resources_init() {
        obj_Resources.registry = newResourceRegistry();
        Resources_global = newResourceStore();
        Resources_currentLevel = newResourceStore();
    };

    obj_Resources.register = function Resources_register(resource) {
        obj_Resources.registry.register(resource);
    };

    obj_Resources.queryAll = function Resources_queryAll(resourceQuery) {
        const queryResults = {}
        const globalResults = Resources_global.query(resourceQuery);
        Object.assign(queryResults, globalResults);
        const levelResults = Resources_currentLevel.query(resourceQuery);
        Object.assign(queryResults, levelResults);
        return queryResults;
    };

    /*
    *   Load the global Resources config into the global Resources
    */
    obj_Resources.loadGlobalConfigs = function Resources_loadGlobalConfigs(resourceConfigs) {
        Resources_global.clear();
        for (const resourceConfig of resourceConfigs) {
            const resource = obj_Resources.registry.get(resourceConfig.name);
            const initOptions = resourceConfig.initOptions;
            Resources_global.add(resource, initOptions);
        }
    };

    /*
    *   Load the level Resources config into the current level Resources
    */
    obj_Resources.loadLevelConfigs = function Resources_loadLevelConfigs(resourceConfigs) {
        Resources_currentLevel.clear();
        for (const resourceConfig of resourceConfigs) {
            const resource = obj_Resources.registry.get(resourceConfig.name);
            const initOptions = resourceConfig.initOptions;
            Resources_currentLevel.add(resource, initOptions);
        }
    };

    obj_Resources.initGlobal = async function Resources_initGlobal() {
        await Resources_global.initAll();
    };

    obj_Resources.initLevel = async function Resources_initLevel() {
        await Resources_currentLevel.initAll();
    };

    obj_Resources.updateAll = async function Resources_updateAll() {
        await Resources_global.updateAll();
        await Resources_currentLevel.updateAll();
    };

    return obj_Resources;
})();

/*
*   Initialize system : make user system Resources available
*/
export async function init() {
    await Resources.init();
}
