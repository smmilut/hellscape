import * as Utils from "../utils.js";

const Resource_Physics = {
    name: "physics",
    prepareInit: function Physics_prepareInit(initOptions) {
        this.initOptions = initOptions || {};
    },
    init: function Physics_init() {
        /// speed decay multiplicator < 1
        this.friction = this.initOptions.friction || 1.0;
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

        for (let e of queryResults.components.mobiles) {
            levelGrid.updatePixelPosition(e.position);

            e.position.xRatio += e.speed.x * time.dt;
            e.speed.x *= physics.friction;

            while (e.position.xRatio > 1) { e.position.xRatio--; e.position.gridX++; }
            while (e.position.xRatio < 0) { e.position.xRatio++; e.position.gridX--; }

            e.position.yRatio += e.speed.y * time.dt;
            e.speed.y += physics.gravity * time.dt;
            e.speed.y *= physics.friction;

            while (e.position.yRatio > 1) { e.position.yRatio--; e.position.gridY++; }
            while (e.position.yRatio < 0) { e.position.yRatio++; e.position.gridY--; }
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

        for (let e of queryResults.components.mobiles) {
            levelGrid.updatePixelPosition(e.position);
            if (levelGrid.hasCollisionAtDirection(e.position, levelGrid.COLLISION_DIRECTION.RIGHT)
                && e.position.xRatio >= 0.7) {
                e.position.xRatio = 0.7;
                e.speed.x = 0;
            };
            if (levelGrid.hasCollisionAtDirection(e.position, levelGrid.COLLISION_DIRECTION.LEFT)
                && e.position.xRatio <= 0.3) {
                e.position.xRatio = 0.3;
                e.speed.x = 0;
            };
            if (levelGrid.hasCollisionAtDirection(e.position, levelGrid.COLLISION_DIRECTION.UP)
                && e.position.yRatio <= 0.3) {
                e.position.yRatio = 0.3;
                e.speed.y = Math.max(e.speed.y, 0);
            };
            if (levelGrid.hasCollisionAtDirection(e.position, levelGrid.COLLISION_DIRECTION.DOWN)
                && e.position.yRatio >= 0.5) {
                e.position.yRatio = 0.5;
                e.speed.y = 0;
            };
        }
    },
};


export function init(ecs) {
    ecs.Data.registerResource(Resource_Physics);
    ecs.Systems.register(System_moveMobiles);
    ecs.Systems.register(System_mobilesCollideLevel);
}
