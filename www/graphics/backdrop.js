import * as Utils from "../utils.js";
import * as Physics from "../game/physics.js";
import * as Sprites from "../graphics/sprite.js";


/*
* A level background image
*/
const Backdrop = {
    name: "backdrop",
    init: async function Backdrop_init(initOptions, levelGrid, pixelCanvas) {
        this.width = levelGrid.width;
        this.sheetSrc = initOptions.sheetSrc;
        this.sheetConfigUrl = initOptions.sheetConfigUrl;
        const data = await Utils.Http.Request({
            url: this.sheetConfigUrl,
        });
        this.sheetConfig = JSON.parse(data.responseText);
        this.sheetCellWidth = this.sheetConfig.cellWidth;
        this.sheetCellHeight = this.sheetConfig.cellHeight;
        this.sheetImage = await Utils.File.ImageLoader.get(this.sheetSrc);
        // finally we have map data and a sprite sheet
        await this._generateBackdropAnimation(pixelCanvas);
    },
    _generateBackdropAnimation: async function Backdrop_generateBackdropAnimation(pixelCanvas) {
        this.frames = [];
        this.frameDuration = this.sheetConfig.animation.frameDuration;
        this.animationLength = this.sheetConfig.animation.length;
        this.animationType = this.sheetConfig.animation.type;
        this.frameTime = 0;
        switch (this.animationType) {
            case Sprites.ANIMATION_TYPE.FORWARD:
            case Sprites.ANIMATION_TYPE.PINGPONG:
                this.frameIndex = 0;
                this.animationDirection = Sprites.ANIMATION_DIRECTION.FORWARD;
            case Sprites.ANIMATION_TYPE.REVERSE:
                // last frame
                this.frameIndex = this.animationLength - 1;
                this.animationDirection = Sprites.ANIMATION_DIRECTION.BACKWARD;
                break;
            case Sprites.ANIMATION_TYPE.NONE:
                this.frameIndex = 0;
                this.animationDirection = Sprites.ANIMATION_DIRECTION.STOPPED;
                break;
        }
        const sourceY = 0;
        const framePromises = [];
        for (let sourceX = 0, frameIndex = 0; frameIndex < this.animationLength; sourceX += this.sheetCellWidth, frameIndex++) {
            framePromises.push(
                this._generatePatternImage(pixelCanvas, sourceX, sourceY).then(function addFrameImage(imageRepeat) {
                    this.frames[frameIndex] = imageRepeat;
                }.bind(this))
            );
        }
        await Promise.all(framePromises);
        this.frameImage = this.frames[this.frameIndex];
    },
    /*
    * Generate the background image from individual tile
    */
    _generatePatternImage: function Backdrop_generatePatternImage(pixelCanvas, sourceX, sourceY) {
        return new Promise(function promiseSingleBackdropImage(resolve, reject) {
            // create a new canvas for getting the base image of the backdrop
            let [singleCanvas, singleContext] = pixelCanvas.newUnscaled(this.sheetCellWidth, this.sheetCellHeight);
            singleContext.drawImage(this.sheetImage,
                sourceX,
                sourceY,
                this.sheetCellWidth,
                this.sheetCellHeight,
                0,
                0,
                this.sheetCellWidth,
                this.sheetCellHeight
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
        }.bind(this)).then(function gotSingleBackdropImage(imageSingle) {
            return new Promise(function promiseRepeatBackdropImage(resolve, reject) {
                /// TODO : wait later to draw the repeating pattern only with the requested camera width and position
                /// create a new canvas for compositing a repeating layer based on the single image
                let [repeatCanvas, repeatContext] = pixelCanvas.newUnscaled(this.width, this.sheetCellHeight);
                // easy debug // document.getElementById("hiddenloading").appendChild(repeatCanvas);
                /// Draw
                let pattern = repeatContext.createPattern(imageSingle, this.sheetConfig.pattern.repetition);
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
            }.bind(this))
        }.bind(this));
    },
    draw: function Backdrop_draw(context, position) {
        context.drawImage(this.frameImage, position.x, position.y);
    },
    /*
    * update animation frame time, change frame, change animation direction if necessary
    */
    updateAnimation: function Backdrop_updateAnimation(timePassed) {
        if (this.animationDirection != Sprites.ANIMATION_DIRECTION.STOPPED) {
            this.frameTime += timePassed;
            while (this.frameTime > this.frameDuration) {
                this._nextFrame();
                this.frameImage = this.frames[this.frameIndex];
                this.frameTime -= this.frameDuration;
            }
        }
    },
    /*
    * move animation to next frame, change animation direction if necessary
    */
    _nextFrame: function Backdrop_nextFrame() {
        this.frameIndex += this.animationDirection;
        if (this.frameIndex >= this.animationLength || this.frameIndex < 0) {
            switch (this.animationType) {
                case Sprites.ANIMATION_TYPE.FORWARD:
                case Sprites.ANIMATION_TYPE.BACKWARD:
                    this.frameIndex = (this.frameIndex + this.animationLength) % this.animationLength;
                    break;
                case Sprites.ANIMATION_TYPE.PINGPONG:
                    this.animationDirection = -this.animationDirection;
                    this.frameIndex += this.animationDirection;
                    break;
                default:
                    console.warn("unexpected case");
                    break;
            }
        }
    },
};

async function newComponent_Backdrop(initOptions, levelGrid, pixelCanvas) {
    const backdrop = Object.create(Backdrop);
    await backdrop.init(initOptions, levelGrid, pixelCanvas);
    return backdrop;
}


async function spawnNewBackdrop(engine, layerOptions, levelGrid, pixelCanvas) {
    const backdrop = await newComponent_Backdrop(layerOptions.sheetOptions, levelGrid, pixelCanvas);
    return engine.spawn()
        .addComponent(backdrop)
        .addComponent(Physics.newComponent_Position(layerOptions.gamePosition));
}

const System_initBackdrops = {
    name: "initBackdrops",
    resourceQuery: ["levelGrid", "pixelCanvas"],
    run: function initBackdrops(queryResults) {
        const engine = queryResults.engine;
        const levelGrid = queryResults.resources.levelGrid;
        const pixelCanvas = queryResults.resources.pixelCanvas;
        const layersSheetOptions = this.initOptions.layers;
        for (const layerOptions of layersSheetOptions) {
            spawnNewBackdrop(engine, layerOptions, levelGrid, pixelCanvas);
        }
    },
};

export function init(engine) {
    engine.registerSystem(System_initBackdrops);
}
