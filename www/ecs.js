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
    It can add a new Resource with `Data.addResource()`

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
    2. Run "init"-type Systems. Wait for completion.
    3. Start the main loop :
        1. Run Resource systems `Resource.update()`. TODO Wait for completion ?
        2. Run "normal" Systems in "order" (TODO actually wait to make it really ordered ?) :
            1. SYSTEM_STAGE.INIT
            2. SYSTEM_STAGE.MAIN
            3. SYSTEM_STAGE.END


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
    It can query other Resources during initilaization, through its `.initQueryResources` property.
    If it has an `.update()` function, then it will be called at every frame.

    ## Add a new Resource

    Add a new Resource to the program flow with :
    
    ```
    Data.addResource(Resource_Something, initOptions, priority)
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
        resourceQuery: ["resource1", "resource2", ...],
        componentQueries: {
            queryName1: ["componentA", "componentB", ...],
            queryName2: ["componentC", "componentA", ...],
        },
        run: function(queryResults) {
            // queryResults will contain the following :
            queryResults == {
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

    Add a new System with :
    ```
    Controller.addSystem(
        System_Something,
        SYSTEM_STAGE,  // optional, default to MAIN
    );
    ```

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

function getBrowserTime() {
    return performance.now() / 1000.0;
}

/*
*   A Timer Resource or Component that can be derived with Object.create()
*/
const Resource_Timer = {
    name: "timer",
    _isRunning: true,
    prepareInit: function Physics_prepareInit(initOptions) {
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
        }
    },
    pause: function Time_pause() {
        Utils.debug("pausing a threat");
        this._isRunning = false;
        /// time stops moving, so no `dt`
        this.dt = 0;
    },
    unPause: function Time_unpause() {
        this._isRunning = true;
        /// get on with the times !
        this.t = getBrowserTime();
        this.old_t = this.t;
        Utils.debug("unpausing a threat");
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
const Resource_Time = Object.create(Resource_Timer);
Resource_Time.name = "time";

/*
* System stages : priorities for running Systems each frame
*/
export const SYSTEM_STAGE = Object.freeze({
    INIT: 0,
    MAIN: 1,
    END: 2,
});

/*
* Program flow control
*/
export const Controller = (function build_Controller() {
    const obj_Controller = {};

    let Controller_animationRequestId;
    let Controller_initSystemQueue = [];
    let Controller_systemQueue = new Map([
        [SYSTEM_STAGE.INIT, []],
        [SYSTEM_STAGE.MAIN, []],
        [SYSTEM_STAGE.END, []],
    ]);

    /*
    * Run systems
    */
    obj_Controller.start = function Controller_start() {
        initResourceSystems().then(function promiseRunInitSystems(resolve, reject) {
            runInitSystems();
        }).then(function promiseStartAnimationFrame(resolve, reject) {
            Controller_animationRequestId = window.requestAnimationFrame(animateFrame);
        });
    };

    /*
    * main loop
    */
    function animateFrame(_timeNow) {
        runResourceSystems();
        runSystems(Controller_systemQueue.get(SYSTEM_STAGE.INIT));
        runSystems(Controller_systemQueue.get(SYSTEM_STAGE.MAIN));
        runSystems(Controller_systemQueue.get(SYSTEM_STAGE.END));
        Controller_animationRequestId = window.requestAnimationFrame(animateFrame);
    }

    /*
    * Add System to the init stage, in order
    */
    obj_Controller.addInitSystem = function Controller_addInitSystem(run, ...args) {
        Controller_initSystemQueue.push({
            run: run,
            args: args,
        });
    };

    /*
    * Run Systems from the init stage, in order
    */
    function runInitSystems() {
        for (let system of Controller_initSystemQueue) {
            system.run(...system.args);
        }
    }

    function initResourceSystems() {
        return new Promise(async function promiseInitializedResourceSystems(resolve, reject) {
            for (let priority = 0; priority < Data.resources.length; priority++) {
                const resourceList = Data.resources[priority];
                let resourcePromises = [];
                for (let resource of resourceList) {
                    // Resources may query for other resources during initialization
                    let queryResourcesResult = [];
                    if (resource.initQueryResources) {
                        queryResourcesResult = resource.initQueryResources.map(function getQueryResource(queryName) {
                            // take the 1st one only, don't expect several Resources with the same name
                            let requiredResource = Data.getResources(queryName)[0];
                            return requiredResource;
                        });
                    }
                    // initiate initialization
                    let initResult = resource.init(...queryResourcesResult);
                    if (initResult && initResult.then != undefined) {
                        // add to wait list
                        resourcePromises.push(initResult);
                    }
                }
                // wait for completion of all resources of this priority level
                await Promise.all(resourcePromises);
            }
            resolve();
        });
    }

    function runResourceSystems() {
        for (let resourceList of Data.resources) {
            // for each priority level
            for (let resource of resourceList) {
                if (resource.update) {
                    resource.update();
                }
            }
        }
    }

    /*
    * Add System to the main loop, in order
    */
    obj_Controller.addSystem = function Controller_addSystem(system, stage) {
        stage = stage || SYSTEM_STAGE.MAIN;
        Controller_systemQueue.get(stage).push(system);
    };

    /*
    * Run Systems for the main loop, in order
    */
    function runSystems(systemQueue) {
        for (let system of systemQueue) {
            const queryResults = {};
            //#region prepare requested Resources
            if (system.resourceQuery) {
                queryResults.resources = Data.getAllResourcesNamed(system.resourceQuery);
            }
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
            system.run(queryResults);
        }
    }

    return obj_Controller;
})();

/*
* Program data, holds Entities and Resources
*/
export const Data = (function build_Data() {
    const obj_Data = {};

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

    obj_Data.resources = [];

    obj_Data.addResource = function Data_addResource(resource, initOptions, priority) {
        if (priority == undefined) {
            priority = 0;
        }
        if (obj_Data.resources[priority] == undefined) {
            obj_Data.resources[priority] = [];
        }
        obj_Data.resources[priority].push(resource);
        resource.prepareInit(initOptions);
        return obj_Data;
    };

    obj_Data.getResources = function Data_getResources(resourceName) {
        let filteredResources = []
        for (let resourceList of obj_Data.resources) {
            // for each priority level
            if (resourceList == undefined) {
                continue;
            }
            filteredResources.push(...resourceList.filter(function filterResource(resource) {
                return resource.name == resourceName;
            }));
        }
        return filteredResources;
    };

    obj_Data.getAllResourcesNamed = function Data_getAllResourcesNamed(resourceQuery) {
        const resourceResult = {};
        for (const queryName of resourceQuery) {
            resourceResult[queryName] = obj_Data.getResources(queryName)[0];
        }
        return resourceResult;
    };

    return obj_Data;
})();

/*
*   Initialize system : make user system Resources available
*/
export function init() {
    Data.addResource(Resource_Time, 99);
}
