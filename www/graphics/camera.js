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

    obj_Camera.init = function Camera_init(pixelCanvas, levelgrid) {
        return new Promise(function promise_Camera_init(resolve, reject) {
            obj_Camera.screenWidth = Camera_initOptions.screenWidth;
            obj_Camera.screenHeight = obj_Camera.screenWidth * 1.0 / Camera_initOptions.aspectRatio;
            obj_Camera.scale = pixelCanvas.scale;
            obj_Camera.gameHeight = (1.0 * obj_Camera.screenHeight) / obj_Camera.scale;
            obj_Camera.gameWidth = (1.0 * obj_Camera.screenWidth) / obj_Camera.scale;
            if (levelgrid.width < obj_Camera.gameWidth) {
                /// Level not wide enough to fill the Camera
                obj_Camera.gameWidth = levelgrid.width;
                obj_Camera.screenWidth = obj_Camera.gameWidth * obj_Camera.scale;
            }
            if (levelgrid.height < obj_Camera.gameHeight) {
                /// Level not high enough to fill the Camera
                obj_Camera.gameHeight = levelgrid.height;
                obj_Camera.screenHeight = obj_Camera.gameHeight * obj_Camera.scale;
            }
            Utils.debug("camera height", obj_Camera.screenHeight);
            
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
        Camera_context.clearRect(0, 0, Camera_canvas.width, Camera_canvas.height);
    };

    /*
    * Render all this sprite now
    */
    obj_Camera.render = function Camera_render(sprite, gamePosition) {
        let screenPosition = gameToScreenPosition(gamePosition);
        sprite.draw(Camera_context, screenPosition);
    };

    obj_Camera.setTarget = function Camera_setTarget(gamePosition) {
        Camera_target.x = gamePosition.x;
        Camera_target.y = gamePosition.y;
    };

    /*
    *   Snap Camera to the edges of the level, so that we don't see outside the level map
    */
    obj_Camera.snapTargetToEdges = function Camera_snapTargetToEdges(levelgrid) {
        let targetLeftEdge = Camera_target.x - obj_Camera.gameWidth / 2.0;
        let targetRightEdge = Camera_target.x + obj_Camera.gameWidth / 2.0;
        let targetTopEdge = Camera_target.y - obj_Camera.gameHeight / 2.0;
        let targetBottomEdge = Camera_target.y + obj_Camera.gameHeight / 2.0;
        let levelLeftEdge = 0;
        let levelRightEdge = levelgrid.width;
        let levelTopEdge = 0;
        let levelBottomEdge = levelgrid.height;
        if (targetLeftEdge < levelLeftEdge) {
            //Utils.debug("snap Camera LEFT");
            Camera_target.x = levelLeftEdge + obj_Camera.gameWidth / 2.0;
        }
        if (targetRightEdge > levelRightEdge) {
            //Utils.debug("snap Camera RIGHT");
            Camera_target.x = levelRightEdge - obj_Camera.gameWidth / 2.0;
        }
        if (targetTopEdge < levelTopEdge) {
            //Utils.debug("snap Camera UP");
            Camera_target.y = levelTopEdge + obj_Camera.gameHeight / 2.0;
        }
        if (targetBottomEdge > levelBottomEdge) {
            //Utils.debug("snap Camera BOTTOM");
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

    function gameToScreenPosition(gamePosition) {
        let cameraTopLeftX = Camera_gameCenter.x - obj_Camera.gameWidth / 2.0;
        let cameraTopLeftY = Camera_gameCenter.y - obj_Camera.gameHeight / 2.0;
        return {
            x: (gamePosition.x - cameraTopLeftX),
            y: (gamePosition.y - cameraTopLeftY),
        };
    }

    return obj_Camera;
})();

const System_moveCamera = {
    resourceQuery: ["camera", "time", "levelgrid"],
    componentQueries: {
        player: ["position", "tagPlayer"],
    },
    run: function moveCamera(queryResults) {
        let camera = queryResults.resources.camera;
        let time = queryResults.resources.time;
        let levelgrid = queryResults.resources.levelgrid;
        for (let e of queryResults.components.player) {
            camera.setTarget(e.position);
            camera.snapTargetToEdges(levelgrid);
            camera.updateAnimation(time.dt);
        }
    },
};

export function init(ecs) {
    ecs.Data.addResource(Resource_PixelCanvas,
        {
            scale: 4.0,
        },
        0, // higher priority than Camera
    );

    let windowWidth = window.innerWidth - 50;
    ecs.Data.addResource(Resource_Camera,
        {
            initQueryResources: ["pixelCanvas", "levelgrid"],
            screenWidth: windowWidth,
            aspectRatio: 4.0 / 3.0,
            deadzoneSize: {
                width: 10,
                height: 10,
            },
            animationSmoothness: 10,
        },
        2, // higher priority than LevelSprite, lower than PixelCanvas and LevelGrid
    );

    ecs.Controller.addSystem(System_moveCamera);
}
