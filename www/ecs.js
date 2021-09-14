import * as Utils from "./utils.js";
/*
    "ECS" : game data management inspired by ECS (ideally, let's get there at some point)

    # Concepts :

     - Entity : a data "id"
     - Component : a data that belongs to an Entity
     - System : a routine that performs actions on Components, using Resources
     - Resource : global data detached from Entities


    # Data

    The global object `Data` holds all Entities and Resources.
    It can spawn Entities with `Data.newEntity()`
    It can register a Resource with `Data.registerResource()`
>>>    It can register a System with `Data.registerSystem()`

    ## Entity

    Each Entity holds its own Components.
    You can add "someComponent" to "someEntity" with `someEntity.addComponent(someComponent)`

    # Controller

    The global object `Controller` controls the program flow.
    It holds Systems and runs them.
    It is responsible of the main program loop.

    Start the program with `Controller.start()`

    ## Program flow

    1. Run each module's `init()`. This in turn will :
        1. run each sub-module's `init()` as necessary
        2. register the module's Systems
        3. register the module's Resources
    2. Load the global objects. For now this is only Resources.
    3. Load the first Scene. This will :
        1. Load the Scene's Resources
        2. Load the Scene's Systems
    4. Start the game. This will :
        1. Initialize Resource systems in order of their priority. Wait for completion of each priority.
        2. Run "init"-type Systems from SYSTEM_STAGE.FRAME_INIT and wait for completion
        3. Start the main loop :
            1. Run Resource systems `Resource.update()`, wait for completion
            2. Run "normal" Systems in parallel, but wait for each stage to complete :
                1. SYSTEM_STAGE.FRAME_INIT
                2. SYSTEM_STAGE.FRAME_MAIN
                3. SYSTEM_STAGE.FRAME_END

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
    Data.registerResource(Resource_Something);
    ```

    This makes the Resource available by its name.

    # Systems

    ## Purpose

    Systems are routines that are run at every frame.
    They can query Resources and Components.
    
    Example1 : to apply physics to all characters, add a System that makes 1 query :
     - all positions (Component)
     - all speeds (Component)
     - the global gravity (Resource)
     The System will update those data objects when run at every frame.

    Example2 : to collide lasers with monsters, add a System that makes 2 queries :
     1. laserQuery :
        - all positions (Component)
        - that also have tag "isLaser" (Component)
     2. monsterQuery :
        - all positions (Component)
        - that also have tag "isMonster" (Component)
     The System will be able to iterate both queries to check for collisions.

    ## System API

    ```
    System_Something = {
        name: "systemName",
        resourceQuery: ["resource1", "resource2", ...],
        componentQueries: {
            queryName1: ["componentA", "componentB", ...],
            queryName2: ["componentC", "componentA", ...],
        },
        run: function(queryResults) {
            // queryResults will contain the following :
            queryResults == {
                ecs: {
                    Data,
                    Controller,
                },
                resources: {
                    resource1: {},
                    resource2: {},
                },
                components: {
                    queryName1: [
                        {  // query result for an Entity
                            componentA: {},
                            componentB: {},
                        },
                        {  // query result for another Entity
                            componentA: {},
                            componentB: {},
                        },
                        // ... for all Entities that match
                    ],
                    queryName2: [
                        {  // query result for an Entity
                            componentC: {},
                            componentA: {},
                        },
                        {  // query result for another Entity
                            componentC: {},
                            componentA: {},
                        },
                        // ... for all Entities that match
                    ],
                }
            }
        },
    }
    ```

    The `componentQueries` are named queries for Entities.
    Each query is defined by the set (an Array actually) of Components that are required.
    The response of each query will be the list of Entities that each have *all* the required Components for that query.

    ## Add a new System

    Register a new System with :

    ```
    Systems.register(System_Something);
    ```

    This makes the System available by its name.

    ### Note on System run() completion

    Automatically, when adding a new System, a `promiseRun()` function is created, turning the `run()` function into a Promise returned by the `promiseRun()` function.
    If the desired behavior of this Promise needs to be customized, you can provide the `promiseRun()` function yourself to the System (instead of the `run()` function).
    
    ## Scene : Levels scene management

    `scenes.json` describes Scenes which contain the configuration of Resources and Systems for each game level
    The format is :
    {
        "_global": {
            "resources": [
                {
                    "name": "someGlobalResourceName",
                    "initOptions": {
                        // object with initilization options for this Resource
                    }
                },
                {
                    // ... etc for all global Resources
                }
            ]
        },
        "levelX": {
            "resources" : [
                {
                    "name": "someLevelResourceName",
                    "initOptions": {
                        // object with initilization options for this Resource
                    }
                },
                {
                    // ... etc for all of the level's Resources
                }
            ],
            "systems" : {
                "init": ["list of system names", ...],
                "frameMain": ["list of system names", ...],
                "frameEnd": ["list of system names", ...],
            },
            "next": "levelY"
        },
        "levelY" : {}, // etc...
    }

    # Components

    ## Components API

    ```
    Component_Something = {
        name,
    }
    ```

    Basically any object that has a `.name` property can be a Component.

    ## Add a new Component to an Entity

    To add a new Component to an Entity, you must first access that Entity, and do :
    ```
    someEntity.addComponent(someComponent);
    ```

    Usually, during setup with :
    ```
    Data.newEntity()
        .addComponent(someComponent1)
        .addComponent(someComponent2)
        .addComponent(someComponent3)
    ```
*/

/*
* System stages : priorities for running Systems each frame
*/
const SYSTEM_STAGE = Object.freeze({
    INIT: "init",
    FRAME_INIT: "frameInit",
    FRAME_MAIN: "frameMain",
    FRAME_END: "frameEnd",
});

/*
* Program flow control
*/
export const Controller = (function build_Controller() {
    const obj_Controller = {};

    let Controller_animationRequestId, Controller_isStopping;

    /*
    * Run systems
    */
    obj_Controller.start = async function Controller_start() {
        Controller_isStopping = false;
        return new Promise(function requestFirstFrame(resolve, reject) {
            Controller_animationRequestId = window.requestAnimationFrame(animateFrame);
        });
    };

    obj_Controller.stop = async function Controller_stop() {
        Controller_isStopping = true;
        window.cancelAnimationFrame(Controller_animationRequestId);
    }

    /*
    *   Init level
    */
    obj_Controller.initLevel = async function Controller_initLevel() {
        await Data.initAllResources();
        await Systems.runStage(SYSTEM_STAGE.INIT);
    };

    /*
    * main loop
    */
    async function animateFrame(_timeNow) {
        await Data.updateAllResources();
        if (Controller_isStopping) {
            /// interrupt the frame
            return;
        }
        await Systems.runStage(SYSTEM_STAGE.FRAME_INIT);
        if (Controller_isStopping) {
            /// interrupt the frame
            return;
        }
        await Systems.runStage(SYSTEM_STAGE.FRAME_MAIN);
        if (Controller_isStopping) {
            /// interrupt the frame
            return;
        }
        await Systems.runStage(SYSTEM_STAGE.FRAME_END);
        if (Controller_isStopping) {
            /// interrupt the frame
            return;
        }
        return new Promise(function requestNewFrame(resolve, reject) {
            Controller_animationRequestId = window.requestAnimationFrame(animateFrame);
        });
    }

    return obj_Controller;
})();

/*
*   Stores Resources ordered by priority level
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
        return new Promise(async function promiseInitializedResourceSystems(resolve, reject) {
            let resourcePromises = [];
            for (let resource of this.resources) {
                // Resources may query for other resources during initialization
                const queryResult = Data.queryAllResources(resource.initQueryResources);
                let queryResourcesResult =
                {
                    ecs: {
                        Data: Data,
                        Controller: Controller,
                    },
                    resources: queryResult,
                };
                // initiate initialization
                let initResult = resource.init(queryResourcesResult);
                if (initResult && initResult.then != undefined) {
                    // add to wait list
                    resourcePromises.push(initResult);
                }
            }
            // wait for completion of all resources of this priority level
            await Promise.all(resourcePromises);
            resolve();
        }.bind(this));
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
* Program data, holds Entities and Resources
*/
export const Data = (function build_Data() {
    const obj_Data = {};

    //#region Entities
    obj_Data.entities = [];
    obj_Data.newEntity = function newEntity() {
        const obj_Entity = {};
        obj_Data.entities.push(obj_Entity);

        obj_Entity.components = [];

        obj_Entity.addComponent = function Entity_addComponent(component) {
            obj_Entity.components.push(component);
            return obj_Entity;
        };

        obj_Entity.hasComponent = function Entity_hasComponent(componentName) {
            return obj_Entity.components.some(function verifyComponent(component) {
                return component.name == componentName;
            });
        };

        obj_Entity.hasAllComponents = function Entity_hasAllComponents(componentNames) {
            return componentNames.every(function checkQueryComponent(componentName) {
                return obj_Entity.hasComponent(componentName);
            });
        };

        obj_Entity.getComponents = function Entity_getComponents(componentName) {
            return obj_Entity.components.filter(function filterComponent(component) {
                return component.name == componentName;
            });
        };

        return obj_Entity;
    };
    //#endregion
    //#region Resources
    /// { "resourceName": resource }
    obj_Data.resourcesRegistry = new Map();

    obj_Data.registerResource = function Data_registerResource(resource) {
        obj_Data.resourcesRegistry.set(resource.name, resource);
    };

    obj_Data.getResource = function Data_getResource(resourceName) {
        return obj_Data.resourcesRegistry.get(resourceName);
    };

    obj_Data.queryAllResources = function Data_queryAllResources(resourceQuery) {
        const queryResults = {}
        const globalResults = obj_Data.globalResources.query(resourceQuery);
        Object.assign(queryResults, globalResults);
        const levelResults = obj_Data.levelResources.query(resourceQuery);
        Object.assign(queryResults, levelResults);
        return queryResults;
    };

    (function Data_initGlobalResourcesStorage() {
        obj_Data.globalResources = Object.create(ResourceStore);
        obj_Data.globalResources.init();
    })();


    (function Data_initLevelResourcesStorage() {
        obj_Data.levelResources = Object.create(ResourceStore);
        obj_Data.levelResources.init();
    })();

    obj_Data.initAllResources = async function Data_initAllResources() {
        await obj_Data.globalResources.initAll();
        await obj_Data.levelResources.initAll();
    };

    obj_Data.updateAllResources = async function Data_updateAllResources() {
        await obj_Data.globalResources.updateAll();
        await obj_Data.levelResources.updateAll();
    };
    //#endregion

    return obj_Data;
})();

/*
*   Store Systems
*/
const SystemRegistry = {
    init: function SystemRegistry_init() {
        /// All registered Systems by name :
        /// { "systemName": system }
        this.storage = new Map();
    },
    register: function SystemRegistry_register(system) {
        if (system.promiseRun === undefined) {
            system.promiseRun = function promiseRun_constructed() {
                const args = arguments;
                return new Promise(function promiseRunSystem(resolve, reject) {
                    resolve(system.run(...args));
                })
            };
        }
        this.storage.set(system.name, system);
    },
    get: function SystemRegistry_get(systemName) {
        return this.storage.get(systemName);
    },
};

/*
* Instantiate a SystemRegistry
*/
function newSystemRegistry() {
    const systemRegistry = Object.create(SystemRegistry);
    systemRegistry.init();
    return systemRegistry;
}

/*
*   Manage Systems
*/
export const Systems = (function build_Systems() {
    const obj_Systems = {
        SYSTEM_STAGE: SYSTEM_STAGE,
    };

    obj_Systems.init = function Systems_init() {
        obj_Systems.registry = newSystemRegistry();
    };

    obj_Systems.register = function Systems_register(system) {
        obj_Systems.registry.register(system);
    };

    obj_Systems.initQueues = function Systems_clearQueues() {
        /// a map of { systemStage: [system1, system2, ...] }
        obj_Systems.queues = new Map([
            [SYSTEM_STAGE.INIT, []],
            [SYSTEM_STAGE.FRAME_INIT, []],
            [SYSTEM_STAGE.FRAME_MAIN, []],
            [SYSTEM_STAGE.FRAME_END, []],
        ]);
    };

    /*
    *   Load the System queues config into the current System queues
    */
    obj_Systems.loadQueues = function Systems_loadQueues(systemQueueConfig) {
        obj_Systems.initQueues();
        for (const [stageName, systemQueue] of obj_Systems.queues) {
            const systemNames = systemQueueConfig[stageName];
            if (systemNames === undefined) {
                /// no configuration for this stage
                continue;
            } else {
                for (const systemName of systemNames) {
                    const system = obj_Systems.registry.get(systemName);
                    systemQueue.push(system);
                }
            }
        }
    };

    /*
    * Run Systems for the System queue of the requested stage, in order
    */
    obj_Systems.runStage =  async function Systems_runStage(stage) {
        const systemQueue = obj_Systems.queues.get(stage);
        let systemRunPromises = [];
        for (let system of systemQueue) {
            const queryResults = {
                ecs: {
                    Data: Data,
                    Controller: Controller,
                    Scene: Scene,
                    Systems: Systems,
                },
            };
            //#region prepare requested Resources
            queryResults.resources = Data.queryAllResources(system.resourceQuery);
            //#endregion
            if (system.componentQueries != undefined) {
                //#region prepare requested Components
                // the map of { queryName: queryResult }
                queryResults.components = {};
                for (let componentQueryName in system.componentQueries) {
                    // the list of names of queried Components
                    const componentQuery = system.componentQueries[componentQueryName];
                    // the list of result [Entities,] for this query
                    queryResults.components[componentQueryName] = [];
                    for (let entity of Data.entities) {
                        if (entity.hasAllComponents(componentQuery)) {
                            // this Entity is valid for the query, get all Components
                            const resultComponents = {};
                            for (let queriedComponentName of componentQuery) {
                                // take the 1st one only, don't expect several Components with the same name
                                let resultComponent = entity.getComponents(queriedComponentName)[0];
                                resultComponents[queriedComponentName] = resultComponent;
                            }
                            queryResults.components[componentQueryName].push(resultComponents);
                        }
                    }
                }
                //#endregion
            }
            systemRunPromises.push(system.promiseRun(queryResults));
        }
        await Promise.all(systemRunPromises);
    };

    return obj_Systems;
})();

/*
*   Manage scheduling and content of all levels and screens
*/
export const Scene = (function build_Scene() {
    const obj_Scene = {};

    let Scene_fullConfig, Scene_currentName, Scene_currentConfig, Scene_nextName;

    obj_Scene.init = async function Scene_init() {
        Systems.initQueues();
        const rawSchedulingFile = await Utils.Http.Request({
            url: "www/scenes.json",
        });
        Scene_fullConfig = JSON.parse(rawSchedulingFile.responseText);
    };

    obj_Scene.loadGlobals = function Scene_loadGlobals() {
        const globalsConfig = Scene_fullConfig["_global"];
        if (globalsConfig === undefined) {
            /// no global config
            return;
        }
        const resourceConfigs = globalsConfig.resources;
        if (resourceConfigs === undefined) {
            /// no global resources
            return;
        }
        for (const resourceConfig of resourceConfigs) {
            const resource = Data.getResource(resourceConfig.name);
            const initOptions = resourceConfig.initOptions;
            Data.globalResources.add(resource, initOptions);
        }
    };

    /*
    *   construct the Resources and Systems queue for the current scene
    */
    obj_Scene.load = function Scene_load(sceneName) {
        Scene_currentName = sceneName;
        Scene_currentConfig = Scene_fullConfig[Scene_currentName];
        Scene_nextName = Scene_currentConfig.next;
        const resourceConfigs = Scene_currentConfig.resources;
        if (resourceConfigs !== undefined) {
            Data.levelResources.clear();
            for (const resourceConfig of resourceConfigs) {
                const resource = Data.getResource(resourceConfig.name);
                const initOptions = resourceConfig.initOptions;
                Data.levelResources.add(resource, initOptions);
            }
        }
        const systemQueueConfig = Scene_currentConfig.systems;
        if (systemQueueConfig !== undefined) {
            Systems.loadQueues(systemQueueConfig);
        }

        console.log("loaded", sceneName);
    };

    obj_Scene.loadNext = async function Scene_loadNext() {
        /// interrupt the frame
        Controller.stop();
        obj_Scene.load(Scene_nextName);
        await Controller.initLevel();
        Controller.start();
    };

    return obj_Scene;
})();


/*
*   Initialize system : make user system Resources available
*/
export async function init() {
    await Systems.init();
    await Scene.init();
}
