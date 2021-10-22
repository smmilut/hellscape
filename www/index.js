import * as Engine from "./engine/engine.js";
import * as EngineUtils from "./engineUtils.js";
import * as Graphics from "./graphics/graphics.js";
import * as Input from "./userInput.js";
import * as Game from "./game/game.js";

/**
 * Init all sub modules
 * 
 * Call this first.
 */
async function initSubModules(engine) {
    /// Always init engine first
    await engine.init();
    /// init other modules
    EngineUtils.init(engine);
    Graphics.init(engine);
    Input.init(engine);
    Game.init(engine);
}


/** Call when loading */
export async function init() {
    /// init modules first
    await initSubModules(Engine);
    /// load game
    await Engine.prepare();
    Engine.loadFirstLevel();
    await Engine.initLevel();
}

/** Launch main loop */
export async function start() {
    /// launch main loop
    Engine.start();
}

/*
* Main program entry point
*   when loading this script, all starts
*/
(async function onLoadPage() {
    await init();
    start();
})()
