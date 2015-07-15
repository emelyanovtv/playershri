

(function(window){
    var _t = null;
    var palyerSHRI = function(obj, params)
    {
        return new playerSHRI.lib.init(obj,params);
    }

    palyerSHRI.lib = palyerSHRI.prototype =
    {
        params : {},
        context: window.document, //контекст
        audioContext: null,       //аудио контекст window.AudioContext || window.webkitAudioContext
        source : null,            //источник
        audioBuffer:null,         //буффер
        startedAt:0,              //время начала проигрования
        input:null,                //input(file) элемент для загрузки файла
        timer:null,                //id - setInterval
        timePast:0,                //сколкько аермени прошло
        pausedAt:0,                //сколкько аермени прошло
        dropZone:null,             //блок для drag & drop
        maxFileSize:15000000,      //максимальный размер файла 15 мегабайт
        sampleSize:2048,           //размер буффера
        node:null,                 //ScriptProcessorNode
        analyzer:null,             // AnalyserNode
        visualizationWidth:20,     // ширина полоски для 3 - типа визуализации
        canvasWidth:400,           // ширина блока визуализации
        canvasHeight:150,          // высота блока визуализации
        object: null,              // основной блок , в котром находится плеер
        file:null,                  // файл котрый загружен или с input или с помощью drag & drop
        visualizationColor:'#E32DE3', // цвет аизуализации
        amplitudeArray:[], // массив с чатотами
        filters:null,      // массив фильтров которые накладываются на источник
        visulization:null, // объект визуализации (canvas)
        play:false,        // воспроизвоидится или нет
        visualizationType:2, //тип визуализации
        eqDefault:'normal',  //эквалайзер по умолчанию
        equalizerBox:null,   //объект с списком возможных эквалайзеров
        buttons:null,        //объект с кнопками
        constructor: palyerSHRI,
        /*
         * 5 типов эквалайзера с настройками для разных частот
         */
        equalazerParameters:
        {
            normal:{name:'normal', vals:{f32:0, f64:0, f128:0,f256:0,f512:0, f1024:0, f2048:0, f4096:0, f8192:0, f16384:0}},
            rock:{name:'rock',vals:{f32:3, f64:2, f128:1,f256:0,f512:-3, f1024:-3.5, f2048:-1.8, f4096:0, f8192:2, f16384:2.5}},
            pop:{name:'pop',vals:{f32: -1.5, f64:-1.2, f128:0,f256:1.8,f512:3.7, f1024:3.7, f2048:2.1, f4096:0, f8192:-1.5, f16384:-2}},
            jazz:{name:'jazz',vals:{f32: 0, f64:3, f128:0,f256:0,f512:-3, f1024:-3, f2048:0, f4096:0, f8192:2.5, f16384:3.5}},
            classic:{name:'classic',vals:{f32: 0, f64:3, f128:2.5,f256:1,f512:-2, f1024:-2, f2048:-2, f4096:2, f8192:3, f16384:4}}
        },
        /*
         * Обработчики который будут вешаться на созданные элементы для плеера
         */
        customEvents : {
            dragover : function(){
                _t.removeClass(this, 'drop');
                _t.addClass(this, 'hover');
                return false;
            },
            dragleave : function(){
                _t.removeClass(this, 'hover');
                return false;
            },
            drop : function(e) {
                _t.prepareFile(e, 'dataTransfer');

            },
            change:function(e){
                _t.prepareFile(e, 'target');
            },
            changeeq:function(e){
                _t.eqDefault = this.value;
                _t.equalize();
                return true;
            },
            onplay : function(){
                _t.playSound();
                return false;
            },
            onstop : function(){
                _t.stopSound();
                return false;
            },
            inputclick : function(){
                _t.removeClass(this,'drop');
                _t.addClass(this, 'hover');
                return true;
            },
            audioprocess : function () {

                // get the Time Domain data for this sample
                _t.analyzer.getByteTimeDomainData(_t.amplitudeArray);
                // draw the display if the audio is playing
                if (_t.play == true) {
                    _t.drawTimeDomain();
                }
            }
        },
        /*
         * Функция инициализирования плеера
         * @param obj {Object}
         * @param params {Object}
         * @return {Object} (self)
         */
        init:function(obj, params)
        {
            this.params = params;
            if(typeof(obj) != 'undefined')
            {
                this.object = obj;
                if ((!window.AudioContext && !window.webkitAudioContext) || typeof(window.FileReader) == 'undefined') {
                    this.error('Данный плеер не поддерживается вашим браузером!');
                }
                else
                {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext);
                    this.prepareParams();
                    this.addPlayerHtml();
                    this.initEvents();
                }
            }

            return this;

        },
        /*
         * Функция которая задает параметры
         */
        prepareParams:function()
        {
            if(typeof(this.params) == "object")
            {
                for(param in this.params)
                {
                    if(param in this)
                        this[param] = this.params[param];
                }
            }

        },
        /*
         * Функция Добавляет html в объект вызывается при инициализации
         * void
         */
        addPlayerHtml : function()
        {
            var html = "<div class='b-mainblock'>"
            html+= "<div class='b-file'>";
            html += "<input type='file' name='file' value=''/>";
            html += "</div>";
            html += "<div id='dropZone' class='b-dropzone'>";
            html += "<span class='b-mainblock__text'>Бросать сюда</span>";
            html += "</div>";
            html += "<div class='b-song'>";
            html+= "<div class='b-equalizer'>";
            html += 'Эквалайзер: '+this.getEqulizerSelect();
            html += "</div>";
            html += "<div class='b-buttons'>";
            html += "<button class='b-buttons_play'>Play</button>";
            html += "<button class='b-buttons_stop'>Stop</button>";

            html += "</div>";
            html += "</div>";

            html += "</div>";
            this.html(this.object,html);
            this.buttons = this.getBySelectors('.b-buttons button');
            this.dropZone = this.getByID("dropZone");
            this.input = this.getBySelectors('input[type="file"]');
            this.equalizerBox = this.getBySelectors('.b-equalizer select');

        },
        /*
         * Функция делает список с возможными типами эквалайзера
         *  @return {String} html
         */
        getEqulizerSelect:function(){
            var html = "<select name='equlaizer'>";
            for(key in this.equalazerParameters)
            {
                if (this.equalazerParameters.hasOwnProperty(key)) {

                    var obj = this.equalazerParameters[key];
                    var selected = (this.eqDefault == key) ? ' selected ' : ' ';
                    html+= "<option" + selected + "value='"+key+"'>";
                    html+= obj.name;
                    html+= "</option>";

                }
            }
            html += "</select>";
            return html;

        },
        /*
         * Функция добавляет обработчкики для уже существующих элемнтов
         * void
         */
        initEvents : function()
        {
            _t = this;
            var events =
                [
                    {element:this.dropZone,event:'ondragover', handler:this.customEvents.dragover},
                    {element:this.dropZone,event:'ondragleave', handler:this.customEvents.dragleave},
                    {element:this.dropZone,event:'ondrop', handler:this.customEvents.drop},
                    {element:this.input[0],event:'onclick', handler:this.customEvents.inputclick},
                    {element:this.input[0],event:'onchange', handler:this.customEvents.change},
                    {element:this.buttons[0],event:'onclick', handler:this.customEvents.onplay},
                    {element:this.buttons[1],event:'onclick', handler:this.customEvents.onstop},
                    {element:this.equalizerBox[0],event:'onchange', handler:this.customEvents.changeeq}


                ];
            for(var i = 0; i < events.length; i++)
            {

                this.addEvent(events[i].element, events[i].event, events[i].handler);
            }


        },
        /*
         * Функция добавляет обработчкик для конкретного элемента
         * @param elem {Object}
         * @param type {String}
         * @param handler {Function}
         * void
         */
        addEvent : function(elem , type, handler){
            if(typeof elem != 'undefined')
                elem[type] = handler;
        },
        /*
         * Функция для обработчика событий из input и блока drop{dropzZone}
         * @param e {Event}
         * @param type {String}
         */
        prepareFile: function(e, type)
        {
            e.stopPropagation();
            e.preventDefault();
            this.removeClass(this.dropZone, 'hover');

            var file = e[type].files[0];
            var url = file.urn || file.name;
            console.log(url);
            if(typeof(file) == 'object')
            {
                if (file.size > this.maxFileSize) {
                    _t.error('Файл слишком большой!');
                    return false;
                }
                this.addClass(this.dropZone, 'drop');
                this.file = file;
                var reader = new FileReader();
                this.toggleElements(true);
                reader.onload = function(ev) {
                    _t.clearParams();
                    _t.initSound(ev.target.result);
                };
                this.removeClass(this.object, 'b-error');
                reader.readAsArrayBuffer(file);
            }

        },
        /*
         * Функция инициализации звукового файла
         * @param ArrayBuffer
         * void
         */
        initSound : function(arrayBuffer)
        {
            this.audioContext.decodeAudioData(arrayBuffer, function(buffer) {
                _t.audioBuffer = buffer;
                _t.show(_t.getByClass('b-song')[0]);
                _t.toggleElements(false);
                _t.loadSongInfo();
            }, function(e) {
                _t.removeClass(this.dropZone, 'drop');
                _t.error('Формат данного файла не поддерживается!');
            });
        },
        /*
         * Функция для запуска проигрования песни
         * void
         */
        playSound :function(){
            if(!this.play)
            {
                this.play = true;

                this.timer = setInterval(this.counterSeconds, 1000);
                this.createSource();// пересоздаем source потому-что вызывается только один раз
                this.getVisualization();
                this.equalize();
                this.addEvent(this.node, 'onaudioprocess', this.customEvents.audioprocess);
                if (this.pausedAt)
                {
                    this.startedAt = Date.now() - this.pausedAt;
                    this.source.start(0, this.pausedAt / 1000);
                }
                else
                {
                    this.startedAt = Date.now();
                    this.source.start(0);
                }
            }
        },
        /*
         * Функция для запуска песни
         * void
         */
        stopSound:function() {

            this.source.stop(0);
            clearInterval(this.timer);
            this.pausedAt = Date.now() - this.startedAt;
            this.play = false;
            this.timePast = 0;
            this.addEvent(this.node, 'onaudioprocess', null);
        },
        /*
         * Функция для отсановки проигрования песни
         * void
         */
        clearParams:function(){
            if(this.play)
                this.stopSound();

            this.pausedAt = 0;
            this.startedAt = 0;
            _t.clearVisualization();
        },
        /*
         * Функция для делать элементы и кнопки включеными или выключеными
         * void
         */
        toggleElements:function(val){
            this.buttons[0].disabled = val;
            this.buttons[1].disabled = val;
            this.equalizerBox[0].disabled = val;
        },
        /*
         * Функция для создания источника (пересоздается)
         * void
         */
        createSource:function()
        {
            this.source = this.audioContext.createBufferSource(); // Global so we can .noteOff() later.
            this.source.buffer = this.audioBuffer;
        },
        /*
         * Функция для создания анализатора частот
         * void
         */
        getVisualization:function()
        {
            this.node = this.audioContext.createScriptProcessor(this.sampleSize, 1, 1);
            this.analyzer = this.audioContext.createAnalyser();
            this.source.loop = false;
            this.source.connect(this.audioContext.destination);
            this.source.connect(this.analyzer);
            this.amplitudeArray = new Uint8Array(this.analyzer.frequencyBinCount);

            this.analyzer.connect(this.node );
            this.node.connect(this.audioContext.destination);


        },
        /*
         * Функция для очистки контеста канваса на котором будет наша визулизаци
         * void
         */
        clearVisualization:function(){
            if(this.visulization)
                this.visulization.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        },
        /*
         * Функция для отображения визулизации
         * void
         */
        drawTimeDomain:function() {
            this.clearVisualization();
            //первый тип  - только точки
            if(this.visualizationType == 0)
            {
                for (var i = 0; i < Math.round(this.amplitudeArray.length); i++) {
                    var value = this.amplitudeArray[i] / 256;
                    var y = this.canvasHeight - (_t.canvasHeight * value) - 1;
                    this.visulization.fillStyle = this.visualizationColor;
                    this.visulization.fillRect(i, y, 1, 1);
                }
            }
            //второй тип  - волнообразная масса
            if(this.visualizationType == 1)
            {
                for (var i = 0; i < Math.round(this.amplitudeArray.length); i++) {
                    var value = this.amplitudeArray[i] / 256;
                    var y = this.canvasHeight - (_t.canvasHeight * value) - 1;
                    this.visulization.fillStyle = this.visualizationColor;
                    this.visulization.fillRect(i, this.canvasHeight, 1, -y);
                }
            }
            if(this.visualizationType == 2)
            {
                //Получаем кол-во полос в зависимости от ширины окна и ширины полоски
                var needElements = this.canvasWidth / this.visualizationWidth;
                //Получаем делитель
                var divedeNum = Math.round(this.amplitudeArray.length/ needElements);

                for (var i = 0; i < Math.round(this.amplitudeArray.length/ divedeNum); i++) {
                    var value = this.amplitudeArray[i*divedeNum] / 256;
                    var y = this.canvasHeight - (_t.canvasHeight * value);
                    this.visulization.fillStyle = this.visualizationColor;
                    this.visulization.fillRect(i*this.visualizationWidth, this.canvasHeight, this.visualizationWidth- 0.5, -y);
                }
            }
        },
        /*
         * Функция для отображения информации о файле
         * @void
         */
        loadSongInfo:function()
        {
            var data = "<div class='b-songinfo'>";
            data += "<span class='b-songinfo__name'>";
            data += this.file.name;
            data += "</span><br/>";
            data += "<span class='b-songinfo__time'>";
            data += "Осталось - <span>" + this.getTimeForSong(this.audioBuffer.duration) + "</span>";
            data += "</span><br/>";
            data += "<span class='b-songinfo__visualization'>";
            data += '<canvas id="canvas" width="' +this.canvasWidth+ '" height="' +this.canvasHeight+ '" ></canvas>';
            data += "</span><br/>";
            data += "</div>";
            this.html(this.getByClass('b-mainblock__text')[0], data);
            this.visulization = this.getByID('canvas').getContext("2d");
        },
        /*
         * Функция для преобразование секунд во время более привычное для плееров
         */
        getTimeForSong : function(duration)
        {
            var minutes = Math.floor(duration  / 60);
            var seconds = Math.round(duration - (minutes * 60));
            if (seconds < 10) seconds = '0'+seconds;
            return minutes + ':' +seconds;
        },
        /*
         * Функция для отсчета оставшегося времени (песни)
         */
        counterSeconds: function(){
            if(_t.timePast == 0)
                _t.timePast = Math.round(_t.pausedAt/1000);
            _t.timePast++;
            var nDur = _t.audioBuffer.duration - _t.timePast;
            if(nDur > 0)
            {
                var time = _t.getTimeForSong(nDur);
                _t.html(_t.getBySelectors('.b-songinfo__time span')[0], time);
            }
            else
            {
                _t.clearParams();
            }
        },
        /*
         * Создание фильтра с параметрами и значениями для каждой частоты
         * с определенным типом эквалайзера
         * @param {Number}
         * @return {BiquadFilterNode}
         */
        createFilter : function (frequency) {
            var filter = _t.audioContext.createBiquadFilter();
            _t.equalazerParameters.hasOwnProperty(_t.eqDefault)
            {
                var eq = _t.equalazerParameters[_t.eqDefault];
                var values = eq.vals;
                filter.type = 'peaking'; // тип фильтра
                filter.frequency.value = frequency; // частота
                filter.Q.value = 1; // Q-factor /(однооктавный)
                filter.gain.value = values['f'+frequency];

            }
            return filter;
        },
        /*
         * Создание фильтров по заданным частотам
         * @return {Array}
         */
        createFilters : function () {
            var frequencies = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384];
                this.filters = frequencies.map(this.createFilter);
            this.filters.reduce(function (prev, curr) {
                prev.connect(curr);
                return curr;
            });

            return this.filters;
        },
        /*
         * Функция для привязки эквалайзера к источнику
         */
        equalize : function () {
            if(this.filters)
                this.filters[this.filters.length - 1].disconnect(0);
            this.filters = this.createFilters();
            // источник цепляем к первому фильтру
            this.source.connect(this.filters[0]);
            // а последний фильтр - к выходу
            this.filters[this.filters.length - 1].connect(this.audioContext.destination);
        },
        /*
         * Функция для отображения ошибок плеера
         */
        error : function(text)
        {
            this.addClass(this.object, 'b-error');
            this.html(this.getByClass('b-mainblock__text')[0],text)
        },
        /*
         * Доп функции(чтобы не было зависиомти от jQuery) никаких проверок на существование объектов не делаю ()
         */
        getByID:function(name)
        {
            return this.context.getElementById(name);
        },
        getByClass:function(name)
        {
            return this.context.getElementsByClassName(name);
        },
        getBySelectors:function(s)
        {
            return this.context.querySelectorAll(s);
        },
        addClass:function(o, c)
        {
            var re = new RegExp("(^|\\s)" + c + "(\\s|$)", "g");
            if (re.test(o.className)) return;
            o.className = (o.className + " " + c).replace(/\s+/g, " ").replace(/(^ | $)/g, "");
        },
        show:function(o)
        {
            o.style.display = 'block';
        },
        removeClass:function(o, c)
        {
            var re = new RegExp("(^|\\s)" + c + "(\\s|$)", "g");
            o.className = o.className.replace(re, "$1").replace(/\s+/g, " ").replace(/(^ | $)/g, "");
        },
        html:function(o, h)
        {
            if(typeof o != 'undefined' && o != null)
                o.innerHTML = h;
        }

    }

    palyerSHRI.lib.init.prototype = palyerSHRI.lib;
    window.playerSHRI = palyerSHRI;
})(window);

