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
            x: 5,
            y: 5,
        }))
        .addComponent(newSpeed({
            x: -5,
            y: 0,
            increment: 1.0,
        }))
        .addComponent(newJump({
            speedIncrement: 40.0,
        }))
        .addComponent(gfx.newSprite(enemySpriteSheetOptions));
    ECS.Data.newEntity()
        .addComponent(newTagMob())
        .addComponent(newPosition({
            x: 8,
            y: 2,
        }))
        .addComponent(newSpeed({
            x: 5,
            y: 0,
            increment: 1.0,
        }))
        .addComponent(newJump({
            speedIncrement: 40.0,
        }))
        .addComponent(gfx.newSprite(enemySpriteSheetOptions));
    //#endregion

    ECS.Controller.addSystem({
        queryResources: ["levelgrid", "time", "physics"],
        queryComponents: ["position", "speed"],
        run: function moveSprite(levelgrid, time, physics, position, speed) {
            levelgrid.updatePixelPosition(position);

            position.xRatio += speed.x * time.dt;
            speed.x *= physics.friction;

            if (levelgrid.hasCollisionAtDirection(position, gfx.COLLISION_DIRECTION.RIGHT)
                && position.xRatio >= 0.7) {
                position.xRatio = 0.7;
                speed.x = 0;
            };

            if (levelgrid.hasCollisionAtDirection(position, gfx.COLLISION_DIRECTION.LEFT)
                && position.xRatio <= 0.3) {
                position.xRatio = 0.3;
                speed.x = 0;
            };

            while (position.xRatio > 1) { position.xRatio--; position.gridX++; }
            while (position.xRatio < 0) { position.xRatio++; position.gridX--; }

            position.yRatio += speed.y * time.dt;
            speed.y += physics.gravity;
            speed.y *= physics.friction;

            if (levelgrid.hasCollisionAtDirection(position, gfx.COLLISION_DIRECTION.UP)
                && position.yRatio <= 0.3) {
                position.yRatio = 0.3;
                speed.y = Math.max(speed.y, 0);
            };

            if (levelgrid.hasCollisionAtDirection(position, gfx.COLLISION_DIRECTION.DOWN)
                && position.yRatio >= 0.5) {
                position.yRatio = 0.5;
                speed.y = 0;
            };

            while (position.yRatio > 1) { position.yRatio--; position.gridY++; }
            while (position.yRatio < 0) { position.yRatio++; position.gridY--; }
        },
    });

    ECS.Controller.addSystem({
        queryResources: ["keyboard"],
        queryComponents: ["speed", "facing", "jump", "sprite", "tagPlayer"],
        run: function userInput(keyboard, speed, facing, jump, sprite) {
            let actionName = ACTION_POSE.NONE;
            if (keyboard.isKeyDown(input.USER_ACTION.LEFT)) {
                speed.incrementLeft();
                actionName = ACTION_POSE.WALK;
                facing.direction = FACING.LEFT;
            } else if (keyboard.isKeyDown(input.USER_ACTION.RIGHT)) {
                speed.incrementRight();
                actionName = ACTION_POSE.WALK;
                facing.direction = FACING.RIGHT;
            } else {
                actionName = ACTION_POSE.STAND;
            }
            if (keyboard.isKeyDown(input.USER_ACTION.JUMP)) {
                if (jump.apply(speed)) {
                    actionName = ACTION_POSE.JUMP;
                };
            }
            if (keyboard.isKeyDown(input.USER_ACTION.ATTACK)) {
                actionName = ACTION_POSE.ATTACK;
            }
            if (keyboard.isKeyUp(input.USER_ACTION.JUMP)) {
                jump.rearm();
            }
            sprite.setPose({
                action: actionName,
                facing: facing.direction
            });
        },
    });

    ECS.Controller.start();
})();
