var rockpool = rockpool || {};

function random(min,max){
   return Math.floor(Math.random()*(max-min+1)+min);
}
function randomf(min,max){
   return Math.random()*(max-min)+min;
}
var _ms_start = null;
function millis(){
    var now = new Date().getTime();
    if(!_ms_start){_ms_start = now}
    return now - _ms_start;
}

rockpool.run = function () {
}

rockpool.updateLoop = function() {
    rockpool.sync();
};

rockpool.initialize = function(){
    $(window).trigger('resize');

    FastClick.attach(document.body);


    /* resize chart canvases when the window resizes */
    $(window).resize(function () {
        rockpool.respond()
    });

    if(window.navigator.standalone){
        document.documentElement.requestFullscreen();
    }
    
    $('[data-translate]').each(function(){
        $(this).html( rockpool.languify( $(this).html() ) );
    });

    $.fancybox.defaults.padding = 0
    $.fancybox.defaults.margin = 0
    $.fancybox.defaults.modal = true
    $.fancybox.defaults.autoCenter = false
    $.fancybox.defaults.closeBtn = false
    $.fancybox.defaults.autoSize = false
    $.fancybox.defaults.width = "auto"
    $.fancybox.defaults.height = "auto"
    $.fancybox.defaults.scrolling = "no"
    $.fancybox.defaults.fitToView = false
    $.fancybox.defaults.fixed = true
    $.fancybox.defaults.topRatio = 0
    $.fancybox.defaults.leftRatio = 0
    
    $('[data-translate]').each(function(){
        $(this).html( rockpool.languify( $(this).html() ) );
    });

    //rockpool.addCommonTargets();
    //rockpool.addPreviousTargets();
    //rockpool.findHosts();

    rockpool.startDiscovery();
}

rockpool.channelToLabel = function(channel){
    return [
        rockpool.languify('eight'),
        rockpool.languify('seven'),
        rockpool.languify('six'),
        rockpool.languify('five'),
        rockpool.languify('four'),
        rockpool.languify('three'),
        rockpool.languify('two'),
        rockpool.languify('one')
    ][7-channel];
}

rockpool.channelToNumber = function(channel){
    return channel+1;

    return [
        '8',
        '7',
        '6',
        '5',
        '4',
        '3',
        '2',
        '1'
    ][channel];
}

rockpool.firstOfType = function(module_type){

    return rockpool.nthOfType(module_type, 0);

}

rockpool.nthOfType = function(module_type, n){

    for( k in rockpool.active_modules ){
        if(rockpool.active_modules[k].active){
            var module = k.split('_');
            var host = parseInt(module[0]);
            var channel = parseInt(module[1]);
            var module = module[2];

            if(module == module_type){
                if(n == 0){
                    return rockpool.active_modules[k];
                }
                n--;
            }
        }
    }
    return null;

}

rockpool.available_modules = [];

rockpool.runCookbookApp = function(my_app){
    rockpool.updatePalettes = function(){

        rockpool.updateAvailableCookbookModules();

        var available = rockpool.cookbookCheckModulesAvailable(my_app.requires);

        if( available ){
            //console.log('Running app');
            my_app.run();
        }
        else if( !available ){
            //console.log('Stopping app');
            my_app.stop();
        }

    }
    $(function () {rockpool.initialize()});
}

rockpool.updateAvailableCookbookModules = function() {
    rockpool.available_modules = [];

    for( k in rockpool.active_modules ){
        var div = $('.modules').find('.' + k);

        //console.log(k);

        if(rockpool.active_modules[k].active){
            var module = k.split('_');
            var host = parseInt(module[0]);
            var channel = parseInt(module[1]);
            var module = module[2];

            rockpool.available_modules.push(module);

            if( div.length == 0 ){
                div = $('<div>').addClass(k)
                $('<i>').addClass('icon-' + module).appendTo(div);
                $('<strong>').text(module).appendTo(div);
                $('<span>').text(rockpool.channelToLabel(channel)).appendTo(div);
                div.appendTo('.modules');
            }

        }
        else
        {
            if( div.length != 0 ){
                div.remove();
            }
        }
    }
}

rockpool.cookbookCheckModulesAvailable = function(modules) {
    for(module_index in modules){
        var module_name = modules[module_index];
        var count = 1;
        if(module_name.indexOf(":") > -1){
            var req = module_name.split(":");
            module_name = req[0];
            count = parseInt(req[1]);
        }
        if( rockpool.available_modules.filter(function(value){return value === module_name;}).length < count ){
            //console.log("Error, could not find enough ", module_name, count, rockpool.available_modules.filter(function(value){return value === module_name;}).length);
            return false;
        }
    }
    //console.log("Found enough ", module_name);
    return true;
}

rockpool.updateActiveCookbookRecipes = function() {
    $('.recipe').each(function(idx, obj){
        var recipe = $(obj);
        var requires = recipe.data('requires').split(',');

        var x = requires.length;
        var missing = 0;
        while(x--){
            var requirement = requires[x];
            var count = 1;
            if(requires[x].indexOf(":") > -1){
                requirement = module_name.split(":")[0];
                count = parseInt(module_name.split(":")[1]);
            }

            if( rockpool.available_modules.filter(function(value){return value === module_name;}).length < count ){
                recipe.find('.requires .' + requires[x]).removeClass('available');
                missing++;
            }
            else
            {
                recipe.find('.requires .' + requires[x]).addClass('available');  
            }
        }
        if( missing > 0 ){
            $(obj).removeClass('enabled');
            return;
        }
        $(obj).addClass('enabled');
    })
}

/* Hook updatePalettes as it's called when a module is connected/disconnected */
rockpool.updatePalettes = function(){

    rockpool.updateAvailableCookbookModules();
    rockpool.updateActiveCookbookRecipes();


}
