import * as Utils from "../utils.js";

/*
*   Separate logic for parsing the configuration of a tilemap
*   because it's a bit complicated, and clogs the Resource_LevelSprite where it was hard to read.
*   It's more a "group of functions" than an actual object.
*/
const newTilemapLayoutParser = function newTilemapLayoutParser() {
    const obj_Parser = {};
    let Parser_sheetConfig, Parser_result;

    obj_Parser.init = function Parser_init(sheetConfig) {
        Parser_sheetConfig = sheetConfig;
        Parser_result = {};
        return obj_Parser;
    };

    function initTheme(themeName) {
        if (!(themeName in Parser_result)) {
            Parser_result[themeName] = {};
        }
    }

    /*
    *   Get the known connection bits
    *   For arrays of neighbors in numpad notation
    */
    function getKnownNeighborBits(neighborConnect, neighborNoconnect) {
        let neighborBits = [0, 0, 0, 0, 0, 0, 0, 0, 1];  // little endian
        /// bits we know are connecting
        for (const numpadConnect of neighborConnect) {
            let bitIndex = indexOfNumpad(numpadConnect);
            neighborBits[bitIndex] = 1;
        }
        /// bits we know are not connecting
        for (const numpadNoconnect of neighborNoconnect) {
            let bitIndex = indexOfNumpad(numpadNoconnect);
            neighborBits[bitIndex] = 0;
        }
        return neighborBits;
    }

    /*
    *   Get the bit indices of the connection bits that are unknown because they were not considered by the sprite author.
    *   For arrays of neighbors in numpad notation
    */
    function getNeighborIgnoredIndices(neighborConnect, neighborNoconnect) {
        let ignoredIndices = [1, 2, 3, 4, 6, 7, 8, 9].map(indexOfNumpad);
        let neighborKnownIndices = [...neighborConnect.map(indexOfNumpad), ...neighborNoconnect.map(indexOfNumpad)];
        for (const bitIndex of neighborKnownIndices) {
            let removeIndex = ignoredIndices.indexOf(bitIndex);
            ignoredIndices.splice(removeIndex, 1);
        }
        return ignoredIndices;
    }

    /*
    *   Take a combination (decimal representation of MISSING neighbor bits), a list of known neighbor bits, a list of unknown bits indices,
    *   Then set all the known bits to their known values, and all the unknown bits to a bit in the combination
    *   Finally, return the neighbor code (decimal representation of ALL neighbor bits) for this combination.
    */
    function getNeighborCodeForCombination(ignoredCombination, ignoredIndices, neighborBits) {
        let ignoredCombinationBits = Utils.Number.numToBitArray(ignoredCombination, ignoredIndices.length);
        let neighborCodeBits = [...neighborBits];
        /// for this combination, set all the relevant bits
        for (let bitIndex = 0, combinationIndex = 0; bitIndex < neighborCodeBits.length; bitIndex++) {
            if (ignoredIndices.includes(bitIndex)) {
                /// that bit in the final array if an ignored neighbor,
                /// so it must be set by the combination generation
                neighborCodeBits[bitIndex] = ignoredCombinationBits[combinationIndex];
                // iterating the bits in the generated combination
                combinationIndex++;
            }
        }
        return Utils.Number.bitArrayToNum(neighborCodeBits);
    }

    /*
    *   Add this Cell to the final parsed result
    */
    function addCellInfoCode(cellInfo, neighborCode, neighborAwareness) {
        if (!(neighborCode in Parser_result[cellInfo.theme])) {
            /// initialize the list of variations
            Parser_result[cellInfo.theme][neighborCode] = [];
        }
        Parser_result[cellInfo.theme][neighborCode].push({
            sourceX: cellInfo.cellPosition[0],
            sourceY: cellInfo.cellPosition[1],
            neighborAwareness: neighborAwareness,  // how many neighbors were not ignored
        });
        /// Variations now include tiles that are specifically made for this neighbor situation,
        /// and tiles that are here only because they ignored many neighbors.
        /// So now we must sort them to put the most aware first (and later draw the most aware).
        Parser_result[cellInfo.theme][neighborCode].sort(function sortAwareness(a, b) {
            return b.neighborAwareness - a.neighborAwareness;
        });
    }

    /*
    *   Parse the tilemap config and return a computed config in the form of :
    *   {
    *       "theme0": {
    *           "neighborcode0": [  // variations
    *               {  // variation 0
    *                   sourceX: x,
    *                   sourceY: y,
    *               },
    *           ],
    *       },
    *   }
    * 
    *   This computation is necessary, because I want to generate all "neighbor codes" (that represent a tile neighborhood)
    *   even if the tilemap author didn't implement all possible values.
    */
    obj_Parser.parse = function Parser_parse() {
        for (const cellInfo of Parser_sheetConfig) {
            initTheme(cellInfo.theme)
            let neighborBits = getKnownNeighborBits(cellInfo.neighborConnect, cellInfo.neighborNoconnect);
            /// find all bits that were not considered by the sprite author
            let ignoredIndices = getNeighborIgnoredIndices(cellInfo.neighborConnect, cellInfo.neighborNoconnect);
            /// now generate all combinations of neighbor codes that exist for all the ignored neighbors (connecting and not connecting)
            ignoredIndices.length;
            for (let ignoredCombination = 0; ignoredCombination < (2 ** ignoredIndices.length); ignoredCombination++) {
                let neighborCode = getNeighborCodeForCombination(ignoredCombination, ignoredIndices, neighborBits);
                addCellInfoCode(cellInfo, neighborCode, neighborBits.length - ignoredIndices.length);
            }
        }
        return Parser_result;
    };


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

    return obj_Parser;
};

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
        LevelSprite_sheetLayout = newTilemapLayoutParser().init(sheetLayout).parse();
    }

    /*
    * Generate the background image from the level map data
    */
    function generateBackgroundImage(levelGrid, pixelCanvas) {
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
        let levelWidth = levelGrid.width;
        let levelHeight = levelGrid.height;
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
