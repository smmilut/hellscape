import * as Utils from "./utils.js";
import * as Camera from "./graphics/camera.js";
import * as LevelSprite from "./graphics/levelSprite.js";
import * as Sprites from "./graphics/sprite.js";

function initSubModules(ecs) {
    Camera.init(ecs);
    LevelSprite.init(ecs);
    Sprites.init(ecs);
}

const System_clearBackground = {
    resourceQuery: ["camera"],
    run: function clearBackground(queryResults) {
        let camera = queryResults.resources.camera;
        camera.clear();
    },
};

const System_renderBackdrop = {
    resourceQuery: ["camera"],
    componentQueries: {
        backdrops: ["backdrop", "position"],
    },
    run: function renderBackdrop(queryResults) {
        let camera = queryResults.resources.camera;
        for (let e of queryResults.components.backdrops) {
            camera.render(e.backdrop, e.position);
        }
    }
};

const System_renderLevel = {
    resourceQuery: ["camera", "levelsprite"],
    run: function renderLevel(queryResults) {
        let camera = queryResults.resources.camera;
        const levelsprite = queryResults.resources.levelsprite;
        camera.render(levelsprite, { x: 0, y: 0 });
    }
};

const System_renderSprites = {
    resourceQuery: ["camera"],
    componentQueries: {
        sprites: ["sprite", "position"],
    },
    run: function renderSprites(queryResults) {
        let camera = queryResults.resources.camera;
        for (let e of queryResults.components.sprites) {
            camera.render(e.sprite, e.position);
        }
    }
};



/*
*   Initialize graphics : make graphic Resource available, run graphics Systems every frame
*/
export function init(ecs) {
    initSubModules(ecs);
    //#region graphics Systems running always, and in this order
    /// TODO : replace this ordering by a Z ordering
    ecs.Controller.addSystem(System_clearBackground, ecs.SYSTEM_STAGE.FRAME_END);
    ecs.Controller.addSystem(System_renderBackdrop, ecs.SYSTEM_STAGE.FRAME_END);
    ecs.Controller.addSystem(System_renderLevel, ecs.SYSTEM_STAGE.FRAME_END);
    ecs.Controller.addSystem(System_renderSprites, ecs.SYSTEM_STAGE.FRAME_END);
    //#endregion
}
