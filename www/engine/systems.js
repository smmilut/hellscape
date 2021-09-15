import * as Engine from "../engine.js";
/*
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
                engine: {
                    (the Engine module)
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

*/

/*
*   template object to Store Systems
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
    const obj_Systems = {};

    obj_Systems.init = function Systems_init() {
        obj_Systems.registry = newSystemRegistry();
    };

    obj_Systems.register = function Systems_register(system) {
        obj_Systems.registry.register(system);
    };

    obj_Systems.clearQueues = function Systems_clearQueues() {
        /// a map of { systemStage: [system1, system2, ...] }
        obj_Systems.queues = new Map([
            [Engine.SYSTEM_STAGE.INIT, []],
            [Engine.SYSTEM_STAGE.FRAME_INIT, []],
            [Engine.SYSTEM_STAGE.FRAME_MAIN, []],
            [Engine.SYSTEM_STAGE.FRAME_END, []],
        ]);
    };

    /*
    *   Load the System queues config into the current System queues
    */
    obj_Systems.loadQueues = function Systems_loadQueues(systemQueueConfig) {
        obj_Systems.clearQueues();
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
    obj_Systems.runStage = async function Systems_runStage(stage) {
        const systemQueue = obj_Systems.queues.get(stage);
        let systemRunPromises = [];
        for (let system of systemQueue) {
            const queryResults = {
                engine: Engine,
            };
            //#region prepare requested Resources
            queryResults.resources = Engine.queryAllResources(system.resourceQuery);
            //#endregion
            if (system.componentQueries != undefined) {
                //#region prepare requested Components
                // the map of { queryName: queryResult }
                queryResults.components = {};
                for (let componentQueryName in system.componentQueries) {
                    // the list of names of queried Components
                    const componentQuery = system.componentQueries[componentQueryName];
                    queryResults.components[componentQueryName] = Engine.queryComponents(componentQuery);
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
*   Initialize system : make user system Resources available
*/
export async function init() {
    await Systems.init();
}
