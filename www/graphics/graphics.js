import * as Camera from "./camera.js";
import * as LevelSprite from "./levelSprite.js";
import * as Backdrop from "./backdrop.js";
import * as Sprites from "./sprite.js";
import * as Welcome from "./welcome.js";

function initSubModules(engine) {
    Camera.init(engine);
    LevelSprite.init(engine);
    Backdrop.init(engine);
    Sprites.init(engine);
    Welcome.init(engine);
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
    resourceQuery: ["camera", "time"],
    componentQueries: {
        backdrops: ["backdrop", "position"],
    },
    run: function renderBackdrop(queryResults) {
        let camera = queryResults.resources.camera;
        let time = queryResults.resources.time;
        queryResults.components.backdrops.sort(function zCompare(b1, b2) {
            return b2.position.z - b1.position.z;
        });
        for (let b of queryResults.components.backdrops) {
            camera.render(b.backdrop, b.position);
            b.backdrop.updateAnimation(time.dt);
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
*   Initialize graphics : make graphic Resource available
*/
export function init(engine) {
    initSubModules(engine);
    engine.registerSystem(System_clearBackground);
    engine.registerSystem(System_renderBackdrop);
    engine.registerSystem(System_renderLevel);
    engine.registerSystem(System_renderSprites);
}
