import * as Physics from "./physics.js";
import * as Actions from "./actions.js";
import * as LevelGrid from "./levelGrid.js";
import * as Sprites from "../graphics/sprite.js";

const newTagMob = function newTagMob(_initOptions) {
    return {
        name: "tagMob",
    };
};

export const MOB_STATES = Object.freeze({
    STANDING: 0,
    FLEEING: 1,
    DYING: 2,
    DEAD: 3,
});

const newMobState = function newMobState(initOptions) {
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

function spawnNewMob(ecs, x, y) {
    /// X, Y position manually for now, random later
    return ecs.Data.newEntity()
        .addComponent(newTagMob())
        .addComponent(Physics.newPosition({
            x: x,
            y: y,
        }))
        .addComponent(Physics.newSpeed({
            x: 5,
            y: 0,
            increment: 1.0,
        }))
        .addComponent(Actions.newFacing())
        .addComponent(Actions.newJump({
            speedIncrement: 40.0,
        }))
        .addComponent(Actions.newCollider({
            width: 10,
            height: 15,
        }))
        .addComponent(newMobState({
            state: MOB_STATES.FLEEING,
        }))
        .addComponent(Sprites.newSprite(enemySpriteSheetOptions));
}

export function init(ecs) {
    let _mob1 = spawnNewMob(ecs, 4, 7);
    let _mob2 = spawnNewMob(ecs, 10, 2);

    ecs.Controller.addSystem({
        resourceQuery: ["levelgrid"],
        componentQueries: {
            mobs: ["position", "speed", "facing", "jump", "sprite", "mobState", "tagMob"],
        },
        run: function mobBehave(queryResults) {
            let levelgrid = queryResults.resources.levelgrid;
            for (let e of queryResults.components.mobs) {
                let actionName = Actions.ACTION_POSE.NONE;
                if (e.mobState.state == MOB_STATES.FLEEING) {
                    // console.log("mob fleeing");
                    e.speed.incrementRight();
                    e.facing.direction = Actions.FACING.RIGHT;
                    actionName = Actions.ACTION_POSE.WALKPANIC;
                } else if (e.mobState.state == MOB_STATES.DYING) {
                    // console.log("mob dying", e, e.position);
                    e.speed.x = 0;
                    if (levelgrid.hasCollisionAtDirection(e.position, LevelGrid.COLLISION_DIRECTION.UP)
                        && e.position.yRatio <= 0.3
                    ) {
                        // console.log("mob pinning up");
                        e.speed.y = 0;
                        e.mobState.state == MOB_STATES.DYING;
                        actionName = Actions.ACTION_POSE.PINNED;
                    } else {
                        // console.log("mob dying up");
                        e.speed.y = -20;
                        actionName = Actions.ACTION_POSE.JUMP;
                    }
                }
                e.sprite.setPose({
                    action: actionName,
                    facing: e.facing.direction
                });
            }
        },
    });
}