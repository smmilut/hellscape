import * as Physics from "./physics.js";
import * as Actions from "./actions.js";
import * as Sprites from "../graphics/sprite.js";
/**
 * Manage player
 * @module player
 */

/** Component to tag if an Entity is a (the) player */
const newTagPlayer = function newTagPlayer(_initOptions) {
    return {
        name: "tagPlayer",
    };
};

const System_handleInput = {
    name: "handleInput",
    resourceQuery: ["input"],
    componentQueries: {
        player: ["speed", "facing", "jump", "sprite", "attack", "tagPlayer"],
    },
    run: function handleInput(queryResults) {
        let input = queryResults.resources.input;
        for (let p of queryResults.components.player) {
            let actionName = Actions.ACTION_POSE.NONE;
            if (input.isKeyDown(input.USER_ACTION.LEFT)) {
                p.speed.incrementLeft();
                actionName = Actions.ACTION_POSE.WALK;
                p.facing.direction = Actions.FACING.LEFT;
            } else if (input.isKeyDown(input.USER_ACTION.RIGHT)) {
                p.speed.incrementRight();
                actionName = Actions.ACTION_POSE.WALK;
                p.facing.direction = Actions.FACING.RIGHT;
            } else {
                actionName = Actions.ACTION_POSE.STAND;
            }
            if (input.isKeyDown(input.USER_ACTION.JUMP)) {
                p.jump.apply(p.speed);
                if (p.jump.qtyLeft > 0.0) {
                    /// still doing the jump
                    actionName = Actions.ACTION_POSE.JUMP;
                }
            } else if (input.isKeyUp(input.USER_ACTION.JUMP)) {
                p.jump.rearm();
            }
            if (input.isKeyDown(input.USER_ACTION.ATTACK)) {
                p.attack.tryApply();
                if (p.attack.isAttacking()) {
                    actionName = Actions.ACTION_POSE.ATTACK;
                }
            } else if (input.isKeyUp(input.USER_ACTION.ATTACK)) {
                p.attack.rearm();
            }
            p.sprite.setPose({
                action: actionName,
                facing: p.facing.direction
            });
        }
    },
};

async function spawnNewPlayer(engine, gridX, gridY) {
    return engine.spawn()
        .addComponent(newTagPlayer())
        .addComponent(Physics.newComponent_Position({
            gridX: gridX,
            gridY: gridY,
        }))
        .addComponent(Physics.newComponent_Speed({
            increment: 1.0,
        }))
        .addComponent(Actions.newComponent_Facing())
        .addComponent(Actions.newComponent_Jump({
            speedIncrement: 8.0,
            maxCharges: 2,
        }))
        .addComponent(Actions.newComponent_Collider({
            width: 10,
            height: 15,
        }))
        .addComponent(Actions.newComponent_Attack())
        .addComponent(await Sprites.newComponent_Sprite({
            sheetSrc: "assets/devil_sheet.png",
            sheetConfigUrl: "assets/devil_sheet.json"
        }));
}

const System_spawnPlayer = {
    name: "spawnPlayer",
    resourceQuery: ["levelGrid"],
    run: function spawnPlayer(queryResults) {
        const engine = queryResults.engine;
        const levelGrid = queryResults.resources.levelGrid;
        const levelData = levelGrid.data;
        /// iterate the level map data
        for (let rowIndex = 0; rowIndex < levelData.length; rowIndex++) {
            const row = levelData[rowIndex];
            for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
                if (row[columnIndex] == levelGrid.TILE_TYPE.PLAYER) {
                    spawnNewPlayer(engine, columnIndex, rowIndex);
                }
            }
        }
    },
};

/** Call when loading */
export function init(engine) {
    engine.registerSystem(System_spawnPlayer);
    engine.registerSystem(System_handleInput);
}
