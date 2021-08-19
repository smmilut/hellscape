export const View = (function build_View() {
    const obj_View = {};
    let View_canvas, View_context;
    let View_isDirtyQueue;
    let View_renderQueue = [];

    obj_View.init = function View_init(initOptions) {
        //#region start init HTML
        let parentId = initOptions.parentId || "game";
        const elParent = document.getElementById(parentId);
        View_canvas = document.createElement("canvas");
        //#endregion
        //#region set up canvas-level scaling (for bigger pixels)
        let screenWidth = initOptions.width;
        let screenHeight = initOptions.height;
        let unscaledWidth = screenWidth / initOptions.scale;
        let unscaledHeight = screenHeight / initOptions.scale;
        View_canvas.width = unscaledWidth;
        View_canvas.style.width = screenWidth + "px";
        View_canvas.height = unscaledHeight;
        View_canvas.style.height = screenHeight + "px";
        View_context = View_canvas.getContext('2d');
        View_context.imageSmoothingEnabled = false;
        elParent.appendChild(View_canvas);
        View_isDirtyQueue = true;
    };

    /*
    * Add graphics to render queue
    */
    obj_View.queueRendering = function View_queueRendering(graphics) {
        View_renderQueue.push(graphics);
        View_isDirtyQueue = true;
    };

    /*
    * Remove `graphics` from render queue
    */
    obj_View.unqueueRendering = function View_unqueueRendering(searchedGraphics) {
        const graphicsIndex = View_renderQueue.indexOf(searchedGraphics);
        if (graphicsIndex > -1) {
            View_renderQueue.splice(graphicsIndex, 1);
        }
    };

    /*
    * Clear screen for drawing next
    */
    obj_View.clear = function View_clear() {
        View_context.clearRect(0, 0, View_canvas.width, View_canvas.height);
    };

    /*
    * Render all render queue now
    */
    obj_View.render = function View_render(time, sprite, position) {
        sprite.updateAnimation(time.dt);
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
                for (let sourceX = 0, frameIndex = 0; frameIndex < rowOptions.animationLength ; sourceX += obj_Sprite.sheetCellWidth, frameIndex++) {
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
            console.log("sprite not loaded yet");
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

export function init(ecs) {
    ecs.Controller.addInitSystem(View.init, {
        width: 960,
        height: 576,
        scale: 3.0,
    });

    ecs.Controller.addSystem({
        run: View.clear,
    },
        ecs.SYSTEM_STAGE.END);

    ecs.Controller.addSystem({
        queryResources: ["time"],
        queryComponents: ["sprite", "position"],
        run: View.render,
    },
        ecs.SYSTEM_STAGE.END);
}
