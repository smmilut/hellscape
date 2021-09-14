/*
* Game actions to which we can bind keys
*/
export const USER_ACTION = Object.freeze({
    LEFT: "left",
    RIGHT: "right",
    UP: "up",
    DOWN: "down",
    JUMP: "jump",
    ATTACK: "attack",
    MENU: "menu",
});

/*
* Keyboard management
* Could be used as a Resource individually
*/
const Resource_Keyboard = (function build_Keyboard() {
    const obj_Keyboard = {
        name: "keyboard",
    };
    /// Mapping a key to a key state, where value : `true` means pressed, `false` means not pressed
    const KeysState = new Map();
    /// Mapping a key to an action
    const KeyMap = new Map();
    let Keyboard_initOptions;

    obj_Keyboard.prepareInit = function Keyboard_prepareInit(initOptions) {
        Keyboard_initOptions = initOptions || {};
    };

    obj_Keyboard.init = function Keyboard_init() {
        window.addEventListener("keydown", function keyPressed(event) {
            KeysState.set(event.key, true);
            if (KeyMap.has(event.key)) {
                /// Those keys are bound to game function, disable their default browser behaviour
                event.preventDefault();
            }
        });
        window.addEventListener("keyup", function keyUnpressed(event) {
            KeysState.set(event.key, false);
        });
        if (Keyboard_initOptions.defaultKeys) {
            for (let keyBindingConfig of Keyboard_initOptions.defaultKeys) {
                obj_Keyboard.mapKey(keyBindingConfig);
            }
        }
    };

    /*
    * Map a keyboard key to a game action
    * Keyboard keys are just strings containing the "key" name from the browser event
    * (which is basically just the keyboard letter or something like "ArrowLeft")
    */
    obj_Keyboard.mapKey = function Keyboard_mapKey(keyBindingConfig) {
        KeyMap.set(keyBindingConfig.button, keyBindingConfig.action);
    };

    obj_Keyboard.isKeyDown = function Keyboard_isKeyDown(expectedAction) {
        for (let [key, action] of KeyMap) {
            if (action == expectedAction && KeysState.get(key)) {
                return true;
            }
        }
        return false;
    };

    obj_Keyboard.isKeyUp = function Keyboard_isKeyUp(expectedAction) {
        for (let [key, action] of KeyMap) {
            if (action == expectedAction && KeysState.get(key)) {
                return false;
            }
        }
        // none of the key bindings are currently pressed down, so ok it's Up
        return true;
    };

    return obj_Keyboard;
})();

/*
* Type of input key
*/
const KEYTYPE = Object.freeze({
    KEY: "keyboardKey",  // keyboard key
    BUTTON: "gamepadButton",  // gamepad button
    AXIS: "gamepadAxis",  // gamepad axis
});

/*
* Reference between gamepad button names and button index for the browser event
*/
const GAMEPAD_BUTTON = new Map([
    ["xbox_A", 0],   // Bottom button in right cluster
    ["xbox_B", 1],  // Right button in right cluster
    ["xbox_X", 2],  // Left button in right cluster
    ["xbox_Y", 3],  // Top button in right cluster
    ["xbox_L1", 4],  // Top left front button
    ["xbox_R1", 5],  // Top right front button
    ["xbox_L2", 6],  // Bottom left front button
    ["xbox_R2", 7],  // Bottom right front button
    ["xbox_SELECT", 8],  // Left button in center cluster
    ["xbox_START", 9],  // Right button in center cluster
    ["xbox_L", 10],  // Left stick pressed button
    ["xbox_R", 11],  // Right stick pressed button
    ["xbox_UP", 12],  // Top button in left cluster
    ["xbox_DOWN", 13],  // Bottom button in left cluster
    ["xbox_LEFT", 14],  // Left button in left cluster
    ["xbox_RIGHT", 15],  // Right button in left cluster
    ["xbox_HOME", 16],  // Center button in center cluster 

]);

/*
* The gamepad axis index must also be its index for the browser event
*/
const GAMEPAD_AXIS = Object.freeze({
    LHORIZ: 0,  // Horizontal axis for left stick (negative left/positive right)
    LVERT: 1,  // Vertical axis for left stick (negative up/positive down)
    RHORIZ: 2,  // Horizontal axis for right stick (negative left/positive right)
    RVERT: 3,  // Vertical axis for right stick (negative up/positive down) 
});

/*
* Gamepad management
* Could be used as a Resource individually
*/
const Resource_Gamepad = (function build_Gamepad() {
    const obj_Gamepad = {
        name: "gamepad",
    };
    /// Mapping a button to a button state, where value is an object { isPressed, buttonValue, isAnalog }
    const Gamepad_buttonState = new Map();
    /// Mapping a button to an action
    const Gamepad_buttonMap = new Map();
    let Gamepad_initOptions, Gamepad_haveEvents;
    let Gamepad_controllers = [];

    obj_Gamepad.prepareInit = function Gamepad_prepareInit(initOptions) {
        Gamepad_initOptions = initOptions || {};
    };

    obj_Gamepad.init = function Gamepad_init() {
        /// check browser capabilities
        Gamepad_haveEvents = 'ongamepadconnected' in window;
        /// listen to gamepad events (connect/disconnect)
        window.addEventListener("gamepadconnected", function gamepadConnected(event) {
            addGamepad(event.gamepad);
        });
        window.addEventListener("gamepaddisconnected", function gamepadDisconnected(event) {
            removeGamepad(event.gamepad);
        });
        if (Gamepad_initOptions.defaultKeys) {
            for (let keyBindingConfig of Gamepad_initOptions.defaultKeys) {
                obj_Gamepad.mapKey(keyBindingConfig);
            }
        }
    };

    function addGamepad(gamepad) {
        Gamepad_controllers[gamepad.index] = gamepad;
        console.warn("connecting gamepad", gamepad.index, gamepad.id);
    }

    function removeGamepad(gamepad) {
        console.warn("disconnecting gamepad", gamepad.index, gamepad.id);
        delete Gamepad_controllers[gamepad.index];
    }

    /*
    * Need to manually call to refresh the cache of the gamepad state
    */
    obj_Gamepad.update = function Gamepad_update() {
        if (!Gamepad_haveEvents) {
            scangamepads();
        }

        for (let gamepadIndex in Gamepad_controllers) {
            let controller = Gamepad_controllers[gamepadIndex];

            for (let buttonIndex = 0; buttonIndex < controller.buttons.length; buttonIndex++) {
                let buttonValue = controller.buttons[buttonIndex];
                let isPressed = buttonValue == 1.0;
                let isAnalog = false;
                if (typeof (buttonValue) == "object") {
                    isAnalog = true;
                    isPressed = buttonValue.pressed;
                    buttonValue = buttonValue.value;
                }
                Gamepad_buttonState.set(buttonIndex, {
                    isPressed: isPressed,
                    buttonValue: buttonValue,
                    isAnalog: isAnalog,
                });
            }

            for (let axisIndex = 0; axisIndex < controller.axes.length; axisIndex++) {
                // TODO: implement axes
                //console.log("axis state", axisIndex, controller.axes[axisIndex]);
            }
        }
    };

    /*
    * Add gamepad, depending on browser capabilities
    */
    function scangamepads() {
        let gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
        for (var gamepadIndex = 0; gamepadIndex < gamepads.length; gamepadIndex++) {
            if (gamepads[gamepadIndex]) {
                if (gamepads[gamepadIndex].index in Gamepad_controllers) {
                    Gamepad_controllers[gamepads[gamepadIndex].index] = gamepads[gamepadIndex];
                } else {
                    addgamepad(gamepads[gamepadIndex]);
                }
            }
        }
    }

    obj_Gamepad.mapKey = function Gamepad_mapKey(keyBindingConfig) {
        if (keyBindingConfig.type == KEYTYPE.BUTTON) {
            const button = GAMEPAD_BUTTON.get(keyBindingConfig.button);
            Gamepad_buttonMap.set(button, keyBindingConfig.action);
        }
    };

    obj_Gamepad.isKeyDown = function Gamepad_isKeyDown(expectedAction) {
        for (let [buttonId, action] of Gamepad_buttonMap) {
            let button = Gamepad_buttonState.get(buttonId);
            if (action == expectedAction && button && button.isPressed) {
                return true;
            }
        }
        return false;
    };

    obj_Gamepad.isKeyUp = function Gamepad_isKeyUp(expectedAction) {
        for (let [buttonId, action] of Gamepad_buttonMap) {
            let button = Gamepad_buttonState.get(buttonId);
            if (action == expectedAction && button && button.isPressed) {
                return false;
            }
        }
        // none of the key bindings are currently pressed down, so ok it's Up
        return true;
    };

    return obj_Gamepad;
})();

/*
* User input of Keyboard and Gamepad combined
*/
const Resource_Input = (function build_Input() {
    const obj_Input = {
        name: "input",
        USER_ACTION: USER_ACTION,
    };
    let Input_initOptions, Input_Keyboard, Input_Gamepad;

    obj_Input.prepareInit = function Input_prepareInit(initOptions) {
        Input_initOptions = initOptions || {};
        Input_Keyboard = Resource_Keyboard;
        Input_Gamepad = Resource_Gamepad;
        if (Input_initOptions.defaultKeys) {
            for (let keyBindingConfig of Input_initOptions.defaultKeys) {
                obj_Input.mapKey(keyBindingConfig);
            }
        }
        Input_Keyboard.prepareInit(Input_initOptions.keyboardInit);
        Input_Gamepad.prepareInit(Input_initOptions.gamepadInit);
    };

    obj_Input.init = function Input_init() {
        Input_Keyboard.init();
        Input_Gamepad.init();
    };

    obj_Input.update = function Input_update() {
        Input_Gamepad.update();
    };

    obj_Input.mapKey = function Input_mapKey(keyBindingConfig) {
        switch (keyBindingConfig.type) {
            case KEYTYPE.KEY:
                Input_Keyboard.mapKey(keyBindingConfig);
                break;
            case KEYTYPE.BUTTON:
                Input_Gamepad.mapKey(keyBindingConfig);
                break;
        }
    };

    obj_Input.isKeyDown = function Input_isKeyDown(expectedAction) {
        if (Input_Keyboard.isKeyDown(expectedAction) || Input_Gamepad.isKeyDown(expectedAction)) {
            // any key down, it's down
            return true;
        } else {
            return false;
        }
    };

    obj_Input.isKeyUp = function Input_isKeyUp(expectedAction) {
        if (Input_Keyboard.isKeyUp(expectedAction) && Input_Gamepad.isKeyUp(expectedAction)) {
            // need all keys to be up
            return true;
        } else {
            return false;
        }
    };

    return obj_Input;
})();

/*
*   Initialize user input : make user input Resource available
*/
export function init(ecs) {
    ecs.Resources.register(Resource_Input);
}