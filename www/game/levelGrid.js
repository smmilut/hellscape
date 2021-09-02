import * as Utils from "../utils.js";

export const COLLISION_DIRECTION = Object.freeze({
    LEFT: [-1, 0],
    RIGHT: [1, 0],
    UP: [0, -1],
    DOWN: [0, 1],
});

/*
* the Level grid data
*/
const Resource_LevelGrid = (function build_LevelGrid() {
    const obj_LevelGrid = {
        name: "levelgrid",
        COLLISION_DIRECTION : COLLISION_DIRECTION,
    };

    let LevelGrid_initOptions;

    obj_LevelGrid.prepareInit = function LevelGrid_prepareInit(initOptions) {
        LevelGrid_initOptions = initOptions || {};
    };

    obj_LevelGrid.init = function LevelGrid_init() {
        obj_LevelGrid.cellWidth = LevelGrid_initOptions.gridCellWidth;
        obj_LevelGrid.cellHeight = LevelGrid_initOptions.gridCellHeight;
        return Utils.Http.Request({
            url: LevelGrid_initOptions.url,
        })
            .then(function gotBackgroundFile(data) {
                let json_obj = JSON.parse(data.responseText);
                obj_LevelGrid.data = json_obj.map;
                obj_LevelGrid.gridHeight = obj_LevelGrid.data.length;
                obj_LevelGrid.gridWidth = obj_LevelGrid.data[0].length;
                obj_LevelGrid.height = obj_LevelGrid.gridHeight * obj_LevelGrid.cellHeight;
                obj_LevelGrid.width = obj_LevelGrid.gridWidth * obj_LevelGrid.cellWidth;
            });
    };

    /*
    *   Check if coordinates xy are inside the Level Grid
    */
    obj_LevelGrid.isCellInside = function LevelGrid_isCellInside(x, y) {
        if (x >= 0 && x < obj_LevelGrid.gridWidth && y >= 0 && y < obj_LevelGrid.gridHeight) {
            return true;
        } else {
            return false;
        }
    };

    /*
    *   Check if coordinates xy are free and inside the Level Grid
    */
    obj_LevelGrid.isTileBusy = function LevelGrid_isTileBusy(x, y) {
        if (!obj_LevelGrid.isCellInside(x, y)) {
            //Utils.debug("outside of map at cell", x, y);
            return true;
        } else {
            return obj_LevelGrid.data[y][x] != 0;
        }
    };

    obj_LevelGrid.hasCollisionAtCell = function LevelGrid_hasCollisionAtCell(cellX, cellY) {
        return obj_LevelGrid.isTileBusy(cellX, cellY);
    };

    obj_LevelGrid.hasCollisionAtDirection = function LevelGrid_hasCollisionLeft(position, direction) {
        return obj_LevelGrid.isTileBusy(position.gridX + direction[0], position.gridY + direction[1]);
    };

    /*
    * update the pixel position of a `position` based on its grid position
    */
    obj_LevelGrid.updatePixelPosition = function LevelGrid_updatePixelPosition(position) {
        position.x = (position.gridX + position.xRatio) * obj_LevelGrid.cellWidth;
        position.y = (position.gridY + position.yRatio) * obj_LevelGrid.cellHeight;
    };

    /*
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


export function init(ecs) {
    ecs.Data.addResource(Resource_LevelGrid,
        {
            url: "www/levelmap.json",
            gridCellWidth: 16,
            gridCellHeight: 16,
        },
        1, // higher priority than LevelSprite
    );
}
