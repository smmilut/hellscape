import * as ECS from "./ecs.js";
import * as GFX from "./graphics.js";
import * as Input from "./userInput.js";
import * as Game from "./game.js";

async function initSubModules(ecs) {
    /// Always init ECS first
    await ecs.init();
    /// init other modules
    GFX.init(ecs);
    Input.init(ecs);
    Game.init(ecs);
}

/*
* Main program entry point
*   when loading this script, all starts
*/
(async function onLoadPage() {
    await initSubModules(ECS);
    ECS.Scene.loadGlobals();
    ECS.Scene.load("welcome");
    await ECS.Controller.initLevel();
    ECS.Controller.start();
})()
