import * as Utils from "../utils.js";

/*
* a canvas correctly scaled for pixel art
*/
const Resource_PixelCanvas = (function build_PixelCanvas() {
    const obj_PixelCanvas = {
        name: "pixelCanvas",
    };

    let PixelCanvas_initOptions;

    obj_PixelCanvas.prepareInit = function PixelCanvas_prepareInit(initOptions) {
        PixelCanvas_initOptions = initOptions || {};
    };

    obj_PixelCanvas.init = function PixelCanvas_init() {
        obj_PixelCanvas.scale = PixelCanvas_initOptions.scale;
    };

    /*
    * return a [canvas, context] correctly scaled for pixel art
    */
    obj_PixelCanvas.new = function createScaledCanvas(screenWidth, screenHeight) {
        let canvas = document.createElement("canvas");
        let unscaledWidth = screenWidth / obj_PixelCanvas.scale;
        let unscaledHeight = screenHeight / obj_PixelCanvas.scale;
        canvas.width = unscaledWidth;
        canvas.style.width = screenWidth + "px";
        canvas.height = unscaledHeight;
        canvas.style.height = screenHeight + "px";
        let context = canvas.getContext('2d');
        // important for pixel art style : no smoothing when scaling or animating
        context.imageSmoothingEnabled = false;
        return [canvas, context];
    };

    /*
    * return a [canvas, context] correctly scaled for pixel art
    * call with a size in "small pixels"
    */
    obj_PixelCanvas.newUnscaled = function createUnscaledCanvas(screenWidth, screenHeight) {
        return obj_PixelCanvas.new(screenWidth * obj_PixelCanvas.scale, screenHeight * obj_PixelCanvas.scale);
    };

    return obj_PixelCanvas;
})();


const Resource_Camera = (function build_Camera() {
    const obj_Camera = {
        name: "camera",
    };
    let Camera_canvas, Camera_context, Camera_initOptions;
    let Camera_gameCenter;
    let Camera_target, Camera_animationSmoothness;

    obj_Camera.prepareInit = function Camera_prepareInit(initOptions) {
        Camera_initOptions = initOptions || {};
        obj_Camera.initQueryResources = initOptions.initQueryResources;
    };

    obj_Camera.init = function Camera_init(queryResults) {
        const pixelCanvas = queryResults.resources.pixelCanvas;
        const levelGrid = queryResults.resources.levelGrid;
        return new Promise(function promise_Camera_init(resolve, reject) {
            obj_Camera.backgroundColor = Camera_initOptions.backgroundColor;
            /// Calculate viewport height based on screen width
            obj_Camera.screenWidth = Camera_initOptions.screenWidth;
            obj_Camera.screenHeight = obj_Camera.screenWidth * 1.0 / Camera_initOptions.aspectRatio;
            if (obj_Camera.screenHeight > Camera_initOptions.screenHeight) {
                /// Because of fixed ratio, viewport is now too high and will require a scrollbar
                /// Instead, Calculate viewport width based on screen height
                obj_Camera.screenHeight = Camera_initOptions.screenHeight;
                obj_Camera.screenWidth = obj_Camera.screenHeight * Camera_initOptions.aspectRatio;
            }
            // The scaling factor between original images and how they are displayed on screen to show off pixel art
            obj_Camera.scale = pixelCanvas.scale;
            obj_Camera.gameHeight = (1.0 * obj_Camera.screenHeight) / obj_Camera.scale;
            obj_Camera.gameWidth = (1.0 * obj_Camera.screenWidth) / obj_Camera.scale;
            if (levelGrid.width < obj_Camera.gameWidth) {
                /// Level not wide enough to fill the Camera
                obj_Camera.gameWidth = levelGrid.width;
                obj_Camera.screenWidth = obj_Camera.gameWidth * obj_Camera.scale;
            }
            if (levelGrid.height < obj_Camera.gameHeight) {
                /// Level not high enough to fill the Camera
                obj_Camera.gameHeight = levelGrid.height;
                obj_Camera.screenHeight = obj_Camera.gameHeight * obj_Camera.scale;
            }

            [Camera_canvas, Camera_context] = pixelCanvas.new(obj_Camera.screenWidth, obj_Camera.screenHeight);
            let parentId = Camera_initOptions.parentId || "game";
            const elParent = document.getElementById(parentId);
            elParent.appendChild(Camera_canvas);


            obj_Camera.deadzoneSize = Camera_initOptions.deadzoneSize;
            Camera_gameCenter = Camera_initOptions.gameCenter || { x: obj_Camera.gameWidth / 2, y: obj_Camera.gameHeight / 2 };
            Camera_target = Camera_initOptions.target || { x: 0, y: 0 };
            Camera_animationSmoothness = Camera_initOptions.animationSmoothness || 20;
            resolve();
        });
    };

    /*
    * Clear screen for drawing next
    */
    obj_Camera.clear = function Camera_clear() {
        Camera_context.fillStyle = obj_Camera.backgroundColor;
        Camera_context.fillRect(0, 0, Camera_canvas.width, Camera_canvas.height);
    };

    /*
    * Render all this sprite now
    */
    obj_Camera.render = function Camera_render(sprite, gamePosition) {
        let cameraPosition = gameToCameraPosition(gamePosition);
        sprite.draw(Camera_context, cameraPosition);
    };

    obj_Camera.setTarget = function Camera_setTarget(gamePosition) {
        Camera_target.x = gamePosition.x;
        Camera_target.y = gamePosition.y;
    };

    /*
    *   Snap Camera to the edges of the level, so that we don't see outside the level map
    */
    obj_Camera.snapTargetToEdges = function Camera_snapTargetToEdges(levelGrid) {
        let targetLeftEdge = Camera_target.x - obj_Camera.gameWidth / 2.0;
        let targetRightEdge = Camera_target.x + obj_Camera.gameWidth / 2.0;
        let targetTopEdge = Camera_target.y - obj_Camera.gameHeight / 2.0;
        let targetBottomEdge = Camera_target.y + obj_Camera.gameHeight / 2.0;
        let levelLeftEdge = 0;
        let levelRightEdge = levelGrid.width;
        let levelTopEdge = 0;
        let levelBottomEdge = levelGrid.height;
        if (targetLeftEdge < levelLeftEdge) {
            /// snap Camera LEFT
            Camera_target.x = levelLeftEdge + obj_Camera.gameWidth / 2.0;
        }
        if (targetRightEdge > levelRightEdge) {
            /// snap Camera RIGHT
            Camera_target.x = levelRightEdge - obj_Camera.gameWidth / 2.0;
        }
        if (targetTopEdge < levelTopEdge) {
            /// snap Camera UP
            Camera_target.y = levelTopEdge + obj_Camera.gameHeight / 2.0;
        }
        if (targetBottomEdge > levelBottomEdge) {
            /// snap Camera BOTTOM
            Camera_target.y = levelBottomEdge - obj_Camera.gameHeight / 2.0;
        }
    }

    obj_Camera.forceMove = function Camera_forceMove() {
        Camera_gameCenter.x = Camera_target.x;
        Camera_gameCenter.y = Camera_target.y;
    }

    /*
    * update animation for Camera movement
    */
    obj_Camera.updateAnimation = function Camera_updateAnimation(timePassed) {
        if (isTargetOutsideDeadzone()) {
            /// Weighted average between current Camera position at `Camera_gameCenter` and target position at `Camera_target`.
            /// The weight of the current position is the smoothness `Camera_animationSmoothness`.
            Camera_gameCenter.x = (Camera_gameCenter.x * Camera_animationSmoothness + Camera_target.x) / (Camera_animationSmoothness + 1);
            Camera_gameCenter.y = (Camera_gameCenter.y * Camera_animationSmoothness + Camera_target.y) / (Camera_animationSmoothness + 1);
        }
    };

    function isTargetOutsideDeadzone() {
        if (Camera_target.x >= Camera_gameCenter.x + obj_Camera.deadzoneSize.width / 2
            || Camera_target.x <= Camera_gameCenter.x - obj_Camera.deadzoneSize.width / 2
            || Camera_target.y >= Camera_gameCenter.y + obj_Camera.deadzoneSize.height / 2
            || Camera_target.y <= Camera_gameCenter.y - obj_Camera.deadzoneSize.height / 2) {
            return true;
        } else {
            return false;
        }
    }

    /*
    *   Convert from pixels in the world coordinates `gamePosition` to pixels in the camera coordinates.
    *   Dealing with unscaled pixels (original pixel art pixels).
    */
    function gameToCameraPosition(gamePosition) {
        let cameraTopLeftX = Camera_gameCenter.x - obj_Camera.gameWidth / 2.0;
        let cameraTopLeftY = Camera_gameCenter.y - obj_Camera.gameHeight / 2.0;
        /// Use Z position to calculate parallax
        /// Assume that at {x:0,y:0} all Z depth are aligned
        let parallax;
        if (gamePosition.z == undefined || gamePosition.z < 0.0) {
            parallax = 1.0;
        } else {
            parallax = 1.0 / (1.0 + gamePosition.z);
        }
        let convertedPositionX = parallax * (gamePosition.x - cameraTopLeftX);
        let convertedPositionY = parallax * (gamePosition.y - cameraTopLeftY);
        return {
            x: convertedPositionX,
            y: convertedPositionY,
        };
    }

    return obj_Camera;
})();

const System_moveCamera = {
    name: "moveCamera",
    resourceQuery: ["camera", "time", "levelGrid"],
    componentQueries: {
        player: ["position", "tagPlayer"],
    },
    run: function moveCamera(queryResults) {
        let camera = queryResults.resources.camera;
        let time = queryResults.resources.time;
        let levelGrid = queryResults.resources.levelGrid;
        for (let e of queryResults.components.player) {
            camera.setTarget(e.position);
            camera.snapTargetToEdges(levelGrid);
            camera.updateAnimation(time.dt);
        }
    },
};

export function init(ecs) {
    ecs.Data.registerResource(Resource_PixelCanvas);
    ecs.Data.registerResource(Resource_Camera);
    ecs.Data.registerSystem(System_moveCamera);
}
