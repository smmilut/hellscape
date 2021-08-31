/*
 * Utilities module
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
        const ImageLoader_registry = new Set();

        /*
        * Get image from cache or load it if not found
        */
        obj_ImageLoader.get = function ImageLoader_get(src) {
            for (let image of ImageLoader_registry) {
                if (image.src == src) {
                    // get from cache
                    return new Promise(function promiseImageFromCache(resolve, reject) {
                        resolve(image);
                    });
                }
            }
            // not found in cache
            return loadImage(src);
        };

        /*
        * Actually load image file (not from cache)
        */
        function loadImage(src) {
            const image = new Image();
            image.src = src;
            return new Promise(function promiseImageLoading(resolve, reject) {
                image.onload = function onloadImage() {
                    ImageLoader_registry.add(image);
                    resolve(image);
                };
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
