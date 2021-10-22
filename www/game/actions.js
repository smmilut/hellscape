/**
 * Character actions : Components and constants for interaction
 */

/** Enum of action poses */
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

/** Enum of facing directions */
export const FACING = Object.freeze({
    LEFT: "Left",
    RIGHT: "Right",
});

export function newComponent_Facing(initOptions) {
    initOptions = initOptions || {};
    return {
        name: "facing",
        direction: initOptions.direction || FACING.LEFT,
    };
};

export function newComponent_Jump(initOptions) {
    initOptions = initOptions || {};
    let Jump_chargesLeft;
    let Jump_isready;

    const obj_Jump = {
        name: "jump",
        speedIncrement: initOptions.speedIncrement || 1.0,
        qtyLeft: 1.0,
        qtyDecrement: initOptions.qtyDecrement || 0.1,
        maxCharges: initOptions.maxCharges || 1,
        apply: function Jump_apply(speed) {
            if (Jump_isready) {
                /// jump was rearmed, we can jump
                if (Math.abs(speed.y) < 0.1) {
                    /// not currently moving vertically (falling or already jumping)
                    /// assume collision down (feet on ground)
                    this.resetCharges();
                    /// consume a charge and initiate a new jump
                    Jump_chargesLeft -= 1;
                } else if (Jump_chargesLeft > 0) {
                    /// consume a charge and initiate a new jump
                    Jump_chargesLeft -= 1;
                    this.qtyLeft = 1.0;
                }
            }
            if (this.qtyLeft > 0.0) {
                /// continue jump
                speed.y -= this.speedIncrement;
                this.qtyLeft -= this.qtyDecrement;
            }
            /// in any case, trying to jump, so un-arming it
            Jump_isready = false;
        },
        rearm: function Jump_rearm() {
            this.qtyLeft = 0.0;
            Jump_isready = true;
        },
        resetCharges: function Jump_resetCharges() {
            this.qtyLeft = 1.0;
            Jump_chargesLeft = this.maxCharges;
        },
    };

    obj_Jump.resetCharges();
    obj_Jump.rearm();
    return obj_Jump;
};

const Component_Attack = {
    name: "attack",
    init: function Attack_init() {
        this.qtyLeft = 1.0;
        this.qtyDecrement = 0.1;
        this._isAttacking = false;
    },
    tryApply: function Attack_tryApply() {
        if (this.qtyLeft > 0.0) {
            this._isAttacking = true;
            this.qtyLeft -= this.qtyDecrement;
        } else {
            this._isAttacking = false;
        }
    },
    rearm: function Attack_rearm() {
        this.qtyLeft = 1.0;
        this._isAttacking = false;
    },
    isAttacking: function Attack_isAttacking() {
        return this._isAttacking;
    },
};

export function newComponent_Attack(_initOptions) {
    const attack = Object.create(Component_Attack);
    attack.init();
    return attack;
};

export function newComponent_Collider(initOptions) {
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
