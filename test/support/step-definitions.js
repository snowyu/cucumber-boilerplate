var Yadda = require('yadda'),
    language = Yadda.localisation.default,
    fs = require('fs'),
    path = require('path'),
    chai = require('chai');

module.exports = (function () {
    var library = language.library(),
        dictionary = new Yadda.Dictionary(),
        stepsFiles = path.join(__dirname, '..', 'steps'),
        steps = fs.readdirSync(stepsFiles);

    /**
     * define regex helpers
     */
    dictionary.define('string', '([^"]*)?');

    /**
     * define step library
     */
    steps.forEach(function (step) {
        require(path.join(stepsFiles, step)).call(library, dictionary);
    });

    return library;

})();
