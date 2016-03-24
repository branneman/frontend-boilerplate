document.addEventListener('readystatechange', function () {

    if (document.readyState !== 'complete') return;

    var elems = document.querySelectorAll('[data-resize-to-content]');

    [].forEach.call(elems, function(elem) {

        var height = Math.max(
            elem.contentDocument.body.scrollHeight,
            elem.contentDocument.body.offsetHeight,
            elem.contentDocument.documentElement.clientHeight,
            elem.contentDocument.documentElement.scrollHeight,
            elem.contentDocument.documentElement.offsetHeight
        );

        elem.style.height = height + 'px';
    });

});
