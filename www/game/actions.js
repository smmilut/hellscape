export const ACTION_POSE = Object.freeze({
    UNUSED: "*unused*", // pose exists in the sprite sheet, but not in the game
    NONE: "",
    STAND: "Stand",
    WALK: "Walk",
    WALKPANIC: "WalkPanic",
    PINNED: "Pinned",
    JUMP: "Jump",
    ATTACK: "Attack",
});

export const FACING = Object.freeze({
    LEFT: "Left",
    RIGHT: "Right",
});

export const newFacing = function newFacing(initOptions) {
    initOptions = initOptions || {};
    return {
        name: "facing",
        direction: initOptions.direction || FACING.LEFT,
    };
};

export const newJump = function newJump(initOptions) {
    initOptions = initOptions || {};
    let Jump_expended = false;
    const obj_Jump = {
        name: "jump",
        speedIncrement: initOptions.speedIncrement || 1.0,
        apply: function Jump_apply(speed) {
            if (!Jump_expended && Math.abs(speed.y) < 0.1) {
                // not currently moving vertically (falling or already jumping)
                // assume collision down (feet on ground)
                speed.y = -this.speedIncrement;
                Jump_expended = true;
            }
        },
        rearm: function Jump_rearm() {
            Jump_expended = false;
        },
    };
    return obj_Jump;
};

export const newAttack = function newAttack(_initOptions) {
    return {
        name: "attack",
        isAttacking: false,
    };
};

export const newCollider = function newCollider(initOptions) {
    initOptions = initOptions || {};
    return {
        name: "collider",
        width: initOptions.width || 16,
        height: initOptions.height || 16,
        hasCollisionWith: function Collider_hasCollisionWith(thisPosition, otherCollider, otherPosition) {
            const thisLeft = thisPosition.x - this.width / 2.0;
            const thisRight = thisPosition.x + this.width / 2.0;
            const thisTop = thisPosition.y - this.height / 2.0;
            const thisBottom = thisPosition.y + this.height / 2.0;
            const otherLeft = otherPosition.x - otherCollider.width / 2.0;
            const otherRight = otherPosition.x + otherCollider.width / 2.0;
            const otherTop = otherPosition.y - otherCollider.height / 2.0;
            const otherBottom = otherPosition.y + otherCollider.height / 2.0;
            // or collision based on center only
            //if (otherPosition.x >= thisLeft && otherPosition.x <= thisRight && otherPosition.y <= thisBottom && otherPosition.y >= thisTop) {
            if (
                thisLeft <= otherRight &&
                thisRight >= otherLeft &&
                thisBottom >= otherTop &&
                thisTop <= otherBottom
            ) {
                return true;
            } else {
                return false;
            }
        },
    };
};
