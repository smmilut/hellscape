import * as Utils from "../utils.js";

export const ANIMATION_DIRECTION = Object.freeze({
    FORWARD: 1,  // currently animate frames in order
    BACKWARD: -1,  // currently animate frames in reverse order
    STOPPED: 0,
});

export const ANIMATION_TYPE = Object.freeze({
    NONE: "none",
    FORWARD: "forward",  // animation happens in continuous forward order
    REVERSE: "reverse",  // animation happens in continuous reverse order
    PINGPONG: "pingpong",  // animation happens in ping-pong mode, alternating forward and backward
});


/*
* a Sprite with animation from a sprite sheet
*/
const Sprite = {
    name: "sprite",
    init: async function Sprite_init(initOptions) {
        this.sheetSrc = initOptions.sheetSrc;
        this.sheetConfigUrl = initOptions.sheetConfigUrl;
        const data = await Utils.Http.Request({
            url: initOptions.sheetConfigUrl,
        });
        this.sheetConfig = JSON.parse(data.responseText);
        this.sheetCellWidth = this.sheetConfig.cellWidth;
        this.sheetCellHeight = this.sheetConfig.cellHeight;
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
        this.sheetLayout = this.sheetConfig.layout;
        this.sheetImage = await Utils.File.ImageLoader.get(this.sheetSrc);
        await this._parseSpriteSheet();
        this.setPose({ name: this.sheetConfig.defaultPose });
    },
    _parseSpriteSheet: function Sprite_parseSpriteSheet() {
        return new Promise(function parsingSpriteSheet(resolve, reject) {
            // Run through all cells in the sprite sheet to define separate animation frames
            for (let sourceY = 0, poseIndex = 0; sourceY < this.sheetImage.height; sourceY += this.sheetCellHeight, poseIndex++) {
                // Y position in the sprite sheet is the animation pose
                let options = this.sheetLayout[poseIndex];
                let animationOptions = options.animation;
                let poseOptions = options.pose;
                poseOptions.name = poseOptions.action + poseOptions.facing; // should already be like this, but instead of checking, I force, because it's only a convenience for inputting the options
                this.sheetLayout[poseOptions.name] = {
                    frames: [],
                    pose: poseOptions,
                    animation: animationOptions,
                };
                for (let sourceX = 0, frameIndex = 0; frameIndex < animationOptions.length; sourceX += this.sheetCellWidth, frameIndex++) {
                    // X position in the sprite sheet is the animation frame for this pose
                    this.sheetLayout[poseOptions.name].frames[frameIndex] = {
                        sourceX: sourceX,
                        sourceY: sourceY,
                    };
                }
            }
            resolve();
        }.bind(this));
    },
    /*
    * From a requested drawing `position`, get where the sprite should be drawn.
    * Return the upper left corner of the sprite, when the `position` indicates the position of the bottom-middle.
    * */
    _convertCenterPositionToSprite: function Sprite_convertCenterPositionToSprite(position) {
        let x = position.x - this.sheetCellWidth * 0.5;
        // a bit off-center downwards, so that feet appear to walk on top of the lower map tile
        let y = position.y - this.sheetCellHeight * 0.4;
        return { x: x, y: y };
    },
    draw: function Sprite_draw(context, position) {
        let screenPosition = this._convertCenterPositionToSprite(position);
        context.drawImage(
            this.sheetImage,
            this.frameInfo.sourceX,
            this.frameInfo.sourceY,
            this.sheetCellWidth,
            this.sheetCellHeight,
            screenPosition.x,
            screenPosition.y,
            this.sheetCellHeight,
            this.sheetCellHeight
        );
    },
    /*
    * set animation pose
    *
    *   poseInfo = {
    *       name,
    *   }
    * 
    * or
    * 
    *   poseInfo = {
    *       action,
    *       facing,
    *   }
    */
    setPose: function Sprite_setPose(poseInfo) {
        let poseName = poseInfo.name;
        if (poseInfo.action && poseInfo.facing) {
            poseName = poseInfo.action + poseInfo.facing;
        }
        if (poseName !== undefined && this.pose != poseName) {
            // the pose changed
            this.pose = poseName;
            // reset animation
            this.frameTime = 0;
            this.poseInfo = this.sheetLayout[this.pose];
            switch (this.poseInfo.animation.type) {
                case ANIMATION_TYPE.FORWARD:
                case ANIMATION_TYPE.PINGPONG:
                    this.frame = 0;
                    this.animationDirection = ANIMATION_DIRECTION.FORWARD;
                case ANIMATION_TYPE.REVERSE:
                    // last frame
                    this.frame = this.poseInfo.animation.length - 1;
                    this.animationDirection = ANIMATION_DIRECTION.BACKWARD;
                    break;
                case ANIMATION_TYPE.NONE:
                    this.frame = 0;
                    this.animationDirection = ANIMATION_DIRECTION.STOPPED;
                    break;
            }
            this.frameInfo = this.poseInfo.frames[this.frame];
        }
    },
    /*
    * update animation frame time, change frame, change animation direction if necessary
    */
    updateAnimation: function Sprite_updateAnimation(timePassed) {
        if (this.animationDirection != ANIMATION_DIRECTION.STOPPED) {
            this.frameTime += timePassed;
            while (this.frameTime > this.poseInfo.animation.frameDuration) {
                this._nextFrame();
                this.frameTime -= this.poseInfo.animation.frameDuration;
            }
        }
    },
    /*
    * move animation to next frame, change animation direction if necessary
    */
    _nextFrame: function Sprite_nextFrame() {
        const animationLength = this.poseInfo.frames.length;
        this.frame += this.animationDirection;
        if (this.frame >= animationLength || this.frame < 0) {
            switch (this.poseInfo.animation.type) {
                case ANIMATION_TYPE.FORWARD:
                case ANIMATION_TYPE.BACKWARD:
                    this.frame = (this.frame + animationLength) % animationLength;
                    break;
                case ANIMATION_TYPE.PINGPONG:
                    this.animationDirection = -this.animationDirection;
                    this.frame += this.animationDirection;
                    break;
                default:
                    console.warn("unexpected case");
                    break;
            }
        }
        this.frameInfo = this.poseInfo.frames[this.frame];
    },
};

export async function newComponent_Sprite(initOptions) {
    const sprite = Object.create(Sprite);
    await sprite.init(initOptions);
    return sprite;
};

const System_updateSpriteAnimation = {
    name: "updateSpriteAnimation",
    resourceQuery: ["time"],
    componentQueries: {
        sprites: ["sprite"],
    },
    run: function updateSpriteAnimation(queryResults) {
        const time = queryResults.resources.time;
        for (let e of queryResults.components.sprites) {
            e.sprite.updateAnimation(time.dt);
        }
    },
};

export function init(engine) {
    engine.registerSystem(System_updateSpriteAnimation);
}