import * as Engine from "../engine.js";
import * as Utils from "../utils.js";
/*
    # Scene : Levels scene management

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
                "init": ["list of system names or init objects",
                    "systemName1",
                    {
                        "name" : "systemName2",
                        "initOptions": {object passed to the system during Scene loading},
                    }
                    ...
                ],
                "frameMain": ["list of system names or init objects", ...],
                "frameEnd": ["list of system names or init objects", ...],
            },
            "next": "levelY"
        },
        "levelY" : {}, // etc...
    }

*/

/*
*   Manage loading the configuration of all levels and screens (Systems, Resources)
*/
export const Scene = (function build_Scene() {
    const obj_Scene = {};

    let Scene_fullConfig, Scene_currentName, Scene_currentConfig, Scene_nextName;

    obj_Scene.init = async function Scene_init() {
        const rawSchedulingFile = await Utils.Http.Request({
            url: "www/config/scenes.json",
        });
        Scene_fullConfig = JSON.parse(rawSchedulingFile.responseText);
        Scene_nextName = Scene_fullConfig["firstLevel"];
    };

    obj_Scene.loadFirstLevel = function Scene_loadFirstLevel() {
        const levelName = Scene_fullConfig["firstLevel"];
        obj_Scene.load(levelName);
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
        Engine.loadGlobalResourceConfigs(resourceConfigs);
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
            Engine.loadLevelResourceConfigs(resourceConfigs);
        }
        const systemQueueConfig = Scene_currentConfig.systems;
        if (systemQueueConfig !== undefined) {
            Engine.loadSystemQueues(systemQueueConfig);
        }
    };

    obj_Scene.loadNext = async function Scene_loadNext() {
        /// interrupt the frame
        Engine.stop();
        Engine.despawnAll();
        obj_Scene.load(Scene_nextName);
        await Engine.initLevel();
        Engine.start();
    };

    return obj_Scene;
})();

/*
*   Initialize system : make user system Resources available
*/
export async function init() {
    await Scene.init();
}
