import * as Utils from "../utils.js";
/*
*   Separate logic for parsing the configuration of a tilemap
*   because it's a bit complicated, and clogs the Resource_LevelSprite where it was hard to read.
*   It's more a "group of functions" than an actual object.
*/

/*
* A level map background
*/
const Resource_LevelSprite = (function build_LevelSprite() {
    // the object we are building
    const obj_LevelSprite = {
        name: "levelSprite",
    };

    let LevelSprite_sheet, LevelSprite_image, LevelSprite_initOptions;
    let LevelSprite_sheetConfig, LevelSprite_sheetLayout;

    obj_LevelSprite.prepareInit = function LevelSprite_prepareInit(initOptions) {
        LevelSprite_initOptions = initOptions;
        obj_LevelSprite.initQueryResources = initOptions.initQueryResources;
    }

    obj_LevelSprite.init = async function LevelSprite_init(queryResults) {
        const pixelCanvas = queryResults.resources.pixelCanvas;
        const levelGrid = queryResults.resources.levelGrid;
        const data = await Utils.Http.Request({
            url: LevelSprite_initOptions.sheetConfigUrl,
        });
        LevelSprite_sheetConfig = JSON.parse(data.responseText);
        obj_LevelSprite.sheetCellWidth = LevelSprite_sheetConfig.cellWidth;
        obj_LevelSprite.sheetCellHeight = LevelSprite_sheetConfig.cellHeight;
        obj_LevelSprite.theme = LevelSprite_sheetConfig.defaultTheme;
        const image = await Utils.File.ImageLoader.get(LevelSprite_initOptions.sheetSrc);
        LevelSprite_sheet = image;
        LevelSprite_sheetLayout = LevelSprite_sheetConfig.layout;
        // finally we have map data and a sprite sheet
        await generateBackgroundImage(levelGrid, pixelCanvas);
    };

    /*
    * Generate the background image from the level map data
    */
    async function generateBackgroundImage(levelGrid, pixelCanvas) {
        return new Promise(function promiseBackgroundImage(resolve, reject) {
            let levelWidth = levelGrid.width;
            let levelHeight = levelGrid.height;
            // create a new canvas for compositing the image
            let [canvas, context] = pixelCanvas.newUnscaled(levelWidth, levelHeight);
            // easy debug //document.getElementById("hiddenloading").appendChild(canvas);
            const levelData = levelGrid.data;
            /// iterate the level map data
            for (let rowIndex = 0, destinationY = 0; rowIndex < levelData.length; rowIndex++, destinationY += obj_LevelSprite.sheetCellHeight) {
                const row = levelData[rowIndex];
                const upRow = levelData[rowIndex - 1];
                const downRow = levelData[rowIndex + 1];
                for (let columnIndex = 0, destinationX = 0; columnIndex < row.length; columnIndex++, destinationX += obj_LevelSprite.sheetCellWidth) {
                    const neighbors = {};
                    if (upRow === undefined) {
                        /// top edge of the map
                        /// consider it a BLOCK for now
                        neighbors.topLeft = levelGrid.TILE_TYPE.BLOCK;
                        neighbors.topCenter = levelGrid.TILE_TYPE.BLOCK;
                        neighbors.topRight = levelGrid.TILE_TYPE.BLOCK;
                    } else {
                        neighbors.topLeft = upRow[columnIndex - 1];
                        neighbors.topCenter = upRow[columnIndex];
                        neighbors.topRight = upRow[columnIndex + 1];
                    }
                    if (downRow === undefined) {
                        /// bottom edge of the map
                        /// consider it a BLOCK for now
                        neighbors.botLeft = levelGrid.TILE_TYPE.BLOCK;
                        neighbors.botCenter = levelGrid.TILE_TYPE.BLOCK;
                        neighbors.botRight = levelGrid.TILE_TYPE.BLOCK;
                    } else {
                        neighbors.botLeft = downRow[columnIndex - 1];
                        neighbors.botCenter = downRow[columnIndex];
                        neighbors.botRight = downRow[columnIndex + 1];
                    }
                    /// current row
                    neighbors.midLeft = row[columnIndex - 1];
                    if (neighbors.midLeft === undefined) {
                        /// left edge of the map
                        /// consider it a BLOCK for now
                        neighbors.midLeft = levelGrid.TILE_TYPE.BLOCK;
                    }
                    neighbors.midRight = row[columnIndex + 1];
                    if (neighbors.midRight === undefined) {
                        /// right edge of the map
                        /// consider it a BLOCK for now
                        neighbors.midRight = levelGrid.TILE_TYPE.BLOCK;
                    }
                    /// current cell
                    let mapCell = row[columnIndex];

                    /// The info of the sheet cell that correponds the best to the current map cell
                    let bestSheetCellInfoAlternatives;
                    /// The best score of a sheet cell
                    let bestSheetCellScore = -1;
                    for (const sheetCellInfo of LevelSprite_sheetLayout) {
                        if (sheetCellInfo.type != mapCell) {
                            /// the sheet cell is the wrong type of block
                            /// skip it, we'll find better
                            continue;
                        }
                        /// Evaluate if the sheet cell matches the map element we are processing
                        let score = 0;
                        for (const neighborName in neighbors) {
                            const neighborValue = neighbors[neighborName];
                            const sheetCellNeighborValues = sheetCellInfo[neighborName];
                            if (sheetCellNeighborValues === undefined) {
                                /// The sheet configuration doesn't specify anything for this neighbor direction.
                                /// So this is a tolerant configuration that accepts anything.
                                /// We don't change the score.
                                //score += 0;
                            } else {
                                /// The sheet configuration expects something specific in this direction
                                if (sheetCellNeighborValues.includes(neighborValue)) {
                                    /// We have a match, we increase the score by 1 only
                                    score += 1;
                                    const numberOfAlternatives = sheetCellNeighborValues.length;
                                    const priority = sheetCellNeighborValues.indexOf(neighborValue);
                                    if (numberOfAlternatives > 1 && priority > 0) {
                                        /// This is not the type of neighbor preferred by this sheet configuration.
                                        /// We will decrease the score by that much, but stil less than 2.
                                        score -= priority * 2.0 / numberOfAlternatives;
                                    }
                                } else {
                                    /// The sheet configuration specifies a different type of block for this neighbor direction.
                                    /// So this doesn't match.
                                    /// We decrease the score by 2 (more than increase).
                                    score -= 2;
                                }
                            }
                        }
                        /// Finished calculating this score, time to compare to the previous scores
                        if (score > bestSheetCellScore) {
                            /// This is the best sheet cell config for now
                            bestSheetCellInfoAlternatives = [sheetCellInfo,];
                            bestSheetCellScore = score;
                        } else if (score === bestSheetCellScore) {
                            /// This has the same score as the best
                            /// Add it to the alternatives
                            bestSheetCellInfoAlternatives.push(sheetCellInfo);
                        }
                    }

                    if (bestSheetCellInfoAlternatives === undefined) {
                        /// We didn't find any tile in the sheet that matches the requirements of the map
                    } else {
                        /// This neighbor code has been defined in the sheet layout,
                        /// we can draw it.
                        /// For now we take the first alternative (index 0).
                        /// TODO : In the future, randomly choose between alternatives ?
                        let cellInfo = bestSheetCellInfoAlternatives[0];
                        let sourceColumn = cellInfo.cellPosition[0];
                        let sourceRow = cellInfo.cellPosition[1];
                        let sourceX = sourceColumn * obj_LevelSprite.sheetCellWidth;
                        let sourceY = sourceRow * obj_LevelSprite.sheetCellHeight;
                        // Draw to the hidden temporary canvas
                        context.drawImage(LevelSprite_sheet,
                            sourceX, sourceY,
                            obj_LevelSprite.sheetCellWidth, obj_LevelSprite.sheetCellHeight,
                            destinationX, destinationY,
                            obj_LevelSprite.sheetCellWidth, obj_LevelSprite.sheetCellHeight);
                    }
                }
            }
            // Background drawing is finished
            // Export to image
            let imageUri = canvas.toDataURL();
            LevelSprite_image = new Image();
            LevelSprite_image.addEventListener("load", function onloadImage() {
                resolve(LevelSprite_image);
            });
            LevelSprite_image.src = imageUri;
        });
    };

    obj_LevelSprite.draw = function LevelSprite_draw(context, position) {
        context.drawImage(LevelSprite_image, position.x, position.y);
    };

    obj_LevelSprite.update = function LevelSprite_update() {
        // do nothing
        // function necessary as a Resource
    };

    return obj_LevelSprite;
})();

export function init(engine) {
    engine.registerResource(Resource_LevelSprite);
}
