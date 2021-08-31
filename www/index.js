import * as ECS from "./ecs.js";
import * as GFX from "./graphics.js";
import * as Input from "./userInput.js";
import * as Game from "./game.js";

/*
* Main program entry point
*   when loading this script, all starts
*/
(function onLoadPage() {
    //#region initialize modules
    /// Always init ECS first
    ECS.init();
    /// init other modules
    GFX.init(ECS);
    Input.init(ECS);
    Game.init(ECS);
    //#endregion
    
    /// Start the game
    ECS.Controller.start();
})()
