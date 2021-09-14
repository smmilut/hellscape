import * as LevelGrid from "./game/levelGrid.js";
import * as Physics from "./game/physics.js";
import * as Player from "./game/player.js";
import * as Mobs from "./game/mobs.js";

function initSubModules(ecs) {
    LevelGrid.init(ecs);
    Physics.init(ecs);
    Player.init(ecs);
    Mobs.init(ecs);
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
                    p.attack.isAttacking
                ) {
                    /// attacking that victim
                    mob.mobState.state = Mobs.MOB_STATES.DYING;
                }
            }
        }
    },
};

export function init(ecs) {
    initSubModules(ecs);
    //#region game Systems running always, and in this order
    ecs.Systems.register(System_checkCollisions);
    //#endregion
}
