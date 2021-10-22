import * as Utils from "../utils.js";
/** Level grid model for platformer
 * @module levelGrid
 */

/** Enum of 2D vectors of directions for collision */
export const COLLISION_DIRECTION = Object.freeze({
    LEFT: [-1, 0],
    RIGHT: [1, 0],
    UP: [0, -1],
    DOWN: [0, 1],
});

/** Enum of map tile types */
export const TILE_TYPE = Object.freeze({
    NONE: "none",
    BLOCK: "block",
    EXIT: "exit",
    MOB: "mob",  /// TODO : create separate notion for map cell type (block, sky, etc) and things like items or spawn points that are also located on those map cells
    PLAYER: "player",
    EDGE: "edge",
});

/*
*   TODO : replace this code by the TILE_TYPE
    I Keep it for now, because It's easier to manually write maps in a text file with single numbers.
    But TODO replace this when we do procedural generation of maps (then we no longer care to have maps easy to edit as text)
*/
/** Conversion from tile code number to tile type */
export const MANUAL_TILE_CODE = new Map([
    [0, TILE_TYPE.NONE],
    [1, TILE_TYPE.BLOCK],
    [2, TILE_TYPE.EXIT],
    [8, TILE_TYPE.MOB],
    [9, TILE_TYPE.PLAYER],
]);

/**
* the Level grid data
*/
const Resource_LevelGrid = (function build_LevelGrid() {
    const obj_LevelGrid = {
        name: "levelGrid",
        COLLISION_DIRECTION: COLLISION_DIRECTION,
        TILE_TYPE: TILE_TYPE,
    };

    let LevelGrid_initOptions;

    obj_LevelGrid.prepareInit = function LevelGrid_prepareInit(initOptions) {
        LevelGrid_initOptions = initOptions || {};
    };

    obj_LevelGrid.init = async function LevelGrid_init() {
        obj_LevelGrid.cellWidth = LevelGrid_initOptions.gridCellWidth;
        obj_LevelGrid.cellHeight = LevelGrid_initOptions.gridCellHeight;
        const data = await Utils.Http.Request({
            url: LevelGrid_initOptions.url,
        });
        let json_obj = JSON.parse(data.responseText);
        /// TODO : replace when doing map procedural generation
        /// convert manually generated map (with number codes) to actual TILE_TYPE
        obj_LevelGrid.data = json_obj.map.map(function getTileCodeOfRow(row) {
            return row.map(function getTileCode(cellCode) {
                return MANUAL_TILE_CODE.get(cellCode);
            });
        });
        obj_LevelGrid.gridHeight = obj_LevelGrid.data.length;
        obj_LevelGrid.gridWidth = obj_LevelGrid.data[0].length;
        obj_LevelGrid.height = obj_LevelGrid.gridHeight * obj_LevelGrid.cellHeight;
        obj_LevelGrid.width = obj_LevelGrid.gridWidth * obj_LevelGrid.cellWidth;
    };

    /**
    *   Check if coordinates xy are inside the Level Grid
    */
    obj_LevelGrid.isCellInside = function LevelGrid_isCellInside(x, y) {
        if (x >= 0 && x < obj_LevelGrid.gridWidth && y >= 0 && y < obj_LevelGrid.gridHeight) {
            return true;
        } else {
            return false;
        }
    };

    /**
    *   Check if coordinates xy are free and inside the Level Grid
    */
    obj_LevelGrid.isTileBusy = function LevelGrid_isTileBusy(x, y) {
        if (!obj_LevelGrid.isCellInside(x, y)) {
            /// outside of map
            return true;
        } else {
            return obj_LevelGrid.data[y][x] == TILE_TYPE.BLOCK;
        }
    };

    obj_LevelGrid.hasCollisionAtCell = function LevelGrid_hasCollisionAtCell(cellX, cellY) {
        return obj_LevelGrid.isTileBusy(cellX, cellY);
    };

    obj_LevelGrid.hasCollisionAtDirection = function LevelGrid_hasCollisionLeft(position, direction) {
        return obj_LevelGrid.isTileBusy(position.gridX + direction[0], position.gridY + direction[1]);
    };

    obj_LevelGrid.isAtExit = function LevelGrid_isAtExit(position) {
        return obj_LevelGrid.isTileExit(position.gridX, position.gridY);
    };

    obj_LevelGrid.isTileExit = function LevelGrid_isTileExit(x, y) {
        if (!obj_LevelGrid.isCellInside(x, y)) {
            /// outside of map
            return false;
        } else {
            return obj_LevelGrid.data[y][x] == TILE_TYPE.EXIT;
        }
    };

    /**
    * update the pixel position of a `position` based on its grid position
    */
    obj_LevelGrid.updatePixelPosition = function LevelGrid_updatePixelPosition(position) {
        position.x = (position.gridX + position.xRatio) * obj_LevelGrid.cellWidth;
        position.y = (position.gridY + position.yRatio) * obj_LevelGrid.cellHeight;
    };

    /**
    * update the grid position of a `position` based on its pixel position
    */
    obj_LevelGrid.updateGridPosition = function LevelGrid_updateGridPosition(position) {
        position.gridX = Math.floor(position.x / obj_LevelGrid.cellWidth);
        position.xRatio = position.x / obj_LevelGrid.cellWidth - position.gridX;
        position.gridY = Math.floor(position.y / obj_LevelGrid.cellHeight);
        position.yRatio = position.y / obj_LevelGrid.cellHeight - position.gridY;
    };

    return obj_LevelGrid;
})();

/** Call when loading */
export function init(engine) {
    engine.registerResource(Resource_LevelGrid);
}
