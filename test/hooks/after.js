var AfterHook = module.exports = function (done) {
    this.browser.end().then(function(content){
      //if (content && content.status === 0)
        done();
    });
};
