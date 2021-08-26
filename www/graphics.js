import * as utils from "./utils.js";

/*
* a canvas correctly scaled for pixel art
*/
const PixelCanvas = (function build_PixelCanvas() {
    const obj_PixelCanvas = {
        name: "pixelCanvas",
    };

    let PixelCanvas_initOptions, PixelCanvas_scale;

    obj_PixelCanvas.prepareInit = function PixelCanvas_prepareInit(initOptions) {
        PixelCanvas_initOptions = initOptions || {};
    };

    obj_PixelCanvas.init = function PixelCanvas_init() {
        PixelCanvas_scale = PixelCanvas_initOptions.scale;
    };

    /*
    * return a [canvas, context] correctly scaled for pixel art
    */
    obj_PixelCanvas.new = function createScaledCanvas(screenWidth, screenHeight) {
        let canvas = document.createElement("canvas");
        let unscaledWidth = screenWidth / PixelCanvas_scale;
        let unscaledHeight = screenHeight / PixelCanvas_scale;
        canvas.width = unscaledWidth;
        canvas.style.width = screenWidth + "px";
        canvas.height = unscaledHeight;
        canvas.style.height = screenHeight + "px";
        let context = canvas.getContext('2d');
        // important for pixel art style : no smoothing when scaling or animating
        context.imageSmoothingEnabled = false;
        return [canvas, context];
    }

    return obj_PixelCanvas;
})();


export const View = (function build_View() {
    const obj_View = {
        name: "view",
    };
    let View_canvas, View_context, View_initOptions;

    obj_View.prepareInit = function View_prepareInit(initOptions) {
        View_initOptions = initOptions || {};
        obj_View.initQueryResources = initOptions.initQueryResources;
    };

    obj_View.init = function View_init(pixelCanvas) {
        return new Promise(function promise_View_init(resolve, reject) {
            obj_View.screenWidth = View_initOptions.width;
            obj_View.screenHeight = View_initOptions.height;
            obj_View.scale = View_initOptions.scale;
            [View_canvas, View_context] = pixelCanvas.new(obj_View.screenWidth, obj_View.screenHeight);
            let parentId = View_initOptions.parentId || "game";
            const elParent = document.getElementById(parentId);
            elParent.appendChild(View_canvas);
            resolve();
        });
    };

    /*
    * Clear screen for drawing next
    */
    obj_View.clear = function View_clear() {
        View_context.clearRect(0, 0, View_canvas.width, View_canvas.height);
    };

    /*
    * Render all this sprite now
    */
    obj_View.render = function View_render(sprite, position) {
        sprite.draw(View_context, position);
    };

    return obj_View;
})();

export const ANIMATION_DIRECTION = Object.freeze({
    FORWARD: 1,  // currently animate frames in order
    BACKWARD: -1,  // currently animate frames in reverse order
    STOPPED: 0,
});

export const ANIMATION_TYPE = Object.freeze({
    NONE: 0,
    FORWARD: 1,  // animation happens in continuous forward order
    REVERSE: 2,  // animation happens in continuous reverse order
    PINGPONG: 3,  // animation happens in ping-pong mode, alternating forward and backward
});

/*
* Load and cache images
*/
const ImageLoader = (function build_ImageLoader() {
    const obj_ImageLoader = {};
    const ImageLoader_registry = new Set();

    /*
    * Get image from cache or load it if not found
    */
    obj_ImageLoader.get = function ImageLoader_get(src) {
        for (let image of ImageLoader_registry) {
            if (image.src == src) {
                // get from cache
                return new Promise(function promiseImageFromCache(resolve, reject) {
                    resolve(image);
                });
            }
        }
        // not found in cache
        return loadImage(src);
    };

    /*
    * Actually load image file (not from cache)
    */
    function loadImage(src) {
        const image = new Image();
        image.src = src;
        return new Promise(function promiseImageLoading(resolve, reject) {
            image.onload = function onloadImage() {
                ImageLoader_registry.add(image);
                resolve(image);
            };
        });
    }

    return obj_ImageLoader;
})();

/*
* a Sprite with animation from a sprite sheet
*/
export const newSprite = function newSprite(initOptions) {
    const obj_Sprite = {
        name: "sprite",
        isInitialized: false,
    };
    let Sprite_sheetImage;
    let Sprite_pose, Sprite_frame, Sprite_frameTime, Sprite_animationDirection;
    let Sprite_poseInfo, Sprite_frameInfo;
    /*
    * A map of :
    *   {
    *       poseName: {
    *           frames: [
    *               {  // frame info
    *                   sourceX,
    *                   sourceY
    *               },
    *           ],
    *           pose,
    *           animation,
    *       }
    *   }
    */
    const Sprite_sheetLayout = {};

    obj_Sprite.init = function Sprite_init(initOptions) {
        //#region init animation
        let sheetLayout = initOptions.sheetLayout;
        //#endregion
        //#region init sprite sheet
        obj_Sprite.sheetCellWidth = initOptions.sheetCellWidth;
        obj_Sprite.sheetCellHeight = initOptions.sheetCellHeight;
        return ImageLoader.get(initOptions.src).then(function spriteImageLoaded(image) {
            Sprite_sheetImage = image;
            // Run through all cells in the sprite sheet to define separate animation frames
            for (let sourceY = 0, poseIndex = 0; sourceY < Sprite_sheetImage.height; sourceY += obj_Sprite.sheetCellHeight, poseIndex++) {
                // Y position in the sprite sheet is the animation pose
                let options = sheetLayout[poseIndex];
                let animationOptions = options.animation;
                let poseOptions = options.pose;
                poseOptions.name = poseOptions.action + poseOptions.facing; // should already be like this, but instead of checking, I force, because it's only a convenience for inputting the options
                Sprite_sheetLayout[poseOptions.name] = {
                    frames: [],
                    pose: poseOptions,
                    animation: animationOptions,
                };
                for (let sourceX = 0, frameIndex = 0; frameIndex < animationOptions.length; sourceX += obj_Sprite.sheetCellWidth, frameIndex++) {
                    // X position in the sprite sheet is the animation frame for this pose
                    Sprite_sheetLayout[poseOptions.name].frames[frameIndex] = {
                        sourceX: sourceX,
                        sourceY: sourceY,
                    };
                }
            }
            obj_Sprite.setPose({ name: initOptions.defaultPose });
            obj_Sprite.isInitialized = true;
            return obj_Sprite;
        });
        //#endregion
    };

    /*
    * From a requested drawing `position`, get where the sprite should be drawn.
    * Return the upper left corner of the sprite, when the `position` indicates the position of the bottom-middle.
    * */
    function convertPositionToSprite(position) {
        let x = position.x - obj_Sprite.sheetCellWidth * 0.5;
        // a bit off-center downwards, so that feet appear to walk on top of the lower map tile
        let y = position.y - obj_Sprite.sheetCellHeight * 0.4;
        return { x: x, y: y };
    }

    obj_Sprite.draw = function Sprite_draw(context, position) {
        if (obj_Sprite.isInitialized) {
            let screenPosition = convertPositionToSprite(position);
            context.drawImage(
                Sprite_sheetImage,
                Sprite_frameInfo.sourceX,
                Sprite_frameInfo.sourceY,
                obj_Sprite.sheetCellWidth,
                obj_Sprite.sheetCellHeight,
                screenPosition.x,
                screenPosition.y,
                obj_Sprite.sheetCellHeight,
                obj_Sprite.sheetCellHeight
            );
        } else {
            // sprite not loaded yet
            console.log("sprite not loaded yet");
        }
    };

    /*
    * set animation pose
    */
    obj_Sprite.setPose = function Sprite_setPose(poseInfo) {
        let poseName = poseInfo.name;
        if (poseInfo.action && poseInfo.facing) {
            poseName = poseInfo.action + poseInfo.facing;
        }
        if (poseName != undefined && Sprite_pose != poseName) {
            // the pose changed
            Sprite_pose = poseName;
            // reset animation
            Sprite_frameTime = 0;
            Sprite_poseInfo = Sprite_sheetLayout[Sprite_pose];
            switch (Sprite_poseInfo.animation.type) {
                case ANIMATION_TYPE.FORWARD:
                case ANIMATION_TYPE.PINGPONG:
                    Sprite_frame = 0;
                    Sprite_animationDirection = ANIMATION_DIRECTION.FORWARD;
                case ANIMATION_TYPE.REVERSE:
                    // last frame
                    Sprite_frame = Sprite_poseInfo.animation.length - 1;
                    Sprite_animationDirection = ANIMATION_DIRECTION.BACKWARD;
                    break;
                case ANIMATION_TYPE.NONE:
                    Sprite_frame = 0;
                    Sprite_animationDirection = ANIMATION_DIRECTION.STOPPED;
                    break;
            }
            Sprite_frameInfo = Sprite_poseInfo.frames[Sprite_frame];
        }
    };

    /*
    * update animation frame time, change frame, change animation direction if necessary
    */
    obj_Sprite.updateAnimation = function Sprite_updateAnimation(timePassed) {
        if (!obj_Sprite.isInitialized) {
            console.log("sprite not loaded yet");
            return;
        }
        if (Sprite_animationDirection != ANIMATION_DIRECTION.STOPPED) {
            Sprite_frameTime += timePassed;
            while (Sprite_frameTime > Sprite_poseInfo.animation.frameDuration) {
                nextFrame();
                Sprite_frameTime -= Sprite_poseInfo.animation.frameDuration;
            }
        }
    };

    /*
    * move animation to next frame, change animation direction if necessary
    */
    function nextFrame() {
        const animationLength = Sprite_poseInfo.frames.length;
        Sprite_frame += Sprite_animationDirection;
        if (Sprite_frame >= animationLength || Sprite_frame < 0) {
            switch (Sprite_poseInfo.animation.type) {
                case ANIMATION_TYPE.FORWARD:
                case ANIMATION_TYPE.BACKWARD:
                    Sprite_frame = (Sprite_frame + animationLength) % animationLength;
                    break;
                case ANIMATION_TYPE.PINGPONG:
                    Sprite_animationDirection = -Sprite_animationDirection;
                    Sprite_frame += Sprite_animationDirection;
                    break;
                default:
                    console.warn("unexpected case");
                    break;
            }
        }
        Sprite_frameInfo = Sprite_poseInfo.frames[Sprite_frame];
    };

    obj_Sprite.init(initOptions);

    return obj_Sprite;
};

export const COLLISION_DIRECTION = Object.freeze({
    LEFT: [-1, 0],
    RIGHT: [1, 0],
    UP: [0, -1],
    DOWN: [0, 1],
});

/*
* the Level grid data
*/
export const LevelGridResource = (function build_LevelGrid() {
    const obj_LevelGrid = {
        name: "levelgrid",
    };

    let LevelGrid_initOptions, LevelGrid_cellWidth, LevelGrid_cellHeight;

    obj_LevelGrid.prepareInit = function LevelGrid_prepareInit(initOptions) {
        LevelGrid_initOptions = initOptions || {};
    };

    obj_LevelGrid.init = function LevelGrid_init() {
        LevelGrid_cellWidth = LevelGrid_initOptions.gridCellWidth;
        LevelGrid_cellHeight = LevelGrid_initOptions.gridCellHeight;
        return utils.Http.Request({
            url: LevelGrid_initOptions.url,
        })
            .then(function gotBackgroundFile(data) {
                let json_obj = JSON.parse(data.responseText);
                obj_LevelGrid.data = json_obj.map;
            });
    };

    obj_LevelGrid.update = function LevelGrid_update() {
        // nothing for now, but has to exist for a Resource
    };

    obj_LevelGrid.isTileBusy = function LevelGrid_isTileBusy(x, y) {
        return obj_LevelGrid.data[y][x] != 0;
    }

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
        position.x = (position.gridX + position.xRatio) * LevelGrid_cellWidth;
        position.y = (position.gridY + position.yRatio) * LevelGrid_cellHeight;
    };

    /*
    * update the grid position of a `position` based on its pixel position
    */
    obj_LevelGrid.updateGridPosition = function LevelGrid_updateGridPosition(position) {
        position.gridX = Math.floor(position.x / LevelGrid_cellWidth);
        position.xRatio = position.x / LevelGrid_cellWidth - position.gridX;
        position.gridY = Math.floor(position.y / LevelGrid_cellHeight);
        position.yRatio = position.y / LevelGrid_cellHeight - position.gridY;
    };

    return obj_LevelGrid;
})();

/*
* A level map background
*/
export const LevelSpriteResource = (function build_LevelSprite() {
    // the object we are building
    const obj_LevelSprite = {
        name: "levelsprite",
    };

    let LevelSprite_sheet, LevelSprite_image, LevelSprite_initOptions;
    let LevelSprite_sheetLayout;

    obj_LevelSprite.prepareInit = function LevelSprite_prepareInit(initOptions) {
        LevelSprite_initOptions = initOptions;
        obj_LevelSprite.initQueryResources = initOptions.initQueryResources;
    }

    obj_LevelSprite.init = function LevelSprite_init(levelGrid, pixelCanvas) {
        obj_LevelSprite.sheetCellWidth = LevelSprite_initOptions.sheetCellWidth;
        obj_LevelSprite.sheetCellHeight = LevelSprite_initOptions.sheetCellHeight;
        obj_LevelSprite.theme = LevelSprite_initOptions.defaultTheme;
        return ImageLoader.get(LevelSprite_initOptions.sheetSrc)
            .then(function sheetImageLoaded(image) {
                LevelSprite_sheet = image;
                parseSheetLayout(LevelSprite_initOptions.sheetLayout)
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
        console.log("parsing sheet layout", sheetLayout)
        LevelSprite_sheetLayout = {};
        for (const cellInfo of sheetLayout) {
            console.log("cell info", cellInfo);
            if (!(cellInfo.theme in LevelSprite_sheetLayout)) {
                LevelSprite_sheetLayout[cellInfo.theme] = {};
            }
            let neighborBits = [0, 0, 0, 0, 0, 0, 0, 0, 1];
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
            console.log("known neighbors", neighborBits);
            /// now generate all combinations of neighbor codes that exist for all the ignored neighbors (connecting and not connecting)
            const ignoredLength = cellInfo.neighborIgnored.length;
            const ignoredIndices = cellInfo.neighborIgnored.sort().map(indexOfNumpad);
            console.log("ignoredIndices", cellInfo.neighborIgnored, ignoredIndices);
            for (let ignoredCombination = 0; ignoredCombination < (2 ** ignoredLength); ignoredCombination++) {
                let ignoredCombinationBits = utils.Number.numToBitArray(ignoredCombination, ignoredLength);
                console.log("generating combination", ignoredCombination, ignoredCombinationBits);
                let neighborCodeBits = [...neighborBits];
                for (let bitIndex = 0, combinationIndex = 0; bitIndex < neighborCodeBits.length; bitIndex++) {
                    if (ignoredIndices.includes(bitIndex)) {
                        neighborCodeBits[bitIndex] = ignoredCombinationBits[combinationIndex];
                        console.log("setting ignored bit", combinationIndex, ignoredCombinationBits[combinationIndex]);
                        combinationIndex++;
                    }
                }
                let neighborCode = utils.Number.bitArrayToNum(neighborCodeBits);
                console.log("generated neighbor code", neighborCodeBits, neighborCode)
                if (!(neighborCode in LevelSprite_sheetLayout[cellInfo.theme])) {
                    LevelSprite_sheetLayout[cellInfo.theme][neighborCode] = [];
                }
                console.log("building cell info", cellInfo);
                LevelSprite_sheetLayout[cellInfo.theme][neighborCode].push({
                    sourceX: cellInfo.cellPosition[0],
                    sourceY: cellInfo.cellPosition[1],
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
        console.log("got sheet layout", LevelSprite_sheetLayout);
        // create a new canvas for compositing the image
        let [canvas, context] = pixelCanvas.new(View.screenWidth, View.screenHeight);
        document.getElementById("hiddenloading").appendChild(canvas);  // easy debug // 
        const levelData = levelGrid.data;
        // iterate the level map data
        for (let rowIndex = 0, destinationY = 0; rowIndex < levelData.length; rowIndex++, destinationY += obj_LevelSprite.sheetCellHeight) {
            const row = levelData[rowIndex];
            const upRow = levelData[rowIndex - 1];
            const downRow = levelData[rowIndex + 1];
            for (let columnIndex = 0, destinationX = 0; columnIndex < row.length; columnIndex++, destinationX += obj_LevelSprite.sheetCellWidth) {
                const mapValue = row[columnIndex];
                let neighborBits = [0, 0, 0, 0, 0, 0, 0, 0, 0];
                if (upRow == undefined) {
                    // top edge of the map
                    neighborBits[5] = undefined;
                    neighborBits[6] = undefined;
                    neighborBits[7] = undefined;
                } else {
                    neighborBits[5] = upRow[columnIndex + 1];
                    neighborBits[6] = upRow[columnIndex];
                    neighborBits[7] = upRow[columnIndex - 1];
                }
                if (downRow == undefined) {
                    // bottom edge of the map
                    neighborBits[1] = undefined;
                    neighborBits[2] = undefined;
                    neighborBits[3] = undefined;
                } else {
                    neighborBits[1] = downRow[columnIndex - 1];
                    neighborBits[2] = downRow[columnIndex];
                    neighborBits[3] = downRow[columnIndex + 1];
                }
                neighborBits[0] = row[columnIndex - 1];
                neighborBits[8] = row[columnIndex];
                neighborBits[4] = row[columnIndex + 1];
                for (let neighborIndex = 0; neighborIndex < neighborBits.length; neighborIndex++) {
                    const neighborBit = neighborBits[neighborIndex];
                    if (neighborBit == undefined) {
                        // edge of the map
                        // consider it has a block
                        neighborBits[neighborIndex] = 1;
                    }
                }
                let neighborCode = utils.Number.bitArrayToNum(neighborBits);
                console.log("trying to drawn neighbor code", neighborCode, neighborBits);
                if (mapValue == 1) {
                    // The center is a block
                } else if (mapValue == 0) {
                    // The center is a sky
                    // nothing to draw
                }
                let variations = LevelSprite_sheetLayout[obj_LevelSprite.theme][neighborCode];
                if (variations != undefined) {
                    let cellInfo = variations[0];  // 0 because first variation
                    let sourceX = cellInfo.sourceX * obj_LevelSprite.sheetCellWidth;
                    let sourceY = cellInfo.sourceY * obj_LevelSprite.sheetCellHeight;
                    console.log("drawing cellInfo", cellInfo);
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

export function init(ecs) {
    /*
    ecs.Controller.addInitSystem(View.init, {
        width: 960,
        height: 576,
        scale: 3.0,
    });
    */

    ecs.Data.addResource(PixelCanvas,
        {
            scale: 4.0,
        },
        0, // higher priority than View
    );

    ecs.Data.addResource(View,
        {
            initQueryResources: ["pixelCanvas"],
            width: 1280,
            height: 768,
        },
        1, // higher priority than LevelSprite, lower than PixelCanvas
    );

    ecs.Data.addResource(LevelGridResource,
        {
            url: "www/levelmap.json",
            gridCellWidth: 16,
            gridCellHeight: 16,
        },
        2, // higher priority than LevelSprite
    );

    ecs.Data.addResource(LevelSpriteResource,
        {
            initQueryResources: ["levelgrid", "pixelCanvas"],
            sheetSrc: "assets/terrain_tilemap.png",
            defaultTheme: "hellplatform",
            sheetCellWidth: 16,
            sheetCellHeight: 16,
            sheetLayout: [
                {
                    theme: "hellplatform",
                    type: "block",  // ignored for now
                    cellPosition: [0, 0],  // [X column, Y row] topleft [0, 0]
                    neighborConnect: [6, 2],  // numpad notation
                    neighborNoconnect: [4, 8],  // block definitely not there, numpad notation
                    neighborIgnored: [7, 9, 1, 3],  // block might or might not be there, numpad notation
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [1, 0],
                    neighborConnect: [4, 2, 6],
                    neighborNoconnect: [8],
                    neighborIgnored: [7, 9, 1, 3],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [2, 0],
                    neighborConnect: [4, 2],
                    neighborNoconnect: [8, 6],
                    neighborIgnored: [7, 9, 1, 3],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [3, 0],
                    neighborConnect: [2],
                    neighborNoconnect: [4, 8, 6],
                    neighborIgnored: [7, 9, 1, 3],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [0, 1],
                    neighborConnect: [8, 6, 2],
                    neighborNoconnect: [4],
                    neighborIgnored: [7, 9, 1, 3],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [1, 1],
                    neighborConnect: [4, 8, 6, 2],
                    neighborNoconnect: [],
                    neighborIgnored: [7, 9, 1, 3],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [2, 1],
                    neighborConnect: [8, 4, 2],
                    neighborNoconnect: [6],
                    neighborIgnored: [7, 9, 1, 3],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [3, 1],
                    neighborConnect: [8, 2],
                    neighborNoconnect: [4, 6],
                    neighborIgnored: [7, 9, 1, 3],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [0, 2],
                    neighborConnect: [8, 6],
                    neighborNoconnect: [4, 2],
                    neighborIgnored: [7, 9, 1, 3],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [1, 2],
                    neighborConnect: [4, 8, 6],
                    neighborNoconnect: [2],
                    neighborIgnored: [7, 9, 1, 3],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [2, 2],
                    neighborConnect: [4, 8],
                    neighborNoconnect: [2, 6],
                    neighborIgnored: [7, 9, 1, 3],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [3, 2],
                    neighborConnect: [8],
                    neighborNoconnect: [4, 2, 6],
                    neighborIgnored: [7, 9, 1, 3],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [0, 3],
                    neighborConnect: [6],
                    neighborNoconnect: [4, 8, 2],
                    neighborIgnored: [7, 9, 1, 3],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [1, 3],
                    neighborConnect: [4, 6],
                    neighborNoconnect: [8, 2],
                    neighborIgnored: [7, 9, 1, 3],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [2, 3],
                    neighborConnect: [4],
                    neighborNoconnect: [8, 6, 2],
                    neighborIgnored: [7, 9, 1, 3],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [3, 3],
                    neighborConnect: [],
                    neighborNoconnect: [4, 2, 6, 8],
                    neighborIgnored: [7, 9, 1, 3],
                },
                /*
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [4,1],
                    neighborConnect: [4,8,6,2],
                    neighborNoconnect: [3],
                    neighborIgnored: [7,9,1],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [5,1],
                    neighborConnect: [4,8,6,2],
                    neighborNoconnect: [1],
                    neighborIgnored: [7,9,3],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [4,2],
                    neighborConnect: [4,8,6,2],
                    neighborNoconnect: [9],
                    neighborIgnored: [7,1,3],
                },
                {
                    theme: "hellplatform",
                    type: "block",
                    cellPosition: [5,2],
                    neighborConnect: [4,8,6,2],
                    neighborNoconnect: [7],
                    neighborIgnored: [9,1,3],
                },
                */
            ],
        },
        3, // lower priority than LevelGrid
    );

    // clear background
    ecs.Controller.addSystem({
        resourceQuery: ["levelsprite"],
        run: function clearBackground(queryResults) {
            View.clear();  // TODO : remove when implementing background
            const levelsprite = queryResults.resources.levelsprite;
            View.render(levelsprite, { x: 0, y: 0 });
        },
    },
        ecs.SYSTEM_STAGE.END);
    // update animation
    ecs.Controller.addSystem({
        resourceQuery: ["time"],
        componentQueries: {
            sprites: ["sprite"],
        },
        run: function updateAnimation(queryResults) {
            const time = queryResults.resources.time;
            for (let e of queryResults.components.sprites) {
                e.sprite.updateAnimation(time.dt);
            }
        },
    },
        ecs.SYSTEM_STAGE.END);
    // render sprites
    ecs.Controller.addSystem({
        componentQueries: {
            sprites: ["sprite", "position"],
        },
        run: function drawSprite(queryResults) {
            for (let e of queryResults.components.sprites) {
                View.render(e.sprite, e.position);
            }
        }
    },
        ecs.SYSTEM_STAGE.END);
}
