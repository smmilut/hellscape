import * as Utils from "../utils.js";
import * as Physics from "../game/physics.js";

/*
* A level background image
*/
const newComponent_Backdrop = function newComponent_Backdrop(initOptions) {
    // the object we are building
    const obj_Backdrop = initOptions;
    obj_Backdrop.name = "backdrop";

    obj_Backdrop.init = async function Backdrop_init(levelGrid, pixelCanvas) {
        const image = await Utils.File.ImageLoader.get(obj_Backdrop.sheetSrc);
        // finally we have map data and a sprite sheet
        return await generateBackdropImage(levelGrid, pixelCanvas, image);
    };
    /*
    * Generate the background image from individual tile
    */
    function generateBackdropImage(levelGrid, pixelCanvas, spriteSheet) {
        let levelWidth = levelGrid.width;
        return new Promise(function promiseSingleBackdropImage(resolve, reject) {
            // create a new canvas for getting the base image of the backdrop
            let [singleCanvas, singleContext] = pixelCanvas.newUnscaled(obj_Backdrop.sourceWidth, obj_Backdrop.sourceHeight);
            singleContext.drawImage(spriteSheet,
                obj_Backdrop.sourceX,
                obj_Backdrop.sourceY,
                obj_Backdrop.sourceWidth,
                obj_Backdrop.sourceHeight,
                0,
                0,
                obj_Backdrop.sourceWidth,
                obj_Backdrop.sourceHeight
            );
            /// Export the single image to a separate image
            let imageSingleUri = singleCanvas.toDataURL();
            obj_Backdrop.imageSingle = new Image();
            obj_Backdrop.imageSingle.addEventListener("load", function onloadImage() {
                resolve(this);
            });
            obj_Backdrop.imageSingle.addEventListener("error", function onerrorImage() {
                console.warn("image load error");
                reject();
            });
            obj_Backdrop.imageSingle.src = imageSingleUri;
        }).then(function gotSingleBackdropImage(_imageSingle) {
            return new Promise(function promiseRepeatBackdropImage(resolve, reject) {
                /// TODO : wait later to draw the repeating pattern only with the requested camera width and position
                /// create a new canvas for compositing a repeating layer based on the single image
                let [repeatCanvas, repeatContext] = pixelCanvas.newUnscaled(levelWidth, obj_Backdrop.sourceHeight);
                // easy debug // document.getElementById("hiddenloading").appendChild(repeatCanvas);
                /// Draw
                let pattern = repeatContext.createPattern(obj_Backdrop.imageSingle, "repeat-x");
                repeatContext.rect(0, 0, repeatCanvas.width, repeatCanvas.height);
                repeatContext.fillStyle = pattern;
                repeatContext.fill();
                /// Export to image
                let imageRepeatUri = repeatCanvas.toDataURL();
                obj_Backdrop.imageRepeat = new Image();
                obj_Backdrop.imageRepeat.addEventListener("load", function onloadImage() {
                    resolve(this);
                });
                obj_Backdrop.imageRepeat.addEventListener("error", function onerrorImage() {
                    console.warn("image load error");
                    reject();
                });
                obj_Backdrop.imageRepeat.src = imageRepeatUri;
                resolve(obj_Backdrop);
            })
        });

    };

    obj_Backdrop.draw = function LevelSprite_draw(context, position) {
        context.drawImage(obj_Backdrop.imageRepeat, position.x, position.y);
    };

    return obj_Backdrop;
};

const layersSheetOptions = [
    {  // back 1
        sheetOptions: {
            sheetSrc: "assets/backdrop_sheet.png",
            theme: "hellplatform",
            sourceX: 0,
            sourceY: 71,
            sourceWidth: 64,
            sourceHeight: 38,
        },
        gamePosition: {
            x: 0,
            y: 200,
            z: 5,
        },
    },
    {  // back 2
        sheetOptions: {
            sheetSrc: "assets/backdrop_sheet.png",
            theme: "hellplatform",
            sourceX: 0,
            sourceY: 109,
            sourceWidth: 64,
            sourceHeight: 41,
        },
        gamePosition: {
            x: 0,
            y: 250,
            z: 2,
        },
    },
    {  // top
        sheetOptions: {
            sheetSrc: "assets/backdrop_sheet.png",
            theme: "hellplatform",
            sourceX: 0,
            sourceY: 0,
            sourceWidth: 64,
            sourceHeight: 71,
        },
        gamePosition: {
            x: 0,
            y: 0,
            z: 1,
        },
    },
    {  // bottom
        sheetOptions: {
            sheetSrc: "assets/backdrop_sheet.png",
            theme: "hellplatform",
            sourceX: 0,
            sourceY: 150,
            sourceWidth: 64,
            sourceHeight: 43,
        },
        gamePosition: {
            x: 0,
            y: 250,
            z: 0.3,
        },
    },
];

function spawnNewBackdrop(ecs, layerOptions, levelgrid, pixelCanvas) {
    const backdrop = newComponent_Backdrop(layerOptions.sheetOptions);
    return backdrop.init(levelgrid, pixelCanvas)
        .then(function backdropInitialized() {
            return ecs.Data.newEntity()
                .addComponent(backdrop)
                .addComponent(Physics.newComponent_Position(layerOptions.gamePosition));
        })
}

const System_initBackdrops = {
    resourceQuery: ["levelgrid", "pixelCanvas"],
    run: function initBackdrops(queryResults) {
        const ecs = queryResults.ecs;
        const levelgrid = queryResults.resources.levelgrid;
        const pixelCanvas = queryResults.resources.pixelCanvas;
        for (const layerOptions of layersSheetOptions) {
            spawnNewBackdrop(ecs, layerOptions, levelgrid, pixelCanvas);
        }
    },
};

export function init(ecs) {
    ecs.Controller.addSystem(System_initBackdrops, ecs.SYSTEM_STAGE.INIT);
}
