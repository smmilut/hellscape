import * as Engine from "./engine/engine.js";
import * as EngineUtils from "./engineUtils.js";
import * as Graphics from "./graphics/graphics.js";
import * as Input from "./userInput.js";
import * as Game from "./game/game.js";

async function initSubModules(engine) {
    /// Always init engine first
    await engine.init();
    /// init other modules
    EngineUtils.init(engine);
    Graphics.init(engine);
    Input.init(engine);
    Game.init(engine);
}

/*
* Main program entry point
*   when loading this script, all starts
*/
(async function onLoadPage() {
    await initSubModules(Engine);
    Engine.prepare();
    Engine.loadFirstLevel();
    await Engine.initLevel();
    Engine.start();
})()
