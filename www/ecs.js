const Timer = {
    name: "timer",
    prepareInit: function Physics_prepareInit(initOptions) {
        this.initOptions = initOptions || {};
    },
    init: function Time_init() {
        this.t = 0.0;
        this.old_t = 0.0;
        this.dt = 0.0;
    },
    update: function updateTime() {
        this.old_t = this.t;
        this.t = performance.now() / 1000.0;
        this.dt = (this.t - this.old_t);
    },
};

export const TimeResource = Object.create(Timer);
TimeResource.name = "time";

export const SYSTEM_STAGE = Object.freeze({
    INIT: 0,
    MAIN: 1,
    END: 2,
});

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
                            return Data.getResources(queryName)[0];
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
            //#region prepare requested Resources
            let queryResourcesResult = [];
            if (system.queryResources) {
                queryResourcesResult = system.queryResources.map(function getQueryResource(queryName) {
                    // take the 1st one only, don't expect several Resources with the same name
                    return Data.getResources(queryName)[0];
                });
            }
            //#endregion
            if (system.queryComponents == undefined) {
                // no Components requested, run once
                system.run(...queryResourcesResult);
            } else {
                //#region prepare requested Components
                let queryComponents = system.queryComponents;
                for (let entity of Data.entities) {
                    let queryComponentsResult = [];
                    if (entity.hasAllComponents(queryComponents)) {
                        // this Entity is valid for the query
                        queryComponentsResult = queryComponents.map(function getQueryComponent(queryName) {
                            // take the 1st one only, don't expect several Components with the same name
                            return entity.getComponents(queryName)[0];
                        });
                        system.run(...queryResourcesResult, ...queryComponentsResult);
                    }
                }
            }
            //#endregion
        }
    }

    return obj_Controller;
})();


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

    obj_Data.getResources = function Entity_getResources(resourceName) {
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

    return obj_Data;
})();

export function init() {
    Data.addResource(TimeResource);
}