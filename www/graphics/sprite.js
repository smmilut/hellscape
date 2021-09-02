import * as Utils from "../utils.js";

const ANIMATION_DIRECTION = Object.freeze({
    FORWARD: 1,  // currently animate frames in order
    BACKWARD: -1,  // currently animate frames in reverse order
    STOPPED: 0,
});

export const ANIMATION_TYPE = Object.freeze({
    NONE: 0,
    FORWARD: 1,  // animation happens in continuous forward order
    REVERSE: 2,  // animation happens in continuous reverse order
    PINGPONG: 3,  // animation happens in ping-pong mode, alternating forward and backward
});


/*
* a Sprite with animation from a sprite sheet
*/
export const newComponent_Sprite = function newSprite(initOptions) {
    const obj_Sprite = {
        name: "sprite",
        isInitialized: false,
    };
    let Sprite_sheetImage;
    let Sprite_pose, Sprite_frame, Sprite_frameTime, Sprite_animationDirection;
    let Sprite_poseInfo, Sprite_frameInfo;
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
    const Sprite_sheetLayout = {};

    obj_Sprite.init = function Sprite_init(initOptions) {
        //#region init animation
        let sheetLayout = initOptions.sheetLayout;
        //#endregion
        //#region init sprite sheet
        obj_Sprite.sheetCellWidth = initOptions.sheetCellWidth;
        obj_Sprite.sheetCellHeight = initOptions.sheetCellHeight;
        return Utils.File.ImageLoader.get(initOptions.src).then(function spriteImageLoaded(image) {
            Sprite_sheetImage = image;
            // Run through all cells in the sprite sheet to define separate animation frames
            for (let sourceY = 0, poseIndex = 0; sourceY < Sprite_sheetImage.height; sourceY += obj_Sprite.sheetCellHeight, poseIndex++) {
                // Y position in the sprite sheet is the animation pose
                let options = sheetLayout[poseIndex];
                let animationOptions = options.animation;
                let poseOptions = options.pose;
                poseOptions.name = poseOptions.action + poseOptions.facing; // should already be like this, but instead of checking, I force, because it's only a convenience for inputting the options
                Sprite_sheetLayout[poseOptions.name] = {
                    frames: [],
                    pose: poseOptions,
                    animation: animationOptions,
                };
                for (let sourceX = 0, frameIndex = 0; frameIndex < animationOptions.length; sourceX += obj_Sprite.sheetCellWidth, frameIndex++) {
                    // X position in the sprite sheet is the animation frame for this pose
                    Sprite_sheetLayout[poseOptions.name].frames[frameIndex] = {
                        sourceX: sourceX,
                        sourceY: sourceY,
                    };
                }
            }
            obj_Sprite.setPose({ name: initOptions.defaultPose });
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
        let x = position.x - obj_Sprite.sheetCellWidth * 0.5;
        // a bit off-center downwards, so that feet appear to walk on top of the lower map tile
        let y = position.y - obj_Sprite.sheetCellHeight * 0.4;
        return { x: x, y: y };
    }

    obj_Sprite.draw = function Sprite_draw(context, position) {
        if (obj_Sprite.isInitialized) {
            let screenPosition = convertPositionToSprite(position);
            context.drawImage(
                Sprite_sheetImage,
                Sprite_frameInfo.sourceX,
                Sprite_frameInfo.sourceY,
                obj_Sprite.sheetCellWidth,
                obj_Sprite.sheetCellHeight,
                screenPosition.x,
                screenPosition.y,
                obj_Sprite.sheetCellHeight,
                obj_Sprite.sheetCellHeight
            );
        } else {
            // sprite not loaded yet
            console.log("sprite not loaded yet");
        }
    };

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
    obj_Sprite.setPose = function Sprite_setPose(poseInfo) {
        let poseName = poseInfo.name;
        if (poseInfo.action && poseInfo.facing) {
            poseName = poseInfo.action + poseInfo.facing;
        }
        if (poseName != undefined && Sprite_pose != poseName) {
            // the pose changed
            Sprite_pose = poseName;
            // reset animation
            Sprite_frameTime = 0;
            Sprite_poseInfo = Sprite_sheetLayout[Sprite_pose];
            switch (Sprite_poseInfo.animation.type) {
                case ANIMATION_TYPE.FORWARD:
                case ANIMATION_TYPE.PINGPONG:
                    Sprite_frame = 0;
                    Sprite_animationDirection = ANIMATION_DIRECTION.FORWARD;
                case ANIMATION_TYPE.REVERSE:
                    // last frame
                    Sprite_frame = Sprite_poseInfo.animation.length - 1;
                    Sprite_animationDirection = ANIMATION_DIRECTION.BACKWARD;
                    break;
                case ANIMATION_TYPE.NONE:
                    Sprite_frame = 0;
                    Sprite_animationDirection = ANIMATION_DIRECTION.STOPPED;
                    break;
            }
            Sprite_frameInfo = Sprite_poseInfo.frames[Sprite_frame];
        }
    };

    /*
    * update animation frame time, change frame, change animation direction if necessary
    */
    obj_Sprite.updateAnimation = function Sprite_updateAnimation(timePassed) {
        if (!obj_Sprite.isInitialized) {
            Utils.debug("sprite not loaded yet");
            return;
        }
        if (Sprite_animationDirection != ANIMATION_DIRECTION.STOPPED) {
            Sprite_frameTime += timePassed;
            while (Sprite_frameTime > Sprite_poseInfo.animation.frameDuration) {
                nextFrame();
                Sprite_frameTime -= Sprite_poseInfo.animation.frameDuration;
            }
        }
    };

    /*
    * move animation to next frame, change animation direction if necessary
    */
    function nextFrame() {
        const animationLength = Sprite_poseInfo.frames.length;
        Sprite_frame += Sprite_animationDirection;
        if (Sprite_frame >= animationLength || Sprite_frame < 0) {
            switch (Sprite_poseInfo.animation.type) {
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
        Sprite_frameInfo = Sprite_poseInfo.frames[Sprite_frame];
    };

    obj_Sprite.init(initOptions);

    return obj_Sprite;
};

const System_updateAnimation = {
    resourceQuery: ["time"],
    componentQueries: {
        sprites: ["sprite"],
    },
    run: function updateAnimation(queryResults) {
        const time = queryResults.resources.time;
        for (let e of queryResults.components.sprites) {
            e.sprite.updateAnimation(time.dt);
        }
    },
};

export function init(ecs) {
    ecs.Controller.addSystem(System_updateAnimation, ecs.SYSTEM_STAGE.END);
}