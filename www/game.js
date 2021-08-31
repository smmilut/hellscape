import * as LevelGrid from "./game/levelGrid.js";
import * as Physics from "./game/physics.js";
import * as Player from "./game/player.js";
import * as Mobs from "./game/mobs.js";


export function init(ecs) {
    //#region init sub modules
    Physics.init(ecs);
    Player.init(ecs);
    Mobs.init(ecs);
    //#endregion
    
    ecs.Controller.addSystem({
        resourceQuery: ["levelgrid", "time", "physics"],
        componentQueries: {
            mobiles: ["position", "speed"],
        },
        run: function moveSprite(queryResults) {
            let levelgrid = queryResults.resources.levelgrid;
            let time = queryResults.resources.time;
            let physics = queryResults.resources.physics;

            for (let e of queryResults.components.mobiles) {
                levelgrid.updatePixelPosition(e.position);

                e.position.xRatio += e.speed.x * time.dt;
                e.speed.x *= physics.friction;

                if (levelgrid.hasCollisionAtDirection(e.position, LevelGrid.COLLISION_DIRECTION.RIGHT)
                    && e.position.xRatio >= 0.7) {
                    e.position.xRatio = 0.7;
                    e.speed.x = 0;
                };

                if (levelgrid.hasCollisionAtDirection(e.position, LevelGrid.COLLISION_DIRECTION.LEFT)
                    && e.position.xRatio <= 0.3) {
                    e.position.xRatio = 0.3;
                    e.speed.x = 0;
                };

                while (e.position.xRatio > 1) { e.position.xRatio--; e.position.gridX++; }
                while (e.position.xRatio < 0) { e.position.xRatio++; e.position.gridX--; }

                e.position.yRatio += e.speed.y * time.dt;
                e.speed.y += physics.gravity;
                e.speed.y *= physics.friction;

                if (levelgrid.hasCollisionAtDirection(e.position, LevelGrid.COLLISION_DIRECTION.UP)
                    && e.position.yRatio <= 0.3) {
                    e.position.yRatio = 0.3;
                    e.speed.y = Math.max(e.speed.y, 0);
                };

                if (levelgrid.hasCollisionAtDirection(e.position, LevelGrid.COLLISION_DIRECTION.DOWN)
                    && e.position.yRatio >= 0.5) {
                    e.position.yRatio = 0.5;
                    e.speed.y = 0;
                };

                while (e.position.yRatio > 1) { e.position.yRatio--; e.position.gridY++; }
                while (e.position.yRatio < 0) { e.position.yRatio++; e.position.gridY--; }
            }
        },
    });

    ecs.Controller.addSystem({
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
                        //console.log("attacking that victim");
                        mob.mobState.state = Mobs.MOB_STATES.DYING;
                    }
                }
            }
        },
    });
}
