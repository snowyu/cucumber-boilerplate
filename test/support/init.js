var Yadda = require('yadda'),
    config = require('./configure'),
    language = Yadda.localisation[upperCaseFirstLetter(config.language)],
    chai = require('chai'),
    path = require('path'),
    glob = require('glob'),
    mkdirp = require('mkdirp'),
    merge = require('deepmerge'),
    beforeHook = require('../hooks/before.js'),
    afterHook = require('../hooks/after.js'),
    beforeEachHook = require('../hooks/beforeEach.js'),
    afterEachHook = require('../hooks/afterEach.js'),
    processed = 0,
    fileCount = null,
    context = {},
    currentStep,
    runIsolateTestOnly = false,
    files = [];

/**
 * expose assertion library
 */
global.expect = chai.expect;
global.assert = chai.assert;
global.should = chai.should();

/**
 * register own global namespace
 */
global.testscope = {};

if (!language)
    console.error('no such language:', upperCaseFirstLetter(config.language));
else
    Yadda.localisation.default = language;
Yadda.plugins.mocha.StepLevelPlugin.init();

/**
 * gather feature files
 */
config.featureFiles.forEach(function (globPattern) {
    glob.sync(
        globPattern,
        {
            cwd: path.join(__dirname, '..', '..')
        }
    ).forEach(function (file) {
        files.push(path.join(__dirname, '..', '..', file));
    });
});

/**
 * Looking for tests scenarios to run in isolation, if found set the flag to run only those
 */
files.forEach(function (file, i, files) {
    featureFile(
        file,
        function (feature) {
            scenarios(
                feature.scenarios,
                function (scenario) {
                    if (scenario.annotations.isolate) {
                        runIsolateTestOnly = true;
                    }
                }
            );
        }
    );
});

files.forEach(function (file, i, files) {
    fileCount = (fileCount === null) ? files.length : fileCount;

    featureFile(
        file,
        function (feature) {
            if (feature.annotations.pending) {
                fileCount--;
            }

            before(function (done) {
                if (processed === 0) {
                    return beforeHook.call(global.testscope, beforeEachHook.bind(global.testscope, done));
                }

                beforeEachHook.call(global.testscope, done);
            });

            scenarios(
                feature.scenarios,
                function (scenario) {
                    var stepDefinitions = require('./step-definitions'),
                        yadda = new Yadda.Yadda(stepDefinitions, context);

                    if (runIsolateTestOnly &&
                        !scenario.annotations.isolate &&
                        !scenario.annotations.only
                    ) {
                        return;
                    }

                    steps(
                        scenario.steps,
                        function (step, done) {
                            var context = merge(global.testscope, config.env);

                            if (scenario.annotations.executedBy) {
                                context.browser = context.browser.select(scenario.annotations.executedBy);
                            }

                            yadda.run(step, context, done);
                        }
                    );
                }
            );

            Yadda.EventBus.instance().on(
                Yadda.EventBus.ON_EXECUTE,
                function (event) {
                    currentStep = event.data.step;
                }
            );

            afterEach(function(done) {
                takeScreenshotOnFailure(this.currentTest, global.testscope.browser, done);
            });

            after(function (done) {
                if (++processed === fileCount) {
                    return afterEachHook.call(global.testscope, afterHook.bind(global.testscope, done));
                }

                afterEachHook.call(global.testscope, done);
            });

        }
    );
});

function takeScreenshotOnFailure(test, browser, done) {
    var screenshotPath;
    if (config && config.options)
        screenshotPath = config.options.screenshotPath; //|| 'screenshots'
    if (screenshotPath && test.state != 'passed') {
        try {
            fs.statSync(screenshotPath)
        } catch (e) {
            mkdirp.sync(screenshotPath)
        }
        //var capId = sanitize.caps(browser.desiredCapabilities)
        //var timestamp = new Date().toJSON().replace(/:/g, '-');
        screenshotPath = path.join(screenshotPath, 'ERROR_' + test.title.replace(/\W+/g, '_').toLowerCase() + '.png');
        browser.saveScreenshot(screenshotPath);
    }
    done();
}

function upperCaseFirstLetter(word) {
    return word.slice(0, 1).toUpperCase() + word.slice(1);
}
