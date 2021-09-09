import * as Utils from "./utils.js";
import * as Camera from "./graphics/camera.js";
import * as LevelSprite from "./graphics/levelSprite.js";
import * as Backdrop from "./graphics/backdrop.js";
import * as Sprites from "./graphics/sprite.js";

function initSubModules(ecs) {
    Camera.init(ecs);
    LevelSprite.init(ecs);
    Backdrop.init(ecs);
    Sprites.init(ecs);
}

const System_clearBackground = {
    name: "clearBackground",
    resourceQuery: ["camera"],
    run: function clearBackground(queryResults) {
        let camera = queryResults.resources.camera;
        camera.clear();
    },
};

const System_renderBackdrop = {
    name: "renderBackdrop",
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
    name: "renderLevel",
    resourceQuery: ["camera", "levelSprite"],
    run: function renderLevel(queryResults) {
        let camera = queryResults.resources.camera;
        const levelSprite = queryResults.resources.levelSprite;
        camera.render(levelSprite, { x: 0, y: 0 });
    }
};

const System_renderSprites = {
    name: "renderSprites",
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
    ecs.Data.registerSystem(System_clearBackground);
    ecs.Data.registerSystem(System_renderBackdrop);
    ecs.Data.registerSystem(System_renderLevel);
    ecs.Data.registerSystem(System_renderSprites);
    //#endregion
}
