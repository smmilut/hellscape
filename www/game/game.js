import * as LevelGrid from "./levelGrid.js";
import * as Physics from "./physics.js";
import * as Player from "./player.js";
import * as Mobs from "./mobs.js";

/**
 * Game-specific modules
 * @module game
 */


function initSubModules(engine) {
    LevelGrid.init(engine);
    Physics.init(engine);
    Player.init(engine);
    Mobs.init(engine);
}

const System_checkCollisions = {
    name: "checkCollisions",
    componentQueries: {
        player: ["position", "collider", "attack", "tagPlayer"],
        mobs: ["position", "collider", "mobState", "tagMob"],
    },
    run: function checkCollisions(queryResults) {
        for (let p of queryResults.components.player) {
            for (let mob of queryResults.components.mobs) {
                if (
                    p.collider.hasCollisionWith(p.position, mob.collider, mob.position) &&
                    p.attack.isAttacking()
                ) {
                    /// attacking that victim
                    mob.mobState.state = Mobs.MOB_STATES.DYING;
                }
            }
        }
    },
};

const System_playerExit = {
    name: "playerExit",
    resourceQuery: ["levelGrid"],
    componentQueries: {
        player: ["position", "speed", "tagPlayer"],
    },
    run: function playerExit(queryResults) {
        let levelGrid = queryResults.resources.levelGrid;

        for (let p of queryResults.components.player) {
            if (levelGrid.isAtExit(p.position)) {
                queryResults.engine.loadNextScene();
                return;
            }
        }
    },
};

/** Call when loading */
export function init(engine) {
    initSubModules(engine);
    engine.registerSystem(System_checkCollisions);
    engine.registerSystem(System_playerExit);
}
