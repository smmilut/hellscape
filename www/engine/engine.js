import * as Controller from "./controller.js";
import * as Entities from "./entities.js";
import * as Resources from "./resources.js";
import * as Scenes from "./scenes.js";
import * as Systems from "./systems.js";
/**
    Game engine like an "ECS" :
     game data management inspired by ECS (ideally, let's get there at some point)
    
    This is mostly a wrapper module of functions that exist in sub-modules

    # Concepts :

     - Entity : a data "id"
     - Component : a data that belongs to an Entity
     - System : a routine that performs actions on Components, using Resources
     - Resource : global data detached from Entities
     - Scene : a level configuration composed of Systems, Resources, and their initial configuration

    @module engine
*/

/**
* System stages : priorities for running Systems each frame
*/
export const SYSTEM_STAGE = Object.freeze({
    INIT: "init",
    FRAME_INIT: "frameInit",
    FRAME_MAIN: "frameMain",
    FRAME_END: "frameEnd",
});

/**
 * Load and init globals
 * 
 * Call this first in the loading sequence.
 */
export async function prepare() {
    Scenes.Scene.loadGlobals();
    return await initGlobalResources();
}

/**
 * Initialize the currently loaded Resources and Systems
 * 
 * Call this after loading a level.
 */
export async function initLevel() {
    await initLevelResources();
    return await runStage(SYSTEM_STAGE.INIT);
}

//#region Controller : flow control
/** Start the main loop */
export function start() {
    return Controller.Controller.start();
}

export function stop() {
    return Controller.Controller.stop();
}
//#endregion
//#region Entities
export function spawn() {
    return Entities.Entities.spawn();
}

export function queryComponents(componentQuery) {
    return Entities.Entities.queryComponents(componentQuery);
}

export function despawnAll() {
    return Entities.Entities.despawnAll();
}
//#endregion
//#region Resources
export function registerResource(resource) {
    return Resources.Resources.register(resource)
}

export async function initGlobalResources() {
    return await Resources.Resources.initGlobal();
}

export async function initLevelResources() {
    return await Resources.Resources.initLevel();
}

export async function updateAllResources() {
    return await Resources.Resources.updateAll();
}

export function loadGlobalResourceConfigs(resourceConfigs) {
    return Resources.Resources.loadGlobalConfigs(resourceConfigs);
}

export function loadLevelResourceConfigs(resourceConfigs) {
    return Resources.Resources.loadLevelConfigs(resourceConfigs);
}

export function queryAllResources(resourceQuery) {
    return Resources.Resources.queryAll(resourceQuery);
}
//#endregion
//#region Scene
/** Find the first level configuration and load it */
export function loadFirstLevel() {
    return Scenes.Scene.loadFirstLevel();
}

export async function loadNextScene() {
    return await Scenes.Scene.loadNext();
}
//#endregion
//#region Systems
export function registerSystem(system) {
    return Systems.Systems.register(system);
}

export async function runStage(stage) {
    return await Systems.Systems.runStage(stage);
}

export function loadSystemQueues(systemQueueConfig) {
    return Systems.Systems.loadQueues(systemQueueConfig);
}
//#endregion

/**
 * Init all sub modules
 * 
 * Call this first.
 */
async function initSubModules() {
    await Controller.init();
    await Entities.init();
    await Resources.init();
    await Systems.init();
    await Scenes.init();
}

/** Call when loading */
export async function init() {
    await initSubModules();
}
