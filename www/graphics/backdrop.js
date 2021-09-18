import * as Utils from "../utils.js";
import * as Physics from "../game/physics.js";
import * as Sprites from "../graphics/sprite.js";

/*
* A level background image
*/
const newComponent_Backdrop = function newComponent_Backdrop(initOptions) {
    // the object we are building
    const obj_Backdrop = {
        name: "backdrop",
    };
    let Backdrop_sheetImage;
    let Backdrop_animationDirection, Backdrop_frameTime, Backdrop_frameIndex;

    obj_Backdrop.init = async function Backdrop_init(levelGrid, pixelCanvas) {
        obj_Backdrop.width = levelGrid.width;
        obj_Backdrop.sheetSrc = initOptions.sheetSrc;
        obj_Backdrop.sheetConfigUrl = initOptions.sheetConfigUrl;
        const data = await Utils.Http.Request({
            url: obj_Backdrop.sheetConfigUrl,
        });
        obj_Backdrop.sheetConfig = JSON.parse(data.responseText);
        obj_Backdrop.sheetCellWidth = obj_Backdrop.sheetConfig.cellWidth;
        obj_Backdrop.sheetCellHeight = obj_Backdrop.sheetConfig.cellHeight;
        Backdrop_sheetImage = await Utils.File.ImageLoader.get(obj_Backdrop.sheetSrc);
        // finally we have map data and a sprite sheet
        return await generateBackdropAnimation(pixelCanvas);
    };

    async function generateBackdropAnimation(pixelCanvas) {
        obj_Backdrop.frames = [];
        obj_Backdrop.frameDuration = obj_Backdrop.sheetConfig.animation.frameDuration;
        obj_Backdrop.animationLength = obj_Backdrop.sheetConfig.animation.length;
        obj_Backdrop.animationType = obj_Backdrop.sheetConfig.animation.type;
        Backdrop_frameTime = 0;
        switch (obj_Backdrop.animationType) {
            case Sprites.ANIMATION_TYPE.FORWARD:
            case Sprites.ANIMATION_TYPE.PINGPONG:
                Backdrop_frameIndex = 0;
                Backdrop_animationDirection = Sprites.ANIMATION_DIRECTION.FORWARD;
            case Sprites.ANIMATION_TYPE.REVERSE:
                // last frame
                Backdrop_frameIndex = obj_Backdrop.animationLength - 1;
                Backdrop_animationDirection = Sprites.ANIMATION_DIRECTION.BACKWARD;
                break;
            case Sprites.ANIMATION_TYPE.NONE:
                Backdrop_frameIndex = 0;
                Backdrop_animationDirection = Sprites.ANIMATION_DIRECTION.STOPPED;
                break;
        }
        const sourceY = 0;
        const framePromises = [];
        for (let sourceX = 0, frameIndex = 0; frameIndex < obj_Backdrop.animationLength; sourceX += obj_Backdrop.sheetCellWidth, frameIndex++) {
            framePromises.push(
                generatePatternImage(pixelCanvas, sourceX, sourceY).then(function addFrameImage(imageRepeat) {
                    obj_Backdrop.frames[frameIndex] = imageRepeat;
                })
            );
        }
        await Promise.all(framePromises);
        obj_Backdrop.frameImage = obj_Backdrop.frames[Backdrop_frameIndex];
    }
    /*
    * Generate the background image from individual tile
    */
    function generatePatternImage(pixelCanvas, sourceX, sourceY) {
        return new Promise(function promiseSingleBackdropImage(resolve, reject) {
            // create a new canvas for getting the base image of the backdrop
            let [singleCanvas, singleContext] = pixelCanvas.newUnscaled(obj_Backdrop.sheetCellWidth, obj_Backdrop.sheetCellHeight);
            singleContext.drawImage(Backdrop_sheetImage,
                sourceX,
                sourceY,
                obj_Backdrop.sheetCellWidth,
                obj_Backdrop.sheetCellHeight,
                0,
                0,
                obj_Backdrop.sheetCellWidth,
                obj_Backdrop.sheetCellHeight
            );
            /// Export the single image to a separate image
            let imageSingleUri = singleCanvas.toDataURL();
            const imageSingle = new Image();
            imageSingle.addEventListener("load", function onloadImage() {
                resolve(imageSingle);
            });
            imageSingle.addEventListener("error", function onerrorImage() {
                console.warn("image load error");
                reject();
            });
            imageSingle.src = imageSingleUri;
        }).then(function gotSingleBackdropImage(imageSingle) {
            return new Promise(function promiseRepeatBackdropImage(resolve, reject) {
                /// TODO : wait later to draw the repeating pattern only with the requested camera width and position
                /// create a new canvas for compositing a repeating layer based on the single image
                let [repeatCanvas, repeatContext] = pixelCanvas.newUnscaled(obj_Backdrop.width, obj_Backdrop.sheetCellHeight);
                // easy debug // document.getElementById("hiddenloading").appendChild(repeatCanvas);
                /// Draw
                let pattern = repeatContext.createPattern(imageSingle, obj_Backdrop.sheetConfig.pattern.repetition);
                repeatContext.rect(0, 0, repeatCanvas.width, repeatCanvas.height);
                repeatContext.fillStyle = pattern;
                repeatContext.fill();
                /// Export to image
                let imageRepeatUri = repeatCanvas.toDataURL();
                const imageRepeat = new Image();
                imageRepeat.addEventListener("load", function onloadImage() {
                    resolve(imageRepeat);
                });
                imageRepeat.addEventListener("error", function onerrorImage() {
                    console.warn("image load error");
                    reject();
                });
                imageRepeat.src = imageRepeatUri;
            })
        });

    };

    obj_Backdrop.draw = function Backdrop_draw(context, position) {
        context.drawImage(obj_Backdrop.frameImage, position.x, position.y);
    };


    /*
    * update animation frame time, change frame, change animation direction if necessary
    */
    obj_Backdrop.updateAnimation = function Backdrop_updateAnimation(timePassed) {
        if (Backdrop_animationDirection != Sprites.ANIMATION_DIRECTION.STOPPED) {
            Backdrop_frameTime += timePassed;
            while (Backdrop_frameTime > obj_Backdrop.frameDuration) {
                nextFrame();
                obj_Backdrop.frameImage = obj_Backdrop.frames[Backdrop_frameIndex];
                Backdrop_frameTime -= obj_Backdrop.frameDuration;
            }
        }
    };

    /*
    * move animation to next frame, change animation direction if necessary
    */
    function nextFrame() {
        Backdrop_frameIndex += Backdrop_animationDirection;
        if (Backdrop_frameIndex >= obj_Backdrop.animationLength || Backdrop_frameIndex < 0) {
            switch (obj_Backdrop.animationType) {
                case Sprites.ANIMATION_TYPE.FORWARD:
                case Sprites.ANIMATION_TYPE.BACKWARD:
                    Backdrop_frameIndex = (Backdrop_frameIndex + obj_Backdrop.animationLength) % obj_Backdrop.animationLength;
                    break;
                case Sprites.ANIMATION_TYPE.PINGPONG:
                    Backdrop_animationDirection = -Backdrop_animationDirection;
                    Backdrop_frameIndex += Backdrop_animationDirection;
                    break;
                default:
                    console.warn("unexpected case");
                    break;
            }
        }
    };


    return obj_Backdrop;
};

const layersSheetOptions = [
    {  // top
        sheetOptions: {
            sheetSrc: "assets/backgroundhell1top_sheet.png",
            sheetConfigUrl: "assets/backgroundhell1top_sheet.json",
        },
        gamePosition: {
            x: 0,
            y: -80,
            z: 1,
        },
    },
    {  // back 1
        sheetOptions: {
            sheetSrc: "assets/backgroundhell2back_sheet.png",
            sheetConfigUrl: "assets/backgroundhell2back_sheet.json",
        },
        gamePosition: {
            x: 0,
            y: 180,
            z: 5,
        },
    },
    {  // back 2
        sheetOptions: {
            sheetSrc: "assets/backgroundhell3back_sheet.png",
            sheetConfigUrl: "assets/backgroundhell3back_sheet.json",
        },
        gamePosition: {
            x: 0,
            y: 250,
            z: 2,
        },
    },
    {  // bottom
        sheetOptions: {
            sheetSrc: "assets/backgroundhell4bot_sheet.png",
            sheetConfigUrl: "assets/backgroundhell4bot_sheet.json",
        },
        gamePosition: {
            x: 0,
            y: 250,
            z: 0.3,
        },
    },
];

function spawnNewBackdrop(engine, layerOptions, levelGrid, pixelCanvas) {
    const backdrop = newComponent_Backdrop(layerOptions.sheetOptions);
    return backdrop.init(levelGrid, pixelCanvas)
        .then(function backdropInitialized() {
            return engine.spawn()
                .addComponent(backdrop)
                .addComponent(Physics.newComponent_Position(layerOptions.gamePosition));
        })
}

const System_initBackdrops = {
    name: "initBackdrops",
    resourceQuery: ["levelGrid", "pixelCanvas"],
    run: function initBackdrops(queryResults) {
        const engine = queryResults.engine;
        const levelGrid = queryResults.resources.levelGrid;
        const pixelCanvas = queryResults.resources.pixelCanvas;
        for (const layerOptions of layersSheetOptions) {
            spawnNewBackdrop(engine, layerOptions, levelGrid, pixelCanvas);
        }
    },
};

export function init(engine) {
    engine.registerSystem(System_initBackdrops);
}
