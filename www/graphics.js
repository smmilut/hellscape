import * as utils from "./utils.js";

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
    const obj_View = {};
    let View_canvas, View_context;

    obj_View.init = function View_init(initOptions) {
        obj_View.screenWidth = initOptions.width;
        obj_View.screenHeight = initOptions.height;
        obj_View.scale = initOptions.scale;
        [View_canvas, View_context] = createScaledCanvas(obj_View.screenWidth, obj_View.screenHeight, obj_View.scale);
        let parentId = initOptions.parentId || "game";
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
    FORWARD: 1,
    BACKWARD: -1,
    STOPPED: 0,
});

export const ANIMATION_TYPE = Object.freeze({
    FORWARD: 1,
    REVERSE: 2,
    PINGPONG: 3,
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
    };
    let Sprite_sheet;
    let Sprite_pose, Sprite_frame, Sprite_frameTime, Sprite_animationDirection;
    const Sprite_animations = {};

    obj_Sprite.init = function Sprite_init(initOptions) {
        /* TODO : deduce render priority from Z position ? */
        obj_Sprite.renderPriority = 1;
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
            return obj_Sprite;
        });
        //#endregion
    };

    obj_Sprite.isInitialized = function Sprite_isInitialized() {
        if (Sprite_sheet) {
            return true;
        } else {
            return false;;
        }
    };

    /*
    * From a requested drawing `position`, get where the sprite should be drawn.
    * Return the upper left corner of the sprite, when the `position` indicates the position of the bottom-middle.
    * */
    function convertPositionToSprite(position) {
        let x = position.x - obj_Sprite.sheetCellWidth / 2.0;
        let y = position.y - obj_Sprite.sheetCellHeight;
        return { x: x, y: y };
    }

    obj_Sprite.draw = function Sprite_draw(context, position) {
        if (obj_Sprite.isInitialized()) {
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
        if (obj_Sprite.isInitialized()) {
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

export const BackgroundResource = (function newBackground() {
    // the object we are building
    const obj_Background = {
        name: "background"
    };

    let Background_sheet, Background_data, Background_image;

    obj_Background.init = function Background_init(initOptions) {
        obj_Background.sheetCellWidth = initOptions.sheetCellWidth;
        obj_Background.sheetCellHeight = initOptions.sheetCellHeight;
        return utils.Http.Request({
            url: initOptions.mapUrl,
        })
            .then(function gotBackgroundFile(data) {
                let json_obj = JSON.parse(data.responseText);
                Background_data = json_obj.map;
            })
            .then(function loadSheetImage() {
                return ImageLoader.get(initOptions.sheetSrc)
                    .then(function sheetImageLoaded(image) {
                        Background_sheet = image;
                        generateMap();
                    });
            });

    };

    function generateMap() {
        let [canvas, context] = createScaledCanvas(View.screenWidth, View.screenHeight, View.scale);

        for (let rowIndex = 0, destinationY = 0; rowIndex < Background_data.length; rowIndex++, destinationY += obj_Background.sheetCellHeight) {
            const row = Background_data[rowIndex];
            const upRow = Background_data[rowIndex - 1];
            let upBit = 1;
            const downRow = Background_data[rowIndex + 1];
            let downBit = 1;
            for (let columnIndex = 0, destinationX = 0; columnIndex < row.length; columnIndex++, destinationX += obj_Background.sheetCellWidth) {
                const mapValue = row[columnIndex];
                let tileCode10;
                let leftBit = row[columnIndex - 1];
                let rightBit = row[columnIndex + 1];
                if (leftBit == undefined) {
                    leftBit = 1;
                }
                if (rightBit == undefined) {
                    rightBit = 1;
                }
                if (upRow != undefined) {
                    upBit = upRow[columnIndex];
                }
                if (downRow != undefined) {
                    downBit = downRow[columnIndex];
                }
                if (mapValue == 1) {
                    tileCode10 = 1 * leftBit + 2 * downBit + 4 * rightBit + 8 * upBit;
                } else if (mapValue == 0) {
                    tileCode10 = 16;
                }
                let sourceX = tileCode10 * obj_Background.sheetCellWidth;
                context.drawImage(Background_sheet,
                    sourceX, 0,
                    obj_Background.sheetCellWidth, obj_Background.sheetCellHeight,
                    destinationX, destinationY,
                    obj_Background.sheetCellWidth, obj_Background.sheetCellHeight);
            }
        }
        let imageUri = canvas.toDataURL();
        Background_image = new Image();
        Background_image.src = imageUri;
    };

    obj_Background.isInitialized = function Background_isInitialized() {
        if (Background_image) {
            return true;
        } else {
            return false;;
        }
    };

    obj_Background.draw = function Background_draw(context, position) {
        if (obj_Background.isInitialized()) {
            context.drawImage(Background_image, 0, 0);
        } else {
            // map not generated yet
        }
    };

    obj_Background.update = function Background_update() {
        // do nothing
    };

    return obj_Background;
})();

export function init(ecs) {
    ecs.Controller.addInitSystem(View.init, {
        width: 960,
        height: 576,
        scale: 3.0,
    });

    ecs.Data.addResource(BackgroundResource,
        {
            mapUrl: "www/levelmap.json",
            sheetSrc: "assets/terrain_sheet.png",
            sheetCellWidth: 16,
            sheetCellHeight: 16,
        }
    );

    ecs.Controller.addSystem({
        queryResources: ["background"],
        run: function clearBackground(background) {
            View.render(background, { x: 0, y: 0 });
        },
    },
        ecs.SYSTEM_STAGE.END);

    ecs.Controller.addSystem({
        queryResources: ["time"],
        queryComponents: ["sprite"],
        run: function updateAnimation(time, sprite) {
            sprite.updateAnimation(time.dt);
        },
    },
        ecs.SYSTEM_STAGE.END);

    ecs.Controller.addSystem({
        queryComponents: ["sprite", "position"],
        run: function drawSprite(sprite, position) {
            View.render(sprite, position);
        }
    },
        ecs.SYSTEM_STAGE.END);
}
