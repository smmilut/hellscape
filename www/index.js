import * as ECS from "./ecs.js";
import * as gfx from "./graphics.js";
import * as input from "./input.js";

const PhysicsResource = {
    name: "physics",
    prepareInit: function Physics_prepareInit(initOptions) {
        this.initOptions = initOptions || {};
    },
    init: function Physics_init(initOptions) {
        this.friction = this.initOptions.friction || 1.0;
        this.gravity = this.initOptions.gravity || 1.0;
    },
    update: function updatePhysics() {
        // nothing
    },
};


const newPosition = function newPosition(initOptions) {
    initOptions = initOptions || {};
    const obj_Position = {
        name: "position",
        gridX: initOptions.x || 0,
        gridY: initOptions.y || 0,
        xRatio: 0.0,
        yRatio: 0.0,
    };
    return obj_Position;
};

const newSpeed = function newSpeed(initOptions) {
    initOptions = initOptions || {};
    return {
        name: "speed",
        x: initOptions.x || 0,
        y: initOptions.y || 0,
        increment: initOptions.increment || 1,
        jumpSpeedIncrement: initOptions.jumpSpeedIncrement || 1,
        incrementLeft: function Speed_incrementLeft() {
            this.x -= this.increment;
        },
        incrementRight: function Speed_incrementRight() {
            this.x += this.increment;
        },
    };
};


const FACING = Object.freeze({
    LEFT: "Left",
    RIGHT: "Right",
});

const ACTION_POSE = Object.freeze({
    UNUSED: "*unused*", // pose exists in the sprite sheet, but not in the game
    NONE: "",
    STAND: "Stand",
    WALK: "Walk",
    WALKPANIC: "WalkPanic",
    PINNED: "Pinned",
    JUMP: "Jump",
    ATTACK: "Attack",
});

const newFacing = function newFacing(initOptions) {
    initOptions = initOptions || {};
    return {
        name: "facing",
        direction: initOptions.direction || FACING.LEFT,
    };
};

const newJump = function newJump(initOptions) {
    initOptions = initOptions || {};
    let Jump_expended = false;
    const obj_Jump = {
        name: "jump",
        speedIncrement: initOptions.speedIncrement || 1.0,
        apply: function Jump_apply(speed) {
            if (!Jump_expended && Math.abs(speed.y) < 0.1) {
                // not currently moving vertically (falling or already jumping)
                // assume collision down (feet on ground)
                speed.y = -this.speedIncrement;
                Jump_expended = true;
            }
        },
        rearm: function Jump_rearm() {
            Jump_expended = false;
        },
    };
    return obj_Jump;
};

const newAttack = function newAttack(_initOptions) {
    return {
        name: "attack",
        isAttacking: false,
    };
};

const newCollider = function newCollider(initOptions) {
    initOptions = initOptions || {};
    return {
        name: "collider",
        width: initOptions.width || 16,
        height: initOptions.height || 16,
        hasCollisionWith: function Collider_hasCollisionWith(thisPosition, otherCollider, otherPosition) {
            const thisLeft = thisPosition.x - this.width / 2.0;
            const thisRight = thisPosition.x + this.width / 2.0;
            const thisTop = thisPosition.y - this.height / 2.0;
            const thisBottom = thisPosition.y + this.height / 2.0;
            const otherLeft = otherPosition.x - otherCollider.width / 2.0;
            const otherRight = otherPosition.x + otherCollider.width / 2.0;
            const otherTop = otherPosition.y - otherCollider.height / 2.0;
            const otherBottom = otherPosition.y + otherCollider.height / 2.0;
            // or collision based on center only
            //if (otherPosition.x >= thisLeft && otherPosition.x <= thisRight && otherPosition.y <= thisBottom && otherPosition.y >= thisTop) {
            if (
                thisLeft <= otherRight &&
                thisRight >= otherLeft &&
                thisBottom >= otherTop &&
                thisTop <= otherBottom
            ) {
                return true;
            } else {
                return false;
            }
        },
    };
};

const MOB_STATES = Object.freeze({
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

const newTagPlayer = function newTagPlayer(_initOptions) {
    return {
        name: "tagPlayer",
    };
};

const newTagMob = function newTagMob(_initOptions) {
    return {
        name: "tagMob",
    };
};

(function onLoadPage() {
    ECS.init();
    gfx.init(ECS);
    input.init(ECS);

    ECS.Data.addResource(PhysicsResource,
        {
            friction: 0.9,
            gravity: 2.5,
        }
    );

    //#region spawn a Player
    const playerSpriteSheetOptions = {
        src: "assets/player_sheet.png",
        sheetCellWidth: 16,
        sheetCellHeight: 16,
        sheetLayout: [
            {
                pose: {
                    name: "WalkLeft",
                    facing: FACING.LEFT,
                    action: ACTION_POSE.WALK,
                },
                animation: {
                    length: 3,
                    type: gfx.ANIMATION_TYPE.PINGPONG,
                    frameDuration: 0.100,
                },
            },
            {
                pose: {
                    name: "WalkRight",
                    facing: FACING.RIGHT,
                    action: ACTION_POSE.WALK,
                },
                animation: {
                    length: 3,
                    type: gfx.ANIMATION_TYPE.PINGPONG,
                    frameDuration: 0.100,
                },
            },
            {
                pose: {
                    name: "StandLeft",
                    facing: FACING.LEFT,
                    action: ACTION_POSE.STAND,
                },
                animation: {
                    length: 1,
                    type: gfx.ANIMATION_TYPE.NONE,
                    frameDuration: 0.100,
                },
            },
            {
                pose: {
                    name: "StandRight",
                    facing: FACING.RIGHT,
                    action: ACTION_POSE.STAND,
                },
                animation: {
                    length: 1,
                    type: gfx.ANIMATION_TYPE.NONE,
                    frameDuration: 0.100,
                },
            },
            {
                pose: {
                    name: "JumpLeft",
                    facing: FACING.LEFT,
                    action: ACTION_POSE.JUMP,
                },
                animation: {
                    length: 1,
                    type: gfx.ANIMATION_TYPE.NONE,
                },
            },
            {
                pose: {
                    name: "JumpRight",
                    facing: FACING.RIGHT,
                    action: ACTION_POSE.JUMP,
                },
                animation: {
                    length: 1,
                    type: gfx.ANIMATION_TYPE.NONE,
                },
            },
            {
                pose: {
                    name: "AttackLeft",
                    facing: FACING.LEFT,
                    action: ACTION_POSE.ATTACK,
                },
                animation: {
                    length: 2,
                    type: gfx.ANIMATION_TYPE.FORWARD,
                    frameDuration: 0.100,
                },
            },
            {
                pose: {
                    name: "AttackRight",
                    facing: FACING.RIGHT,
                    action: ACTION_POSE.ATTACK,
                },
                animation: {
                    length: 2,
                    type: gfx.ANIMATION_TYPE.FORWARD,
                    frameDuration: 0.100,
                },
            },
        ],
        defaultPose: "StandLeft",
    };
    ECS.Data.newEntity()
        .addComponent(newTagPlayer())
        .addComponent(newPosition({
            x: 2,
            y: 2,
        }))
        .addComponent(newSpeed({
            x: 0,
            y: 0,
            increment: 1.0,
        }))
        .addComponent(newFacing())
        .addComponent(newJump({
            speedIncrement: 40.0,
        }))
        .addComponent(newCollider({
            width: 10,
            height: 15,
        }))
        .addComponent(newAttack())
        .addComponent(gfx.newSprite(playerSpriteSheetOptions));
    //#endregion
    //#region spawn an enemy
    const enemySpriteSheetOptions = {
        src: "assets/enemy_sheet.png",
        sheetCellWidth: 16,
        sheetCellHeight: 16,
        sheetLayout: [
            {
                pose: {
                    name: "WalkRight",
                    facing: FACING.RIGHT,
                    action: ACTION_POSE.WALK,
                },
                animation: {
                    length: 3,
                    type: gfx.ANIMATION_TYPE.PINGPONG,
                    frameDuration: 0.100,
                },
            },
            {
                pose: {
                    name: "WalkLeft",
                    facing: FACING.LEFT,
                    action: ACTION_POSE.WALK,
                },
                animation: {
                    length: 3,
                    type: gfx.ANIMATION_TYPE.PINGPONG,
                    frameDuration: 0.100,
                },
            },
            {
                pose: {
                    name: "TalkRight",
                    facing: FACING.RIGHT,
                    action: ACTION_POSE.UNUSED,
                },
                animation: {
                    length: 2,
                    type: gfx.ANIMATION_TYPE.FORWARD,
                    frameDuration: 0.100,
                },
            },
            {
                pose: {
                    name: "TalkLeft",
                    facing: FACING.LEFT,
                    action: ACTION_POSE.UNUSED,
                },
                animation: {
                    length: 2,
                    type: gfx.ANIMATION_TYPE.FORWARD,
                    frameDuration: 0.100,
                },
            },
            {
                pose: {
                    name: "CloseFolderRight",
                    facing: FACING.RIGHT,
                    action: ACTION_POSE.UNUSED,
                },
                animation: {
                    length: 3,
                    type: gfx.ANIMATION_TYPE.FORWARD,
                    frameDuration: 0.100,
                },
            },
            {
                pose: {
                    name: "CloseFolderWigRight",
                    facing: FACING.RIGHT,
                    action: ACTION_POSE.UNUSED,
                },
                animation: {
                    length: 4,
                    type: gfx.ANIMATION_TYPE.FORWARD,
                    frameDuration: 0.100,
                },
            },
            {
                pose: {
                    name: "WalkPanicRight",
                    facing: FACING.RIGHT,
                    action: ACTION_POSE.WALKPANIC,
                },
                animation: {
                    length: 3,
                    type: gfx.ANIMATION_TYPE.PINGPONG,
                    frameDuration: 0.100,
                },
            },
            {
                pose: {
                    name: "WalkPanicLeft",
                    facing: FACING.LEFT,
                    action: ACTION_POSE.WALKPANIC,
                },
                animation: {
                    length: 3,
                    type: gfx.ANIMATION_TYPE.PINGPONG,
                    frameDuration: 0.100,
                },
            },
            {
                pose: {
                    name: "JumpRight",
                    facing: FACING.RIGHT,
                    action: ACTION_POSE.JUMP,
                },
                animation: {
                    length: 1,
                    type: gfx.ANIMATION_TYPE.NONE,
                },
            },
            {
                pose: {
                    name: "JumpLeft",
                    facing: FACING.LEFT,
                    action: ACTION_POSE.JUMP,
                },
                animation: {
                    length: 1,
                    type: gfx.ANIMATION_TYPE.NONE,
                },
            },
            {
                pose: {
                    name: "PinnnedLeft",
                    facing: FACING.LEFT,
                    action: ACTION_POSE.PINNED,
                },
                animation: {
                    length: 3,
                    type: gfx.ANIMATION_TYPE.FORWARD,
                    frameDuration: 0.100,
                },
            },
            {
                pose: {
                    name: "PinnnedRight",
                    facing: FACING.RIGHT,
                    action: ACTION_POSE.PINNED,
                },
                animation: {
                    length: 3,
                    type: gfx.ANIMATION_TYPE.FORWARD,
                    frameDuration: 0.100,
                },
            },
        ],
        defaultPose: "WalkPanicLeft",
    };
    ECS.Data.newEntity()
        .addComponent(newTagMob())
        .addComponent(newPosition({
            x: 4,
            y: 7,
        }))
        .addComponent(newSpeed({
            x: -5,
            y: 0,
            increment: 1.0,
        }))
        .addComponent(newFacing())
        .addComponent(newJump({
            speedIncrement: 40.0,
        }))
        .addComponent(newCollider({
            width: 10,
            height: 15,
        }))
        .addComponent(newMobState({
            state: MOB_STATES.FLEEING,
        }))
        .addComponent(gfx.newSprite(enemySpriteSheetOptions));
    ECS.Data.newEntity()
        .addComponent(newTagMob())
        .addComponent(newPosition({
            x: 10,
            y: 2,
        }))
        .addComponent(newSpeed({
            x: 5,
            y: 0,
            increment: 1.0,
        }))
        .addComponent(newFacing())
        .addComponent(newJump({
            speedIncrement: 40.0,
        }))
        .addComponent(newCollider({
            width: 10,
            height: 15,
        }))
        .addComponent(newMobState({
            state: MOB_STATES.FLEEING,
        }))
        .addComponent(gfx.newSprite(enemySpriteSheetOptions));
    //#endregion

    ECS.Controller.addSystem({
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

                if (levelgrid.hasCollisionAtDirection(e.position, gfx.COLLISION_DIRECTION.RIGHT)
                    && e.position.xRatio >= 0.7) {
                    e.position.xRatio = 0.7;
                    e.speed.x = 0;
                };

                if (levelgrid.hasCollisionAtDirection(e.position, gfx.COLLISION_DIRECTION.LEFT)
                    && e.position.xRatio <= 0.3) {
                    e.position.xRatio = 0.3;
                    e.speed.x = 0;
                };

                while (e.position.xRatio > 1) { e.position.xRatio--; e.position.gridX++; }
                while (e.position.xRatio < 0) { e.position.xRatio++; e.position.gridX--; }

                e.position.yRatio += e.speed.y * time.dt;
                e.speed.y += physics.gravity;
                e.speed.y *= physics.friction;

                if (levelgrid.hasCollisionAtDirection(e.position, gfx.COLLISION_DIRECTION.UP)
                    && e.position.yRatio <= 0.3) {
                    e.position.yRatio = 0.3;
                    e.speed.y = Math.max(e.speed.y, 0);
                };

                if (levelgrid.hasCollisionAtDirection(e.position, gfx.COLLISION_DIRECTION.DOWN)
                    && e.position.yRatio >= 0.5) {
                    e.position.yRatio = 0.5;
                    e.speed.y = 0;
                };

                while (e.position.yRatio > 1) { e.position.yRatio--; e.position.gridY++; }
                while (e.position.yRatio < 0) { e.position.yRatio++; e.position.gridY--; }
            }
        },
    });

    ECS.Controller.addSystem({
        resourceQuery: ["keyboard"],
        componentQueries: {
            player: ["speed", "facing", "jump", "sprite", "attack", "tagPlayer"],
        },
        run: function userInput(queryResults) {
            let keyboard = queryResults.resources.keyboard;
            for (let e of queryResults.components.player) {
                let actionName = ACTION_POSE.NONE;
                if (keyboard.isKeyDown(input.USER_ACTION.LEFT)) {
                    e.speed.incrementLeft();
                    actionName = ACTION_POSE.WALK;
                    e.facing.direction = FACING.LEFT;
                } else if (keyboard.isKeyDown(input.USER_ACTION.RIGHT)) {
                    e.speed.incrementRight();
                    actionName = ACTION_POSE.WALK;
                    e.facing.direction = FACING.RIGHT;
                } else {
                    actionName = ACTION_POSE.STAND;
                }
                if (keyboard.isKeyDown(input.USER_ACTION.JUMP)) {
                    if (e.jump.apply(e.speed)) {
                        actionName = ACTION_POSE.JUMP;
                    };
                }
                if (keyboard.isKeyDown(input.USER_ACTION.ATTACK)) {
                    actionName = ACTION_POSE.ATTACK;
                    e.attack.isAttacking = true;
                }
                if (keyboard.isKeyUp(input.USER_ACTION.ATTACK)) {
                    e.attack.isAttacking = false;
                }
                if (keyboard.isKeyUp(input.USER_ACTION.JUMP)) {
                    e.jump.rearm();
                }
                e.sprite.setPose({
                    action: actionName,
                    facing: e.facing.direction
                });
            }
        },
    });

    ECS.Controller.addSystem({
        resourceQuery: ["levelgrid"],
        componentQueries: {
            mobs: ["position", "speed", "facing", "jump", "sprite", "mobState", "tagMob"],
        },
        run: function mobBehave(queryResults) {
            let levelgrid = queryResults.resources.levelgrid;
            for (let e of queryResults.components.mobs) {
                let actionName = ACTION_POSE.NONE;
                if (e.mobState.state == MOB_STATES.FLEEING) {
                    // console.log("mob fleeing");
                    e.speed.incrementRight();
                    e.facing.direction = FACING.RIGHT;
                    actionName = ACTION_POSE.WALKPANIC;
                } else if (e.mobState.state == MOB_STATES.DYING) {
                    // console.log("mob dying", e, e.position);
                    e.speed.x = 0;
                    if (levelgrid.hasCollisionAtDirection(e.position, gfx.COLLISION_DIRECTION.UP)
                        && e.position.yRatio <= 0.3
                    ) {
                        // console.log("mob pinning up");
                        e.speed.y = 0;
                        e.mobState.state == MOB_STATES.DYING;
                        actionName = ACTION_POSE.PINNED;
                    } else {
                        // console.log("mob dying up");
                        e.speed.y = -20;
                        actionName = ACTION_POSE.JUMP;
                    }
                }
                e.sprite.setPose({
                    action: actionName,
                    facing: e.facing.direction
                });
            }
        },
    });

    ECS.Controller.addSystem({
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
                        mob.mobState.state = MOB_STATES.DYING;
                    }
                }
            }
        },
    });

    ECS.Controller.start();
})();
