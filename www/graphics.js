import * as Camera from "./graphics/camera.js";
import * as LevelGrid from "./game/levelGrid.js"
import * as LevelSprite from "./graphics/levelSprite.js"
import * as Sprites from "./graphics/sprite.js"



/*
*   Initialize graphics : make graphic Resource available, run graphics Systems every frame
*/
export function init(ecs) {
    //#region graphics Resources available to all
    Camera.init(ecs);
    LevelGrid.init(ecs);
    LevelSprite.init(ecs);
    Sprites.init(ecs);
    //#endregion

    //#region graphics Systems running always, and in this order
    ecs.Controller.addSystem(
        {
            resourceQuery: ["camera", "backdrop", "levelsprite"],
            run: function clearBackground(queryResults) {
                let camera = queryResults.resources.camera;
                camera.clear();
                const backdrop = queryResults.resources.backdrop;
                camera.render(backdrop, { x: 0, y: 0 });
                const levelsprite = queryResults.resources.levelsprite;
                camera.render(levelsprite, { x: 0, y: 0 });
            },
        },
        ecs.SYSTEM_STAGE.END
    );
    ecs.Controller.addSystem(
        {
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
        },
        ecs.SYSTEM_STAGE.END
    );
    //#endregion
}
