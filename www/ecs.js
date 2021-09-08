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
    It can add a new Resource with `Data.gameResources.add()` or `Data.levelResources.add()`

    ## Entity

    Each Entity holds its own Components.
    You can add "someComponent" to "someEntity" with `someEntity.addComponent(someComponent)`

    # Controller

    The global object `Controller` controls the program flow.
    It holds Systems and runs them.
    It is responsible of the main program loop.

    Start the program with `Controller.start()`

    ## Program flow

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

    Add a new Resource available to the global game with :
    
    ```
    Data.gameResources.add(Resource_Something, initOptions, priority)
    ```

    Add a new Resource available only to the current level with :
    
    ```
    Data.levelResources.add(Resource_Something, initOptions, priority)
    ```

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
    Data.registerSystem(System_Something);
    ```

    This makes the System available by its name.

    ### Note on System run() completion

    Automatically, when adding a new System, a `promiseRun()` function is created, turning the `run()` function into a Promise returned by the `promiseRun()` function.
    If the desired behavior of this Promise needs to be customized, you can provide the `promiseRun()` function yourself to the System (instead of the `run()` function).
    
    ## Scene : Systems scheduling

    `schedulingConfig.json` describes Scenes which contain the configuration of Systems for each game level
    The format is :
    {
        "levelX": {
            "init": ["list of system names"],
            "frameMain": ["list of system names"],
            "frameEnd": ["list of system names"],
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
*   Get the current time in seconds
*/
function getBrowserTime() {
    return performance.now() / 1000.0;
}

/*
*   A Timer Resource or Component that can be derived with Object.create()
*/
const Resource_Timer = {
    prepareInit: function Physics_prepareInit(initOptions) {
        this._isRunning = true;
        this._fpsThreshold = 40;  // minimum acceptable FPS, below that we panic
        this.initOptions = initOptions || {};
    },
    init: function Time_init() {
        this.t = 0.0;
        this.old_t = 0.0;
        this.dt = 0.0;
        window.addEventListener("blur", this.pause.bind(this));
        window.addEventListener("focus", this.unPause.bind(this));
    },
    update: function Time_update() {
        if (this._isRunning) {
            this.old_t = this.t;
            this.t = getBrowserTime();
            this.dt = (this.t - this.old_t);
            if (this.dt > 1.0 / this._fpsThreshold) {
                console.warn("frame too slow, discarding time : ", (this.dt * 1000).toFixed(0), "ms =", (1.0 / this.dt).toFixed(0), "FPS");
                this.dt = 0;
            }
        }
    },
    pause: function Time_pause() {
        this._isRunning = false;
        /// time stops moving, so no `dt`
        this.dt = 0;
    },
    unPause: function Time_unpause() {
        this._isRunning = true;
        /// get on with the times !
        this.t = getBrowserTime();
        this.old_t = this.t;
    },
    isRunning: function Time_isRunning() {
        return this._isRunning;
    },
    isPaused: function Time_isPaused() {
        return !this._isRunning;
    },
};

/*
* The main Time Resource that tracks the frame duration
*/
const Resource_Time = (function build_Time() {
    const obj_Time = Object.create(Resource_Timer);
    obj_Time.name = "time";
    return obj_Time;
})();

/*
* System stages : priorities for running Systems each frame
*/
export const SYSTEM_STAGE = Object.freeze({
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

    let _Controller_animationRequestId;

    /*
    * Run systems
    */
    obj_Controller.start = async function Controller_start() {
        await Data.initAllResources();
        await runSystems(Scene.systemQueue.get(SYSTEM_STAGE.INIT));
        return new Promise(function requestFirstFrame(resolve, reject) {
            _Controller_animationRequestId = window.requestAnimationFrame(animateFrame);
        });
    };

    /*
    * main loop
    */
    async function animateFrame(_timeNow) {
        await Data.updateAllResources();
        await runSystems(Scene.systemQueue.get(SYSTEM_STAGE.FRAME_INIT));
        await runSystems(Scene.systemQueue.get(SYSTEM_STAGE.FRAME_MAIN));
        await runSystems(Scene.systemQueue.get(SYSTEM_STAGE.FRAME_END));
        return new Promise(function requestNewFrame(resolve, reject) {
            _Controller_animationRequestId = window.requestAnimationFrame(animateFrame);
        });
    }

    /*
    * Add System to the main loop, in order
    */
    obj_Controller.addSystem = function Controller_addSystem(system, stage) {
        if (stage == undefined) {
            stage = SYSTEM_STAGE.FRAME_MAIN;
        }
        if (system.promiseRun == undefined) {
            system.promiseRun = function promiseRun_constructed() {
                const args = arguments;
                return new Promise(function promiseRunSystem(resolve, reject) {
                    resolve(system.run(...args));
                })
            };
        }
        Scene.systemQueue.get(stage).push(system);
    };

    /*
    * Run Systems for the main loop, in order
    */
    async function runSystems(systemQueue) {
        let systemRunPromises = [];
        for (let system of systemQueue) {
            const queryResults = {
                ecs: {
                    Data: Data,
                    Controller: Controller,
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
    }

    return obj_Controller;
})();

/*
*   Stores Resources ordered by priority level
*/
const ResourceStore = {
    init: function ResourceStore_init() {
        /// Lists of Resources, ordered by priority level
        this.resources = [];
    },

    add: function ResourceStore_add(resource, initOptions, priority) {
        if (priority == undefined) {
            priority = 0;
        }
        if (this.resources[priority] == undefined) {
            this.resources[priority] = [];
        }
        this.resources[priority].push(resource);
        resource.prepareInit(initOptions);
        return this;
    },

    /*
    *   Get the first Resource that has the queried name
    */
    get: function ResourceStore_get(resourceName) {
        for (let resourceList of this.resources) {
            // for each priority level
            if (resourceList == undefined) {
                continue;
            }
            for (const resource of resourceList) {
                if (resource.name == resourceName) {
                    /// found it, return the first match
                    return resource;
                }
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
            for (let resourceList of this.resources) {
                if (resourceList == undefined) {
                    /// no Resources at current priority level
                    continue;
                }
                let resourcePromises = [];
                for (let resource of resourceList) {
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
            }
            resolve();
        }.bind(this));
    },

    /*
    *   Update all Resources
    */
    updateAll: async function ResourceStore_updateAll() {
        for (let resourceList of this.resources) {
            // for each priority level
            let resourceUpdatePromises = [];
            if (resourceList == undefined) {
                /// no Resources at current priority level
                continue;
            }
            for (let resource of resourceList) {
                if (resource.update) {
                    let updateResult = resource.update();
                    if (updateResult && updateResult.then != undefined) {
                        // add to wait list
                        resourceUpdatePromises.push(updateResult);
                    }
                }
            }
            await Promise.all(resourceUpdatePromises);
        }
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
    obj_Data.gameResources = Object.create(ResourceStore);
    obj_Data.gameResources.init();
    obj_Data.levelResources = Object.create(ResourceStore);
    obj_Data.levelResources.init();

    obj_Data.queryAllResources = function Data_queryAllResources(resourceQuery) {
        const queryResults = {}
        const gameResults = obj_Data.gameResources.query(resourceQuery);
        Object.assign(queryResults, gameResults);
        const levelResults = obj_Data.levelResources.query(resourceQuery);
        Object.assign(queryResults, levelResults);
        return queryResults;
    };

    obj_Data.initAllResources = async function Data_initAllResources() {
        await obj_Data.gameResources.initAll();
        await obj_Data.levelResources.initAll();
    };

    obj_Data.updateAllResources = async function Data_updateAllResources() {
        await obj_Data.gameResources.updateAll();
        await obj_Data.levelResources.updateAll();
    };
    //#endregion
    //#region Systems
    /// { "systemName": system }
    obj_Data.systemsRegistry = new Map();

    obj_Data.registerSystem = function Data_registerSystem(system) {
        if (system.promiseRun == undefined) {
            system.promiseRun = function promiseRun_constructed() {
                const args = arguments;
                return new Promise(function promiseRunSystem(resolve, reject) {
                    resolve(system.run(...args));
                })
            };
        }
        obj_Data.systemsRegistry.set(system.name, system);
    };

    obj_Data.getSystem = function Data_getSystem(systemName) {
        return obj_Data.systemsRegistry.get(systemName);
    };
    //#endregion
    return obj_Data;
})();

/*
*   Manage scheduling and content of all levels and screens
*/
export const Scene = (function build_Scene() {
    const obj_Scene = {};

    let Scene_schedulingConfig, Scene_currentName, Scene_currentConfig;
    obj_Scene.systemQueue = new Map([
        [SYSTEM_STAGE.INIT, []],
        [SYSTEM_STAGE.FRAME_INIT, []],
        [SYSTEM_STAGE.FRAME_MAIN, []],
        [SYSTEM_STAGE.FRAME_END, []],
    ]);

    obj_Scene.init = async function Scene_init() {
        const rawSchedulingFile = await Utils.Http.Request({
            url: "www/schedulingConfig.json",
        });
        Scene_schedulingConfig = JSON.parse(rawSchedulingFile.responseText);
    };

    /*
    *   construct the Systems queue for the current scene
    */
    obj_Scene.load = function Scene_load(sceneName) {
        Scene_currentName = sceneName;
        Scene_currentConfig = Scene_schedulingConfig[Scene_currentName];
        for (const [stageName, systemQueue] of obj_Scene.systemQueue) {
            const systemNames = Scene_currentConfig[stageName];
            if (systemNames === undefined) {
                /// no configuration for this stage
                continue;
            }
            for (const systemName of systemNames) {
                const system = Data.getSystem(systemName);
                systemQueue.push(system);
            }
        }
    };


    return obj_Scene;
})();


/*
*   Initialize system : make user system Resources available
*/
export async function init() {
    await Scene.init();
    Data.gameResources.add(Resource_Time);
}
