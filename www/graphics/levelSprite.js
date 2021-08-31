import * as Utils from "../utils.js";

/*
* A level map background
*/
const Resource_LevelSprite = (function build_LevelSprite() {
    // the object we are building
    const obj_LevelSprite = {
        name: "levelsprite",
    };

    let LevelSprite_sheet, LevelSprite_image, LevelSprite_initOptions;
    let LevelSprite_sheetConfig, LevelSprite_sheetLayout;

    obj_LevelSprite.prepareInit = function LevelSprite_prepareInit(initOptions) {
        LevelSprite_initOptions = initOptions;
        obj_LevelSprite.initQueryResources = initOptions.initQueryResources;
    }

    obj_LevelSprite.init = function LevelSprite_init(levelGrid, pixelCanvas) {
        return Utils.Http.Request({
            url: LevelSprite_initOptions.sheetConfigUrl,
        })
            .then(function gotConfigFile(data) {
                LevelSprite_sheetConfig = JSON.parse(data.responseText);
                obj_LevelSprite.sheetCellWidth = LevelSprite_sheetConfig.cellWidth;
                obj_LevelSprite.sheetCellHeight = LevelSprite_sheetConfig.cellHeight;
                obj_LevelSprite.theme = LevelSprite_sheetConfig.defaultTheme;
                return Utils.File.ImageLoader.get(LevelSprite_initOptions.sheetSrc)
            })
            .then(function sheetImageLoaded(image) {
                LevelSprite_sheet = image;
                parseSheetLayout(LevelSprite_sheetConfig.layout)
                // finally we have map data and a sprite sheet
                generateBackgroundImage(levelGrid, pixelCanvas);
            });
    };

    function parseSheetLayout(sheetLayout) {
        /*
        {
            "theme0": {
                "neighborcode0": [  // variations
                    {  // variation 0
                        sourceX: x,
                        sourceY: y,
                    },
                ],
            },
        }
        */
        LevelSprite_sheetLayout = {};
        for (const cellInfo of sheetLayout) {
            if (!(cellInfo.theme in LevelSprite_sheetLayout)) {
                LevelSprite_sheetLayout[cellInfo.theme] = {};
            }
            let neighborBits = [0, 0, 0, 0, 0, 0, 0, 0, 1];  // little endian
            /// bits we know are connecting
            for (const numpadConnect of cellInfo.neighborConnect) {
                let bitIndex = indexOfNumpad(numpadConnect);
                neighborBits[bitIndex] = 1;
            }
            /// bits we know are not connecting
            for (const numpadNoconnect of cellInfo.neighborNoconnect) {
                let bitIndex = indexOfNumpad(numpadNoconnect);
                neighborBits[bitIndex] = 0;
            }
            /// find all bits that were not considered by the sprite author
            let ignoredIndices = [1, 2, 3, 4, 6, 7, 8, 9].map(indexOfNumpad);
            let neighborKnownIndices = [...cellInfo.neighborConnect.map(indexOfNumpad), ...cellInfo.neighborNoconnect.map(indexOfNumpad)];
            for (const bitIndex of neighborKnownIndices) {
                let removeIndex = ignoredIndices.indexOf(bitIndex);
                ignoredIndices.splice(removeIndex, 1);
            }
            /// now generate all combinations of neighbor codes that exist for all the ignored neighbors (connecting and not connecting)
            const ignoredLength = ignoredIndices.length;
            for (let ignoredCombination = 0; ignoredCombination < (2 ** ignoredLength); ignoredCombination++) {
                let ignoredCombinationBits = Utils.Number.numToBitArray(ignoredCombination, ignoredLength);
                let neighborCodeBits = [...neighborBits];
                /// for this combination, set all the relavant bits
                for (let bitIndex = 0, combinationIndex = 0; bitIndex < neighborCodeBits.length; bitIndex++) {
                    if (ignoredIndices.includes(bitIndex)) {
                        /// that bit in the final array if an ignored neighbor,
                        /// so it must be set by the combination generation
                        neighborCodeBits[bitIndex] = ignoredCombinationBits[combinationIndex];
                        // iterating the bits in the generated combination
                        combinationIndex++;
                    }
                }
                let neighborCode = Utils.Number.bitArrayToNum(neighborCodeBits);
                if (!(neighborCode in LevelSprite_sheetLayout[cellInfo.theme])) {
                    /// initialize the list of variations
                    LevelSprite_sheetLayout[cellInfo.theme][neighborCode] = [];
                }
                LevelSprite_sheetLayout[cellInfo.theme][neighborCode].push({
                    sourceX: cellInfo.cellPosition[0],
                    sourceY: cellInfo.cellPosition[1],
                    neighborAwareness: neighborBits.length - ignoredLength,  // how many neighbors were not ignored
                });
                /// Variations now include tiles that are specifically made for this neighbor situation,
                /// and tiles that are here only because they ignored many neighbors.
                /// So now we must sort them to put the most aware first (and later draw the most aware).
                LevelSprite_sheetLayout[cellInfo.theme][neighborCode].sort(function sortAwareness(a, b) {
                    return b.neighborAwareness - a.neighborAwareness;
                });
            }
        }
    }

    /*
    *   numpad notation : visualize a computer keyboard numpad, the main tile is at the center (number 5),
    *       789
    *       456
    *       123
    *   neighbor code: bits presence(1)/absence(0) of neighbor connection at that neighboring location, in the following order :
    *       low bit at left (numpad 4), increasing counter-clockwise, high bit at topleft (7),
    *       finishing eventually with highest bit at center (5) but considered granted to be 1 for now
    */
    function indexOfNumpad(numpadNotation) {
        const numpads = [4, 1, 2, 3, 6, 9, 8, 7, 5]
        for (let numpadIndex = 0; numpadIndex < numpads.length; numpadIndex++) {
            const numpadValue = numpads[numpadIndex];
            if (numpadNotation == numpadValue) {
                return numpadIndex;
            }
        }
    }

    /*
    * Generate the background image from the level map data
    */
    function generateBackgroundImage(levelGrid, pixelCanvas) {
        let levelWidth = levelGrid.width * levelGrid.cellWidth;
        let levelHeight = levelGrid.height * levelGrid.cellHeight;
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
                let neighborBits = [0, 0, 0, 0, 0, 0, 0, 0, 0];
                if (upRow == undefined) {
                    /// top edge of the map
                    neighborBits[5] = undefined;
                    neighborBits[6] = undefined;
                    neighborBits[7] = undefined;
                } else {
                    neighborBits[5] = upRow[columnIndex + 1];
                    neighborBits[6] = upRow[columnIndex];
                    neighborBits[7] = upRow[columnIndex - 1];
                }
                if (downRow == undefined) {
                    /// bottom edge of the map
                    neighborBits[1] = undefined;
                    neighborBits[2] = undefined;
                    neighborBits[3] = undefined;
                } else {
                    neighborBits[1] = downRow[columnIndex - 1];
                    neighborBits[2] = downRow[columnIndex];
                    neighborBits[3] = downRow[columnIndex + 1];
                }
                /// current row
                neighborBits[0] = row[columnIndex - 1];  // left cell may be undefined if left edge
                neighborBits[8] = row[columnIndex];
                neighborBits[4] = row[columnIndex + 1];  // right cell may be undefined if right edge
                for (let neighborIndex = 0; neighborIndex < neighborBits.length; neighborIndex++) {
                    const neighborBit = neighborBits[neighborIndex];
                    if (neighborBit == undefined) {
                        /// edge of the map
                        // consider it has a block for the purpose of calculating neighbors
                        neighborBits[neighborIndex] = 1;
                    }
                }
                let neighborCode = Utils.Number.bitArrayToNum(neighborBits);
                let variations = LevelSprite_sheetLayout[obj_LevelSprite.theme][neighborCode];
                if (variations != undefined) {
                    /// This neighbor code has been defined in the sheet layout,
                    /// we can draw it.
                    let cellInfo = variations[0];  // 0 because first variation has the highest neighbor awareness
                    let sourceX = cellInfo.sourceX * obj_LevelSprite.sheetCellWidth;
                    let sourceY = cellInfo.sourceY * obj_LevelSprite.sheetCellHeight;
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
        LevelSprite_image.src = imageUri;
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


/*
* A level background image
*/
const Resource_Backdrop = (function build_Backdrop() {
    // the object we are building
    const obj_Backdrop = {
        name: "backdrop",
    };

    let Backdrop_sheet, Backdrop_image, Backdrop_initOptions;

    obj_Backdrop.prepareInit = function Backdrop_prepareInit(initOptions) {
        Backdrop_initOptions = initOptions;
        obj_Backdrop.initQueryResources = initOptions.initQueryResources;
    }

    obj_Backdrop.init = function Backdrop_init(levelGrid, pixelCanvas) {
        obj_Backdrop.theme = Backdrop_initOptions.theme;
        return Utils.File.ImageLoader.get(Backdrop_initOptions.sheetSrc)
            .then(function sheetImageLoaded(image) {
                Backdrop_sheet = image;
                // finally we have map data and a sprite sheet
                generateBackdropImage(levelGrid, pixelCanvas);
            });
    };
    /*
    * Generate the background image from individual tile
    */
    function generateBackdropImage(levelGrid, pixelCanvas) {
        let levelWidth = levelGrid.width * levelGrid.cellWidth;
        let levelHeight = levelGrid.height * levelGrid.cellHeight;
        // create a new canvas for compositing the image
        let [canvas, context] = pixelCanvas.newUnscaled(levelWidth, levelHeight);
        // easy debug // document.getElementById("hiddenloading").appendChild(canvas);
        /// Draw
        let backdropPattern = context.createPattern(Backdrop_sheet, "repeat");
        context.rect(0, 0, canvas.width, canvas.height);
        context.fillStyle = backdropPattern;
        context.fill();
        /// Export to image
        let imageUri = canvas.toDataURL();
        Backdrop_image = new Image();
        Backdrop_image.src = imageUri;
    };

    obj_Backdrop.draw = function LevelSprite_draw(context, position) {
        context.drawImage(Backdrop_image, position.x, position.y);
    };

    obj_Backdrop.update = function LevelSprite_update() {
        // do nothing
        // function necessary as a Resource
    };

    return obj_Backdrop;
})();

export function init(ecs) {
    ecs.Data.addResource(Resource_LevelSprite,
        {
            initQueryResources: ["levelgrid", "pixelCanvas"],
            sheetSrc: "assets/terrain_tilemap.png",
            sheetConfigUrl: "assets/terrain_tilemap.json",
        },
        3, // lower priority than LevelGrid
    );

    ecs.Data.addResource(Resource_Backdrop,
        {
            initQueryResources: ["levelgrid", "pixelCanvas"],
            sheetSrc: "assets/backdrop.png",
            theme: "hellplatform",
        },
        3, // lower priority than LevelGrid
    );
}
