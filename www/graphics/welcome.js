import * as Utils from "../utils.js";
/**
 * Module for the welcome screen
 * @module welcome
 */

/** Component to tag if an Entity is a welcome screen */
const newComponent_TagWelcome = function newTagWelcome(_initOptions) {
    return {
        name: "tagWelcome",
    };
};


/**
* A Fullscreen Image
*/
const newComponent_Fullscreen = async function newComponent_Fullscreen(initOptions) {
    // the object we are building
    const obj_Fullscreen = initOptions;
    obj_Fullscreen.name = "fullscreen";

    obj_Fullscreen.init = async function Fullscreen_init() {
        obj_Fullscreen.image = await Utils.File.ImageLoader.get(obj_Fullscreen.sheetSrc);
    };

    obj_Fullscreen.draw = function Fullscreen_draw(context, position) {
        context.drawImage(obj_Fullscreen.image, position.x, position.y);
    };

    await obj_Fullscreen.init();

    return obj_Fullscreen;
};

const System_spawnWelcome = {
    name: "spawnWelcome",
    run: async function spawnWelcome(queryResults) {
        const engine = queryResults.engine;
        engine.spawn()
            .addComponent(newComponent_TagWelcome())
            .addComponent(await newComponent_Fullscreen({
                sheetSrc: "assets/welcome.png",
            }));
    },
};

const System_renderWelcome = {
    name: "renderWelcome",
    resourceQuery: ["camera"],
    componentQueries: {
        welcome: ["fullscreen", "tagWelcome"],
    },
    run: function renderWelcome(queryResults) {
        let camera = queryResults.resources.camera;
        for (let e of queryResults.components.welcome) {
            camera.render(e.fullscreen, { x: 0, y: 0 });
        }
    }
};

const System_welcomeHandleInput = {
    name: "welcomeHandleInput",
    resourceQuery: ["input"],
    run: function welcomeHandleInput(queryResults) {
        let input = queryResults.resources.input;
        if (input.isKeyDown(input.USER_ACTION.MENU)) {
            queryResults.engine.loadNextScene();
        }
    },
};

/** Call when loading */
export function init(engine) {
    engine.registerSystem(System_spawnWelcome);
    engine.registerSystem(System_renderWelcome);
    engine.registerSystem(System_welcomeHandleInput);
}