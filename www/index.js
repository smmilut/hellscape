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
        attemptJump: function Speed_attemptJump(){
            if (this.jumpSpeedIncrement != undefined && Math.abs(this.y) < 0.1) {
                // not currently moving vertically (falling or already jumping)
                // assume collision down (feet on ground)
                this.y = -this.jumpSpeedIncrement;
            }
        }
    };
};

const newTagPlayer = function newTagPlayer(_initOptions) {
    return {
        name: "tagPlayer",
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
            jumpSpeedIncrement: 40.0,
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
    //#region test
    /*
    ECS.Data.newEntity().addComponent(newPosition()).addComponent(newSpeed());
    for (let entity of ECS.Data.entities) {
        console.log(entity);
    }
    */
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
        queryComponents: ["speed", "sprite", "tagPlayer"],
        run: function userInput(keyboard, speed, sprite) {
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
                if (speed.attemptJump()) {
                    actionName = "Jump";
                };
            }
            sprite.setPose(actionName + directionName);
        },
    });

    ECS.Controller.start();
})();
