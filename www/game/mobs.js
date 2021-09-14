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

const enemySpriteSheetOptions = {
    src: "assets/enemy_sheet.png",
    sheetCellWidth: 16,
    sheetCellHeight: 16,
    sheetLayout: [
        {
            pose: {
                name: "WalkRight",
                facing: Actions.FACING.RIGHT,
                action: Actions.ACTION_POSE.WALK,
            },
            animation: {
                length: 3,
                type: Sprites.ANIMATION_TYPE.PINGPONG,
                frameDuration: 0.100,
            },
        },
        {
            pose: {
                name: "WalkLeft",
                facing: Actions.FACING.LEFT,
                action: Actions.ACTION_POSE.WALK,
            },
            animation: {
                length: 3,
                type: Sprites.ANIMATION_TYPE.PINGPONG,
                frameDuration: 0.100,
            },
        },
        {
            pose: {
                name: "TalkRight",
                facing: Actions.FACING.RIGHT,
                action: Actions.ACTION_POSE.UNUSED,
            },
            animation: {
                length: 2,
                type: Sprites.ANIMATION_TYPE.FORWARD,
                frameDuration: 0.100,
            },
        },
        {
            pose: {
                name: "TalkLeft",
                facing: Actions.FACING.LEFT,
                action: Actions.ACTION_POSE.UNUSED,
            },
            animation: {
                length: 2,
                type: Sprites.ANIMATION_TYPE.FORWARD,
                frameDuration: 0.100,
            },
        },
        {
            pose: {
                name: "CloseFolderRight",
                facing: Actions.FACING.RIGHT,
                action: Actions.ACTION_POSE.UNUSED,
            },
            animation: {
                length: 3,
                type: Sprites.ANIMATION_TYPE.FORWARD,
                frameDuration: 0.100,
            },
        },
        {
            pose: {
                name: "CloseFolderWigRight",
                facing: Actions.FACING.RIGHT,
                action: Actions.ACTION_POSE.UNUSED,
            },
            animation: {
                length: 4,
                type: Sprites.ANIMATION_TYPE.FORWARD,
                frameDuration: 0.100,
            },
        },
        {
            pose: {
                name: "WalkPanicRight",
                facing: Actions.FACING.RIGHT,
                action: Actions.ACTION_POSE.WALKPANIC,
            },
            animation: {
                length: 3,
                type: Sprites.ANIMATION_TYPE.PINGPONG,
                frameDuration: 0.100,
            },
        },
        {
            pose: {
                name: "WalkPanicLeft",
                facing: Actions.FACING.LEFT,
                action: Actions.ACTION_POSE.WALKPANIC,
            },
            animation: {
                length: 3,
                type: Sprites.ANIMATION_TYPE.PINGPONG,
                frameDuration: 0.100,
            },
        },
        {
            pose: {
                name: "JumpRight",
                facing: Actions.FACING.RIGHT,
                action: Actions.ACTION_POSE.JUMP,
            },
            animation: {
                length: 1,
                type: Sprites.ANIMATION_TYPE.NONE,
            },
        },
        {
            pose: {
                name: "JumpLeft",
                facing: Actions.FACING.LEFT,
                action: Actions.ACTION_POSE.JUMP,
            },
            animation: {
                length: 1,
                type: Sprites.ANIMATION_TYPE.NONE,
            },
        },
        {
            pose: {
                name: "PinnnedLeft",
                facing: Actions.FACING.LEFT,
                action: Actions.ACTION_POSE.PINNED,
            },
            animation: {
                length: 3,
                type: Sprites.ANIMATION_TYPE.FORWARD,
                frameDuration: 0.100,
            },
        },
        {
            pose: {
                name: "PinnnedRight",
                facing: Actions.FACING.RIGHT,
                action: Actions.ACTION_POSE.PINNED,
            },
            animation: {
                length: 3,
                type: Sprites.ANIMATION_TYPE.FORWARD,
                frameDuration: 0.100,
            },
        },
    ],
    defaultPose: "WalkPanicLeft",
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

async function spawnNewMob(ecs, gridX, gridY) {
    return ecs.Data.newEntity()
        .addComponent(newComponent_TagMob())
        .addComponent(Physics.newComponent_Position({
            gridX: gridX,
            gridY: gridY,
        }))
        .addComponent(Physics.newComponent_Speed({
            x: 5,
            y: 0,
            increment: 1.5,
        }))
        .addComponent(Actions.newComponent_Facing({
            direction: Actions.FACING.RIGHT,
        }))
        .addComponent(Actions.newComponent_Jump({
            speedIncrement: 10.0,
        }))
        .addComponent(Actions.newComponent_Collider({
            width: 10,
            height: 15,
        }))
        .addComponent(newComponent_MobState({
            state: MOB_STATES.FLEEING,
        }))
        .addComponent(await Sprites.newComponent_Sprite(enemySpriteSheetOptions));
}

const System_spawnMobs = {
    name: "spawnMobs",
    resourceQuery: ["levelGrid"],
    run: function spawnMobs(queryResults) {
        const ecs = queryResults.ecs;
        const levelGrid = queryResults.resources.levelGrid;
        const levelData = levelGrid.data;
        /// iterate the level map data
        for (let rowIndex = 0; rowIndex < levelData.length; rowIndex++) {
            const row = levelData[rowIndex];
            for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
                if (row[columnIndex] == levelGrid.TILE_TYPE.MOB) {
                    spawnNewMob(ecs, columnIndex, rowIndex);
                }
            }
        }
    },
};

export function init(ecs) {
    ecs.Systems.register(System_spawnMobs);
    ecs.Systems.register(System_mobBehave);
}