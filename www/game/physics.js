import * as Utils from "../utils.js";

const Resource_Physics = {
    name: "physics",
    prepareInit: function Physics_prepareInit(initOptions) {
        this.initOptions = initOptions || {};
    },
    init: function Physics_init() {
        /// speed decay multiplicator < 1
        this.speedDecay = this.initOptions.speedDecay || 1.0;
        /// vertical speed increase
        this.gravity = this.initOptions.gravity || 1.0;
    },
};


export const newComponent_Position = function newPosition(initOptions) {
    initOptions = initOptions || {};
    const obj_Position = {
        name: "position",
        gridX: initOptions.gridX || 0,
        gridY: initOptions.gridY || 0,
        xRatio: 0.0,
        yRatio: 0.0,
        /// .x and .y calculated later by LevelGrid.updatePixelPosition because it depends on cell size in pixels
        x: initOptions.x || 0,
        y: initOptions.y || 0,
        z: initOptions.z || 0,
    };
    return obj_Position;
};

export const newComponent_Speed = function newSpeed(initOptions) {
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


const System_moveMobiles = {
    name: "moveMobiles",
    resourceQuery: ["levelGrid", "time", "physics"],
    componentQueries: {
        mobiles: ["position", "speed"],
    },
    run: function moveMobiles(queryResults) {
        let time = queryResults.resources.time;
        if (time.isPaused()) {
            return;
        }
        let levelGrid = queryResults.resources.levelGrid;
        let physics = queryResults.resources.physics;

        for (let mobile of queryResults.components.mobiles) {
            levelGrid.updatePixelPosition(mobile.position);

            mobile.position.xRatio += mobile.speed.x * time.dt;
            mobile.speed.x *= physics.speedDecay;

            while (mobile.position.xRatio > 1) { mobile.position.xRatio--; mobile.position.gridX++; }
            while (mobile.position.xRatio < 0) { mobile.position.xRatio++; mobile.position.gridX--; }

            mobile.position.yRatio += mobile.speed.y * time.dt;
            mobile.speed.y += physics.gravity * time.dt;
            mobile.speed.y *= physics.speedDecay;

            while (mobile.position.yRatio > 1) { mobile.position.yRatio--; mobile.position.gridY++; }
            while (mobile.position.yRatio < 0) { mobile.position.yRatio++; mobile.position.gridY--; }
        }
    },
};

const System_mobilesCollideLevel = {
    name: "mobilesCollideLevel",
    resourceQuery: ["levelGrid"],
    componentQueries: {
        mobiles: ["position", "speed"],
    },
    run: function mobilesCollideLevel(queryResults) {
        let levelGrid = queryResults.resources.levelGrid;

        for (let mobile of queryResults.components.mobiles) {
            levelGrid.updatePixelPosition(mobile.position);
            if (levelGrid.hasCollisionAtDirection(mobile.position, levelGrid.COLLISION_DIRECTION.RIGHT)
                && mobile.position.xRatio >= 0.7) {
                mobile.position.xRatio = 0.7;
                mobile.speed.x = 0;
            };
            if (levelGrid.hasCollisionAtDirection(mobile.position, levelGrid.COLLISION_DIRECTION.LEFT)
                && mobile.position.xRatio <= 0.3) {
                mobile.position.xRatio = 0.3;
                mobile.speed.x = 0;
            };
            if (levelGrid.hasCollisionAtDirection(mobile.position, levelGrid.COLLISION_DIRECTION.UP)
                && mobile.position.yRatio <= 0.3) {
                mobile.position.yRatio = 0.3;
                mobile.speed.y = Math.max(mobile.speed.y, 0);
            };
            if (levelGrid.hasCollisionAtDirection(mobile.position, levelGrid.COLLISION_DIRECTION.DOWN)
                && mobile.position.yRatio >= 0.5) {
                mobile.position.yRatio = 0.5;
                mobile.speed.y = 0;
            };
        }
    },
};


export function init(engine) {
    engine.registerResource(Resource_Physics);
    engine.registerSystem(System_moveMobiles);
    engine.registerSystem(System_mobilesCollideLevel);
}
