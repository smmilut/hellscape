/*
 * Utilities module
 */

/*
*   Make Http requests
*/
export const Http = (function build_HttpUtils() {
    /* Http utils module */
    const HttpRequest = function createHttpRequestPromise(options) {
        /* promisified XMLHttpRequest
         * 
         * Parameters :
         *  options = {
         *              method,  // default: "GET"
         *              url,
         *              async,  // default: true
         *              requestHeaders : [{name, value}],
         *              data
         *            }
         * 
         * Resolve returns :
         *  {responseText}
         *
         * Reject returns :
         *  {status, statusText}
         * */
        return new Promise(function promiseHttpRequest(resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.open(options.method || "GET", options.url, options.async || true);
            if (options.requestHeaders) {
                for (let i = 0; i < options.requestHeaders.length; i++) {
                    xhr.setRequestHeader(options.requestHeaders[i].name, options.requestHeaders[i].value);
                };
            };
            xhr.onloadend = function httpRequestLoadEnd() {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    resolve({
                        responseText: xhr.responseText
                    });
                } else {
                    reject({
                        status: xhr.status,
                        statusText: xhr.statusText,
                        responseText: xhr.responseText
                    });
                };
            };
            xhr.onerror = function httpRequestError() {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText,
                    responseText: xhr.responseText
                });
            };
            xhr.send(options.data);
        });
    };

    /* exposed module properties */
    return {
        Request: HttpRequest
    };
})();

/*
* Load and cache images
*/
export const File = (function build_File() {
    const obj_File = {};

    obj_File.ImageLoader = (function build_ImageLoader() {
        const obj_ImageLoader = {};
        const ImageLoader_cache = new Map();

        /*
        * Get image from cache or load it if not found
        */
        obj_ImageLoader.get = async function ImageLoader_get(src) {
            if (ImageLoader_cache.has(src)) {
                /// getting Promise from cache
                return ImageLoader_cache.get(src);
            } else {
                /// loading image and returning Promise
                let imagePromise = loadImage(src);
                /// adding Promise to cache
                ImageLoader_cache.set(src, imagePromise);
                return imagePromise;
            }
        };

        /*
        * Actually load image file (not from cache)
        */
        function loadImage(src) {
            return new Promise(function promiseImageLoading(resolve, reject) {
                const image = new Image();
                image.addEventListener("load", function onloadImage() {
                    resolve(image);
                });
                image.addEventListener("error", function onerrorImage() {
                    console.warn("image load error", src);
                    reject();
                });
                image.src = src;
            });
        }

        return obj_ImageLoader;
    })();

    return obj_File;
})();

/*
* Utilities for numbers
*/
export const Number = (function build_Number() {
    return {
        /*
        * convert an Array of bits into a number
        */
        bitArrayToNum: function Number_bitArrayToNum(bitArray) {
            return parseInt(bitArray.join(""), 2);
        },
        /*
        * convert a number into an Array of bits
        */
        numToBitArray: function Number_numToBitArray(num, padLength) {
            let bitArray = (num >>> 0).toString(2).split("").map(function toNum(str) {
                return parseInt(str, 10);
            });
            const length = bitArray.length;
            if (padLength && length < padLength) {
                for (let i = 0; i < padLength - length; i++) {
                    bitArray.unshift(0);
                }
            }
            return bitArray.reverse();
        },
    }
})();

/*
*   Utilities for random numbers
*/
export const Rng = (function build_RngUtils() {
    const obj_Rng = {};

    obj_Rng.random = Math.random;

    /*
    * Return random number betwen min and max. If only 1 argument, then it's a max.
    */
    obj_Rng.range = function Rng_range(boundary1, boundary2) {
        let min, max;
        if (boundary2 == undefined) {
            min = 0;
            max = boundary1;
        } else {
            min = boundary1;
            max = boundary2;
        }
        return obj_Rng.random() * (max - min) + min;
    }

    /*
    * return a random element from array
    */
    obj_Rng.select = function Rng_select(array) {
        return array[Math.floor(obj_Rng.random() * array.length)];
    }

    /* 
    * return a random item.value from array
    *  selected randomly but weighted according to item.weight
    */
    obj_Rng.selectWeighted = function Rng_selectWeighted(array) {

        let selectedItem;
        let selectedScore = 0;
        array.forEach(function iterateArray(v, _i, _a) {
            let score = obj_Rng.random() * v.weight;
            if (score > selectedScore) {
                selectedItem = v.value;
                selectedScore = score;
            }
        });
        return selectedItem;
    }

    function Rng_selectMany(array, n) {
        // select n times a random element in the array, not necessarily uniques
        // return the array of selected n elements
        let selected = [];
        n = n || 1;
        for (let i = 0; i < n; i++) {
            selected.push(select(array));
        }
        return selected;
    }

    function Rng_selectWeightedMany(array, n) {
        // select n times a random element in the array
        // selected randomly but weighted according to item.weight
        // not necessarily uniques
        // return the array of selected n elements
        let selected = [];
        n = n || 1;
        for (let i = 0; i < n; i++) {
            selected.push(selectWeighted(array));
        }
        return selected;
    }

    return obj_Rng;
})();

/*
*   Linear interpolation between value0 and value1, for parameter t between 0 and 1
*/
export function lerp(value0, value1, t, edge0, edge1) {
    if (edge0 == undefined) {
        edge0 = 0.0;
    }
    if (edge1 == undefined) {
        edge1 = 1.0;
    }
    // Scale, bias and saturate x to 0..1 range
    t = clamp((t - edge0) / (edge1 - edge0), 0.0, 1.0);
    return (1 - t) * value0 + t * value1;
}

/*
*   Smooth interpolation between value0 and value1, for parameter t between edge0 and edge1
*/
export function smoothstep(value0, value1, t, edge0, edge1) {
    if (edge0 == undefined) {
        edge0 = 0.0;
    }
    if (edge1 == undefined) {
        edge1 = 1.0;
    }
    // Scale, bias and saturate x to 0..1 range
    t = clamp((t - edge0) / (edge1 - edge0), 0.0, 1.0);
    // Evaluate polynomial
    return value0 + (value1 - value0) * t * t * (3 - 2 * t);
}

export function clamp(x, lowerLimit, upperLimit) {
    if (x < lowerLimit) {
        return lowerLimit;
    } else if (x > upperLimit) {
        return upperLimit;
    } else {
        return x;
    }
}