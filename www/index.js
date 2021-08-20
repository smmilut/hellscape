import * as ECS from "./ecs.js";
import * as gfx from "./graphics.js";
import * as input from "./input.js";

const PhysicsResource = {
    name: "physics",
    isInitialized: false,
    prepareInit: function Physics_prepareInit(initOptions) {
        this.initOptions = initOptions || {};
    },
    init: function Physics_init(initOptions) {
        this.friction = this.initOptions.friction || 1.0;
        this.gravity = this.initOptions.gravity || 1.0;
        this.isInitialized = true;
    },
    update: function updatePhysics() {
        // nothing
    },
};


const newPosition = function newPosition(initOptions) {
    initOptions = initOptions || {};
    return {
        name: "position",
        x: initOptions.x || 0,
        y: initOptions.y || 0,
    };
};

const newSpeed = function newSpeed(initOptions) {
    initOptions = initOptions || {};
    return {
        name: "speed",
        x: initOptions.x || 0,
        y: initOptions.y || 0,
        max: initOptions.max || 1000,
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
            gravity: 5,
        }
    );

    //#region spawn a Player
    ECS.Data.newEntity()
        .addComponent(newTagPlayer())
        .addComponent(newPosition({
            x: 100,
            y: 100,
        }))
        .addComponent(newSpeed({
            x: 2,
            y: 0,
            max: 80,
        }))
        .addComponent(gfx.newSprite({
            src: "assets/player_sheet.png",
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
            ],
            pose: "WalkLeft",
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
        queryResources: ["time", "physics"],
        queryComponents: ["position", "speed"],
        run: function moveSprite(time, physics, position, speed) {
            position.x += speed.x * time.dt;
            speed.x *= physics.friction;

            position.y += speed.y * time.dt;
            speed.y += physics.gravity;
            speed.y *= physics.friction;
        },
    });

    ECS.Controller.addSystem({
        queryResources: ["keyboard", "physics"],
        queryComponents: ["speed", "sprite", "tagPlayer"],
        run: function userInput(keyboard, physics, speed, sprite) {
            let speedIncrement = speed.max * (1 - physics.friction) / physics.friction;
            if (keyboard.isKeyDown(input.USER_ACTION.LEFT)) {
                speed.x += -speedIncrement;
                speed.x = Math.max(speed.x, -speed.max);
                sprite.setPose("WalkLeft");
            } else if (keyboard.isKeyDown(input.USER_ACTION.RIGHT)) {
                speed.x += speedIncrement;
                speed.x = Math.min(speed.x, speed.max);
                sprite.setPose("WalkRight");
            } else {
                // still pose
            }
            if (keyboard.isKeyDown(input.USER_ACTION.JUMP)) {
                console.log("jump");
                speed.y += -speedIncrement;
                speed.y = Math.max(speed.y, -speed.max);
            }

        },
    });

    ECS.Controller.start();
})();
