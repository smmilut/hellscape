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
        incrementLeft : function Speed_incrementLeft() {
            this.x -= this.increment;
        },
        incrementRight : function Speed_incrementRight() {
            this.x += this.increment;
        },
    };
};

const newFacing = function newFacing(initOptions) {
    initOptions = initOptions || {};
    const obj_Facing = {
        name: "facing",
        directionFacing: initOptions.directionFacing || "",
    };
    return obj_Facing;
};

const newJump = function newJump(initOptions) {
    initOptions = initOptions || {};
    let Jump_expended = false;
    const obj_Jump = {
        name: "jump",
        speedIncrement: initOptions.speedIncrement || 1.0,
        apply: function Jump_apply(speed){
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
}

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
        .addComponent(newJump({
            speedIncrement: 40.0,
        }))
        .addComponent(gfx.newSprite({
            src: "assets/player_sheet.png",
            sheetCellWidth: 16,
            sheetCellHeight: 16,
            sheetLayout: [
                {
                    pose: "WalkLeft",
                    animationLength: 3,
                },
                {
                    pose: "WalkRight",
                    animationLength: 3,
                },
                {
                    pose: "StandLeft",
                    animationLength: 1,
                },
                {
                    pose: "StandRight",
                    animationLength: 1,
                },
                {
                    pose: "JumpLeft",
                    animationLength: 1,
                },
                {
                    pose: "JumpRight",
                    animationLength: 1,
                },
            ],
            pose: "StandLeft",
            frameDuration: 0.100,
            animationType: gfx.ANIMATION_TYPE.PINGPONG,
        }));
    //#endregion
    //#region spawn an enemy
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
        .addComponent(gfx.newSprite({
            src: "assets/enemy_sheet.png",
            sheetCellWidth: 16,
            sheetCellHeight: 16,
            sheetLayout: [
                {
                    pose: "WalkRight",
                    animationLength: 3,
                },
                {
                    pose: "WalkLeft",
                    animationLength: 3,
                },
                {
                    pose: "TalkRight",
                    animationLength: 2,
                },
                {
                    pose: "TalkLeft",
                    animationLength: 2,
                },
                {
                    pose: "CloseFolderRight",
                    animationLength: 3,
                },
                {
                    pose: "CloseFolderWigRight",
                    animationLength: 4,
                },
                {
                    pose: "WalkPanicRight",
                    animationLength: 3,
                },
                {
                    pose: "WalkPanicLeft",
                    animationLength: 3,
                },
                {
                    pose: "JumpRight",
                    animationLength: 1,
                },
                {
                    pose: "JumpLeft",
                    animationLength: 1,
                },
                {
                    pose: "PinnnedLeft",
                    animationLength: 3,
                },
                {
                    pose: "PinnnedRight",
                    animationLength: 3,
                },
            ],
            pose: "WalkPanicLeft",
            frameDuration: 0.100,
            animationType: gfx.ANIMATION_TYPE.PINGPONG,
        }));
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
        .addComponent(gfx.newSprite({
            src: "assets/enemy_sheet.png",
            sheetCellWidth: 16,
            sheetCellHeight: 16,
            sheetLayout: [
                {
                    pose: "WalkRight",
                    animationLength: 3,
                },
                {
                    pose: "WalkLeft",
                    animationLength: 3,
                },
                {
                    pose: "TalkRight",
                    animationLength: 2,
                },
                {
                    pose: "TalkLeft",
                    animationLength: 2,
                },
                {
                    pose: "CloseFolderRight",
                    animationLength: 3,
                },
                {
                    pose: "CloseFolderWigRight",
                    animationLength: 4,
                },
                {
                    pose: "WalkPanicRight",
                    animationLength: 3,
                },
                {
                    pose: "WalkPanicLeft",
                    animationLength: 3,
                },
                {
                    pose: "JumpRight",
                    animationLength: 1,
                },
                {
                    pose: "JumpLeft",
                    animationLength: 1,
                },
                {
                    pose: "PinnnedLeft",
                    animationLength: 3,
                },
                {
                    pose: "PinnnedRight",
                    animationLength: 3,
                },
            ],
            pose: "WalkPanicRight",
            frameDuration: 0.100,
            animationType: gfx.ANIMATION_TYPE.PINGPONG,
        }));
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

            while( position.xRatio > 1 ) {	position.xRatio--;	position.gridX++;}
            while( position.xRatio < 0 ) {	position.xRatio++;	position.gridX--;}

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

            while( position.yRatio > 1 ) {	position.yRatio--;	position.gridY++;}
            while( position.yRatio < 0 ) {	position.yRatio++;	position.gridY--;}
        },
    });

    ECS.Controller.addSystem({
        queryResources: ["keyboard"],
        queryComponents: ["speed", "jump", "sprite", "tagPlayer"],
        run: function userInput(keyboard, speed, jump, sprite) {
            let actionName = "";
            let directionName = "";
            if (keyboard.isKeyDown(input.USER_ACTION.LEFT)) {
                speed.incrementLeft();
                actionName = "Walk";
                directionName = "Left";
            } else if (keyboard.isKeyDown(input.USER_ACTION.RIGHT)) {
                speed.incrementRight();
                actionName = "Walk";
                directionName = "Right";
            } else {
                actionName = "Stand";
                directionName = "Left";
            }
            if (keyboard.isKeyDown(input.USER_ACTION.JUMP)) {
                if (jump.apply(speed)) {
                    actionName = "Jump";
                };
            }
            if (keyboard.isKeyUp(input.USER_ACTION.JUMP)) {
                jump.rearm();
            }
            sprite.setPose(actionName + directionName);
        },
    });

    ECS.Controller.start();
})();
