/*
*   Get the current time in seconds
*/
function getBrowserTime() {
    return performance.now() / 1000.0;
}

/*
*   A Timer Resource or Component that can be derived with Object.create()
*/
const Resource_Timer = {
    prepareInit: function Time_prepareInit(initOptions) {
        this._isRunning = true;
        this._fpsThreshold = 40;  // minimum acceptable FPS, below that we panic
        this.initOptions = initOptions || {};
    },
    init: function Time_init() {
        this.t = 0.0;
        this.old_t = 0.0;
        this.dt = 0.0;
        window.addEventListener("blur", this.pause.bind(this));
        window.addEventListener("focus", this.unPause.bind(this));
    },
    update: function Time_update() {
        if (this._isRunning) {
            this.old_t = this.t;
            this.t = getBrowserTime();
            this.dt = (this.t - this.old_t);
            if (this.dt > 1.0 / this._fpsThreshold) {
                console.warn("frame too slow, discarding time : ", (this.dt * 1000).toFixed(0), "ms =", (1.0 / this.dt).toFixed(0), "FPS");
                this.dt = 0;
            }
        }
    },
    pause: function Time_pause() {
        this._isRunning = false;
        /// time stops moving, so no `dt`
        this.dt = 0;
    },
    unPause: function Time_unpause() {
        this._isRunning = true;
        /// get on with the times !
        this.t = getBrowserTime();
        this.old_t = this.t;
    },
    isRunning: function Time_isRunning() {
        return this._isRunning;
    },
    isPaused: function Time_isPaused() {
        return !this._isRunning;
    },
};

/*
* The main Time Resource that tracks the frame duration
*/
const Resource_Time = (function build_Time() {
    const obj_Time = Object.create(Resource_Timer);
    obj_Time.name = "time";
    return obj_Time;
})();


/*
*   Initialize system : make Resources available
*/
export async function init(engine) {
    engine.registerResource(Resource_Time);
}
