
/*
* a canvas correctly scaled for pixel art
*/
const PixelCanvas = (function build_PixelCanvas() {
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


const Camera = (function build_Camera() {
    const obj_Camera = {
        name: "camera",
    };
    let Camera_canvas, Camera_context, Camera_initOptions;
    let Camera_gameCenter;

    obj_Camera.prepareInit = function Camera_prepareInit(initOptions) {
        Camera_initOptions = initOptions || {};
        obj_Camera.initQueryResources = initOptions.initQueryResources;
    };

    obj_Camera.init = function Camera_init(pixelCanvas) {
        return new Promise(function promise_Camera_init(resolve, reject) {
            obj_Camera.screenWidth = Camera_initOptions.screenWidth;
            obj_Camera.screenHeight = Camera_initOptions.screenHeight;
            obj_Camera.scale = pixelCanvas.scale;
            [Camera_canvas, Camera_context] = pixelCanvas.new(obj_Camera.screenWidth, obj_Camera.screenHeight);
            let parentId = Camera_initOptions.parentId || "game";
            const elParent = document.getElementById(parentId);
            elParent.appendChild(Camera_canvas);

            obj_Camera.gameHeight = (1.0 * obj_Camera.screenHeight) / obj_Camera.scale;
            obj_Camera.gameWidth = (1.0 * obj_Camera.screenWidth) / obj_Camera.scale;
            Camera_gameCenter = Camera_initOptions.gameCenter || { x: 0, y: 0 };

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
        Camera_gameCenter.x = gamePosition.x;
        Camera_gameCenter.y = gamePosition.y;
    };

    function gameToScreenPosition(gamePosition) {
        let cameraTopLeftX = Camera_gameCenter.x - obj_Camera.gameWidth / 2.0;
        let cameraTopLeftY = Camera_gameCenter.y - obj_Camera.gameHeight / 2.0;
        return {
            x: (gamePosition.x - cameraTopLeftX),// * obj_Camera.scale,
            y: (gamePosition.y - cameraTopLeftY),// * obj_Camera.scale,
        };
    }

    return obj_Camera;
})();

export function init(ecs) {
    ecs.Data.addResource(PixelCanvas,
        {
            scale: 4.0,
        },
        0, // higher priority than Camera
    );

    ecs.Data.addResource(Camera,
        {
            initQueryResources: ["pixelCanvas"],
            screenWidth: 1280,
            screenHeight: 768,
        },
        1, // higher priority than LevelSprite, lower than PixelCanvas
    );
    
    ecs.Controller.addSystem({
        resourceQuery: ["camera"],
        componentQueries: {
            player: ["position", "tagPlayer"],
        },
        run: function moveCamera(queryResults) {
            let camera = queryResults.resources.camera;
            for (let e of queryResults.components.player) {
                camera.setTarget(e.position);
            }
        },
    });
}
