import * as Physics from "./physics.js";
import * as Actions from "./actions.js";
import * as Sprites from "../graphics/sprite.js";
import * as Utils from "../utils.js";

const newComponent_TagMob = function newTagMob(_initOptions) {
    return {
        name: "tagMob",
    };
};

export const MOB_STATES = Object.freeze({
    STANDING: 0,
    FLEEING: 1,
    JUMPING: 2,
    DYING: 3,
    DEAD: 4,
});

const newComponent_MobState = function newMobState(initOptions) {
    initOptions = initOptions || {};
    return {
        name: "mobState",
        state: initOptions.state,
    };
};

const System_mobBehave = {
    name: "mobBehave",
    resourceQuery: ["levelGrid", "time"],
    componentQueries: {
        mobs: ["position", "speed", "facing", "jump", "sprite", "mobState", "tagMob"],
    },
    run: function mobBehave(queryResults) {
        let time = queryResults.resources.time;
        if (time.isPaused()) {
            return;
        }
        let levelGrid = queryResults.resources.levelGrid;
        for (let e of queryResults.components.mobs) {
            if (e.mobState.state == MOB_STATES.FLEEING || e.mobState.state == MOB_STATES.JUMPING) {
                /// collisionning
                switch (e.facing.direction) {
                    case Actions.FACING.RIGHT:
                        if (levelGrid.hasCollisionAtDirection(e.position, levelGrid.COLLISION_DIRECTION.RIGHT)
                            && e.position.xRatio >= 0.7) {
                            /// met a wall, flip left
                            e.facing.direction = Actions.FACING.LEFT;
                        } else {
                            /// continue running
                            e.speed.incrementRight();
                        }
                        break;
                    case Actions.FACING.LEFT:
                        if (levelGrid.hasCollisionAtDirection(e.position, levelGrid.COLLISION_DIRECTION.LEFT)
                            && e.position.xRatio <= 0.3) {
                            /// met a wall, flip right
                            e.facing.direction = Actions.FACING.RIGHT;
                        } else {
                            /// continue running
                            e.speed.incrementLeft();
                        }
                        break;
                }
            }
            let actionName = Actions.ACTION_POSE.NONE;
            switch (e.mobState.state) {
                case MOB_STATES.FLEEING:
                    actionName = Actions.ACTION_POSE.WALKPANIC;
                    /// Randomly switch to jumping
                    e.mobState.state = Utils.Rng.selectWeighted([
                        {
                            value: MOB_STATES.FLEEING,
                            weight: 15,
                        },
                        {
                            value: MOB_STATES.JUMPING,
                            weight: 1,
                        },
                    ])
                    break;
                case MOB_STATES.JUMPING:
                    e.jump.apply(e.speed)
                    actionName = Actions.ACTION_POSE.JUMP;
                    if (e.jump.qtyLeft <= 0.0) {
                        /// next, switch to flee
                        e.jump.rearm();
                        e.mobState.state = MOB_STATES.FLEEING;
                    }
                    break;
                case MOB_STATES.DYING:
                    e.speed.x = 0;
                    if (levelGrid.hasCollisionAtDirection(e.position, levelGrid.COLLISION_DIRECTION.UP)
                        && e.position.yRatio <= 0.3
                    ) {
                        e.speed.y = 0;
                        e.mobState.state == MOB_STATES.DYING;
                        actionName = Actions.ACTION_POSE.PINNED;
                    } else {
                        e.speed.y = -20;
                        actionName = Actions.ACTION_POSE.JUMP;
                    }
                    break;
            }
            e.sprite.setPose({
                action: actionName,
                facing: e.facing.direction
            });
        }
    },
};

async function spawnNewMob(engine, gridX, gridY) {
    return engine.spawn()
        .addComponent(newComponent_TagMob())
        .addComponent(Physics.newComponent_Position({
            gridX: gridX,
            gridY: gridY,
        }))
        .addComponent(Physics.newComponent_Speed({
            increment: 1.0,
        }))
        .addComponent(Actions.newComponent_Facing({
            direction: Actions.FACING.RIGHT,
        }))
        .addComponent(Actions.newComponent_Jump({
            speedIncrement: 8.0,
        }))
        .addComponent(Actions.newComponent_Collider({
            width: 10,
            height: 15,
        }))
        .addComponent(newComponent_MobState({
            state: MOB_STATES.FLEEING,
        }))
        .addComponent(await Sprites.newComponent_Sprite({
            sheetSrc: "assets/suitBoss_sheet.png",
            sheetConfigUrl: "assets/suitBoss_sheet.json"
            }
        ));
}

const System_spawnMobs = {
    name: "spawnMobs",
    resourceQuery: ["levelGrid"],
    run: function spawnMobs(queryResults) {
        const engine = queryResults.engine;
        const levelGrid = queryResults.resources.levelGrid;
        const levelData = levelGrid.data;
        /// iterate the level map data
        for (let rowIndex = 0; rowIndex < levelData.length; rowIndex++) {
            const row = levelData[rowIndex];
            for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
                if (row[columnIndex] == levelGrid.TILE_TYPE.MOB) {
                    spawnNewMob(engine, columnIndex, rowIndex);
                }
            }
        }
    },
};

export function init(engine) {
    engine.registerSystem(System_spawnMobs);
    engine.registerSystem(System_mobBehave);
}