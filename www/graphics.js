import * as utils from "./utils.js";

/*
* return a canvas correctly scaled for pixel art
*/
function createScaledCanvas(screenWidth, screenHeight, scale) {
    let canvas = document.createElement("canvas");
    let unscaledWidth = screenWidth / scale;
    let unscaledHeight = screenHeight / scale;
    canvas.width = unscaledWidth;
    canvas.style.width = screenWidth + "px";
    canvas.height = unscaledHeight;
    canvas.style.height = screenHeight + "px";
    let context = canvas.getContext('2d');
    // important for pixel art style : no smoothing when scaling or animating
    context.imageSmoothingEnabled = false;
    return [canvas, context];
}

export const View = (function build_View() {
    const obj_View = {
        name: "view",
    };
    let View_canvas, View_context, View_initOptions;

    obj_View.prepareInit = function View_prepareInit(initOptions) {
        View_initOptions = initOptions || {};
    };

    obj_View.init = function View_init() {
        obj_View.screenWidth = View_initOptions.width;
        obj_View.screenHeight = View_initOptions.height;
        obj_View.scale = View_initOptions.scale;
        [View_canvas, View_context] = createScaledCanvas(obj_View.screenWidth, obj_View.screenHeight, obj_View.scale);
        let parentId = View_initOptions.parentId || "game";
        const elParent = document.getElementById(parentId);
        elParent.appendChild(View_canvas);
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
    let Sprite_sheet;
    let Sprite_pose, Sprite_frame, Sprite_frameTime, Sprite_animationDirection;
    const Sprite_animations = {};

    obj_Sprite.init = function Sprite_init(initOptions) {
        //#region init animation
        for (let row of initOptions.sheetLayout) {

        }
        obj_Sprite.setPose(initOptions.pose);
        obj_Sprite.frameDuration = initOptions.frameDuration || 0.1;
        obj_Sprite.animationType = initOptions.animationType || ANIMATION_TYPE.FORWARD;
        Sprite_animationDirection = ANIMATION_DIRECTION.FORWARD;
        //#endregion
        //#region init sprite sheet
        obj_Sprite.sheetCellWidth = initOptions.sheetCellWidth;
        obj_Sprite.sheetCellHeight = initOptions.sheetCellHeight;
        return ImageLoader.get(initOptions.src).then(function spriteImageLoaded(image) {
            Sprite_sheet = image;
            // Run through all cells in the sprite sheet to define separate animation frames
            for (let sourceY = 0, poseIndex = 0; sourceY < Sprite_sheet.height; sourceY += obj_Sprite.sheetCellHeight, poseIndex++) {
                // Y position in the sprite sheet is the animation pose
                let rowOptions = initOptions.sheetLayout[poseIndex];
                Sprite_animations[rowOptions.pose] = [];
                for (let sourceX = 0, frameIndex = 0; frameIndex < rowOptions.animationLength; sourceX += obj_Sprite.sheetCellWidth, frameIndex++) {
                    // X position in the sprite sheet is the animation frame for this pose
                    Sprite_animations[rowOptions.pose][frameIndex] = [Sprite_sheet, sourceX, sourceY, obj_Sprite.sheetCellWidth, obj_Sprite.sheetCellHeight];
                }
            }
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
        let x = position.x - obj_Sprite.sheetCellWidth / 2.0;
        let y = position.y - obj_Sprite.sheetCellHeight / 2.0;
        return { x: x, y: y };
    }

    obj_Sprite.draw = function Sprite_draw(context, position) {
        if (obj_Sprite.isInitialized) {
            let screenPosition = convertPositionToSprite(position);
            context.drawImage(...Sprite_animations[Sprite_pose][Sprite_frame], screenPosition.x, screenPosition.y, obj_Sprite.sheetCellWidth, obj_Sprite.sheetCellHeight);
        } else {
            // sprite not loaded yet
        }
    };

    /*
    * set animation pose
    */
    obj_Sprite.setPose = function Sprite_setPose(poseName) {
        if (Sprite_pose != poseName) {
            Sprite_pose = poseName;
            Sprite_frame = 0;
            Sprite_frameTime = 0;
        }
    };

    /*
    * update animation frame time, change frame, change animation direction if necessary
    */
    obj_Sprite.updateAnimation = function Sprite_updateAnimation(timePassed) {
        if (obj_Sprite.isInitialized) {
            Sprite_frameTime += timePassed;
            while (Sprite_frameTime > obj_Sprite.frameDuration) {
                nextFrame();
                Sprite_frameTime -= obj_Sprite.frameDuration;
            }
        } else {
            console.log("sprite not loaded yet");
        }
    };

    /*
    * move animation to next frame, change animation direction if necessary
    */
    function nextFrame() {
        const animationLength = Sprite_animations[Sprite_pose].length;
        Sprite_frame += Sprite_animationDirection;
        if (Sprite_frame >= animationLength || Sprite_frame < 0) {
            switch (obj_Sprite.animationType) {
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
    };

    obj_Sprite.init(initOptions);

    return obj_Sprite;
};

export const COLLISION_DIRECTION = Object.freeze({
    LEFT: [-1, 0],
    RIGHT: [1, 0],
    UP: [0, 1],
    DOWN: [0, -1],
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
        return obj_LevelGrid.isTileBusy(position.gridX, position.gridY);
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

    obj_LevelSprite.prepareInit = function LevelSprite_prepareInit(initOptions) {
        LevelSprite_initOptions = initOptions;
        obj_LevelSprite.initQueryResources = initOptions.initQueryResources;
    }

    obj_LevelSprite.init = function LevelSprite_init(levelGrid) {
        obj_LevelSprite.sheetCellWidth = LevelSprite_initOptions.sheetCellWidth;
        obj_LevelSprite.sheetCellHeight = LevelSprite_initOptions.sheetCellHeight;
        return ImageLoader.get(LevelSprite_initOptions.sheetSrc)
            .then(function sheetImageLoaded(image) {
                LevelSprite_sheet = image;
                // finally we have map data and a sprite sheet
                generateBackgroundImage(levelGrid);
            });
    };

    /*
    * Generate the background image from the level map data
    */
    function generateBackgroundImage(levelGrid) {
        // create a new canvas for compositing the image
        let [canvas, context] = createScaledCanvas(View.screenWidth, View.screenHeight, View.scale);
        // easy debug // document.getElementById("hiddenloading").appendChild(canvas);
        const levelData = levelGrid.data;
        // iterate the level map data
        for (let rowIndex = 0, destinationY = 0; rowIndex < levelData.length; rowIndex++, destinationY += obj_LevelSprite.sheetCellHeight) {
            const row = levelData[rowIndex];
            const upRow = levelData[rowIndex - 1];
            let upBit = 1;
            const downRow = levelData[rowIndex + 1];
            let downBit = 1;
            for (let columnIndex = 0, destinationX = 0; columnIndex < row.length; columnIndex++, destinationX += obj_LevelSprite.sheetCellWidth) {
                const mapValue = row[columnIndex];
                // The index of the sprite in the sheet is based on which adjacent tiles have blocks or sky
                let tileCode10;
                let leftBit = row[columnIndex - 1];
                let rightBit = row[columnIndex + 1];
                if (leftBit == undefined) {
                    // left edge of the map
                    // consider it has a block
                    leftBit = 1;
                }
                if (rightBit == undefined) {
                    // right edge of the map
                    // consider it has a block
                    rightBit = 1;
                }
                if (upRow != undefined) {
                    // top edge of the map
                    // consider it has a block
                    upBit = upRow[columnIndex];
                }
                if (downRow != undefined) {
                    // bottom edge of the map
                    // consider it has a block
                    downBit = downRow[columnIndex];
                }
                if (mapValue == 1) {
                    // The center is a block,
                    // We can find the sprite in the sheet based on neighboors
                    tileCode10 = 1 * leftBit + 2 * downBit + 4 * rightBit + 8 * upBit;
                } else if (mapValue == 0) {
                    // The center is a sky
                    // The sprite is at a fixed location in the sheet
                    tileCode10 = 16;
                }
                let sourceX = tileCode10 * obj_LevelSprite.sheetCellWidth;
                // Draw to the hidden temporary canvas
                context.drawImage(LevelSprite_sheet,
                    sourceX, 0,
                    obj_LevelSprite.sheetCellWidth, obj_LevelSprite.sheetCellHeight,
                    destinationX, destinationY,
                    obj_LevelSprite.sheetCellWidth, obj_LevelSprite.sheetCellHeight);
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

    ecs.Data.addResource(View,
        {
            width: 960,
            height: 576,
            scale: 3.0,
        },
        0 // higher priority than LevelSprite
    );

    ecs.Data.addResource(LevelGridResource,
        {
            url: "www/levelmap.json",
            gridCellWidth: 16,
            gridCellHeight: 16,
        },
        1 // higher priority than LevelSprite
    );

    ecs.Data.addResource(LevelSpriteResource,
        {
            initQueryResources: ["levelgrid"],
            sheetSrc: "assets/terrain_sheet.png",
            sheetCellWidth: 16,
            sheetCellHeight: 16,
        },
        2 // lower priority than LevelGrid
    );

    // clear background
    ecs.Controller.addSystem({
        queryResources: ["levelsprite"],
        run: function clearBackground(background) {
            View.render(background, { x: 0, y: 0 });
        },
    },
        ecs.SYSTEM_STAGE.END);
    // update animation
    ecs.Controller.addSystem({
        queryResources: ["time"],
        queryComponents: ["sprite"],
        run: function updateAnimation(time, sprite) {
            sprite.updateAnimation(time.dt);
        },
    },
        ecs.SYSTEM_STAGE.END);
    // render sprites
    ecs.Controller.addSystem({
        queryComponents: ["sprite", "position"],
        run: function drawSprite(sprite, position) {
            View.render(sprite, position);
        }
    },
        ecs.SYSTEM_STAGE.END);
}
