
export const USER_ACTION = Object.freeze({
    LEFT: "LEFT",
    RIGHT: "RIGHT",
    UP: "UP",
    DOWN: "DOWN",
    JUMP: "JUMP",
});

export const KeyboardResource = (function build_Keyboard() {
    const obj_Keyboard = {
        name: "keyboard",
        isInitialized: false,
    };
    const KeysState = new Map();
    const KeyMap = new Map();
    let Keyboard_initOptions;

    obj_Keyboard.prepareInit = function Keyboard_prepareInit(initOptions) {
        Keyboard_initOptions = initOptions || {};
    };

    obj_Keyboard.init = function Keyboard_init() {
        window.addEventListener("keydown", function keyPressed(event) {
            KeysState.set(event.key, true);
        });
        window.addEventListener("keyup", function keyUnpressed(event) {
            KeysState.set(event.key, false);
        });
        if (Keyboard_initOptions.defaultKeys) {
            for (let [key, action] of Keyboard_initOptions.defaultKeys) {
                obj_Keyboard.mapKey(key, action);
            }
        }
        obj_Keyboard.isInitialized = true;
    };

    obj_Keyboard.update = function Keyboard_update() {
        // nothing to do, because has to be handled through events
        // but this function must exist for the object to be considered a Resource
    };

    obj_Keyboard.mapKey = function Keyboard_mapKey(key, action) {
        KeyMap.set(key, action)
    };

    obj_Keyboard.isKeyDown = function Keyboard_isKeyDown(expectedAction) {
        for (let [key, action] of KeyMap) {
            //console.log("checking key down", key, KeysState.get(key), action, expectedAction);
            if (action == expectedAction && KeysState.get(key)) {
                //console.log("yes down");
                return true;
            }
        }
        //console.log("not down");
        return false;
    };

    return obj_Keyboard;
})();

export function init(ecs) {
    ecs.Data.addResource(KeyboardResource, {
        defaultKeys: [
            ["ArrowLeft", USER_ACTION.LEFT],
            ["ArrowRight", USER_ACTION.RIGHT],
            [" ", USER_ACTION.JUMP],
        ],
    });
}