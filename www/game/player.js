import * as Physics from "./physics.js";
import * as Actions from "./actions.js";
import * as Sprites from "../graphics/sprite.js";
import * as Input from "../userInput.js";

const newTagPlayer = function newTagPlayer(_initOptions) {
    return {
        name: "tagPlayer",
    };
};

const playerSpriteSheetOptions = {
    src: "assets/player_sheet.png",
    sheetCellWidth: 16,
    sheetCellHeight: 16,
    sheetLayout: [
        {
            pose: {
                name: "WalkLeft",
                facing: Actions.FACING.LEFT,
                action: Actions.ACTION_POSE.WALK,
            },
            animation: {
                length: 3,
                type: Sprites.ANIMATION_TYPE.PINGPONG,
                frameDuration: 0.100,
            },
        },
        {
            pose: {
                name: "WalkRight",
                facing: Actions.FACING.RIGHT,
                action: Actions.ACTION_POSE.WALK,
            },
            animation: {
                length: 3,
                type: Sprites.ANIMATION_TYPE.PINGPONG,
                frameDuration: 0.100,
            },
        },
        {
            pose: {
                name: "StandLeft",
                facing: Actions.FACING.LEFT,
                action: Actions.ACTION_POSE.STAND,
            },
            animation: {
                length: 1,
                type: Sprites.ANIMATION_TYPE.NONE,
                frameDuration: 0.100,
            },
        },
        {
            pose: {
                name: "StandRight",
                facing: Actions.FACING.RIGHT,
                action: Actions.ACTION_POSE.STAND,
            },
            animation: {
                length: 1,
                type: Sprites.ANIMATION_TYPE.NONE,
                frameDuration: 0.100,
            },
        },
        {
            pose: {
                name: "JumpLeft",
                facing: Actions.FACING.LEFT,
                action: Actions.ACTION_POSE.JUMP,
            },
            animation: {
                length: 1,
                type: Sprites.ANIMATION_TYPE.NONE,
            },
        },
        {
            pose: {
                name: "JumpRight",
                facing: Actions.FACING.RIGHT,
                action: Actions.ACTION_POSE.JUMP,
            },
            animation: {
                length: 1,
                type: Sprites.ANIMATION_TYPE.NONE,
            },
        },
        {
            pose: {
                name: "AttackLeft",
                facing: Actions.FACING.LEFT,
                action: Actions.ACTION_POSE.ATTACK,
            },
            animation: {
                length: 2,
                type: Sprites.ANIMATION_TYPE.FORWARD,
                frameDuration: 0.100,
            },
        },
        {
            pose: {
                name: "AttackRight",
                facing: Actions.FACING.RIGHT,
                action: Actions.ACTION_POSE.ATTACK,
            },
            animation: {
                length: 2,
                type: Sprites.ANIMATION_TYPE.FORWARD,
                frameDuration: 0.100,
            },
        },
    ],
    defaultPose: "StandLeft",
};

const System_handleInput = {
    resourceQuery: ["input"],
    componentQueries: {
        player: ["speed", "facing", "jump", "sprite", "attack", "tagPlayer"],
    },
    run: function handleInput(queryResults) {
        let input = queryResults.resources.input;
        for (let e of queryResults.components.player) {
            let actionName = Actions.ACTION_POSE.NONE;
            if (input.isKeyDown(Input.USER_ACTION.LEFT)) {
                e.speed.incrementLeft();
                actionName = Actions.ACTION_POSE.WALK;
                e.facing.direction = Actions.FACING.LEFT;
            } else if (input.isKeyDown(Input.USER_ACTION.RIGHT)) {
                e.speed.incrementRight();
                actionName = Actions.ACTION_POSE.WALK;
                e.facing.direction = Actions.FACING.RIGHT;
            } else {
                actionName = Actions.ACTION_POSE.STAND;
            }
            if (input.isKeyDown(Input.USER_ACTION.JUMP)) {
                if (e.jump.apply(e.speed)) {
                    actionName = Actions.ACTION_POSE.JUMP;
                };
            }
            if (input.isKeyDown(Input.USER_ACTION.ATTACK)) {
                actionName = Actions.ACTION_POSE.ATTACK;
                e.attack.isAttacking = true;
            }
            if (input.isKeyUp(Input.USER_ACTION.ATTACK)) {
                e.attack.isAttacking = false;
            }
            if (input.isKeyUp(Input.USER_ACTION.JUMP)) {
                e.jump.rearm();
            }
            e.sprite.setPose({
                action: actionName,
                facing: e.facing.direction
            });
        }
    },
};

function spawnNewPlayer(ecs) {
    return ecs.Data.newEntity()
        .addComponent(newTagPlayer())
        .addComponent(Physics.newComponent_Position({
            x: 2,
            y: 2,
        }))
        .addComponent(Physics.newComponent_Speed({
            x: 0,
            y: 0,
            increment: 1.0,
        }))
        .addComponent(Actions.newComponent_Facing())
        .addComponent(Actions.newComponent_Jump({
            speedIncrement: 40.0,
        }))
        .addComponent(Actions.newComponent_Collider({
            width: 10,
            height: 15,
        }))
        .addComponent(Actions.newComponent_Attack())
        .addComponent(Sprites.newComponent_Sprite(playerSpriteSheetOptions));
}

export function init(ecs) {
    spawnNewPlayer(ecs);

    ecs.Controller.addSystem(System_handleInput);
}