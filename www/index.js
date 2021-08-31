import * as ECS from "./ecs.js";
import * as GFX from "./graphics.js";
import * as Input from "./userInput.js";
import * as Game from "./game.js";

function initSubModules(ecs) {
    /// Always init ECS first
    ecs.init();
    /// init other modules
    GFX.init(ecs);
    Input.init(ecs);
    Game.init(ecs);
}

function startGame(ecs) {
    ecs.Controller.start();
}

/*
* Main program entry point
*   when loading this script, all starts
*/
(function onLoadPage() {
    initSubModules(ECS);
    startGame(ECS);
})()
