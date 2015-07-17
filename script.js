
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
        metadata:null,                //метаданные
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
                    requestAnimationFrame(_t.drawTimeDomain, _t);
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
            _t = this;
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
            html += "<div id='spinner' class='b-spinner'>";
            html += "</div>";
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
            this.spinner = this.getByID("spinner");
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
            if(typeof(file) == 'object')
            {
                if (file.size > this.maxFileSize) {
                    _t.error('Файл слишком большой!');
                    return false;
                }
                else
                {
                    this.addClass(this.dropZone, 'drop');
                    this.file = file;;
                    var reader = new FileReader();
                    this.toggleElements(true);
                    reader.onload = function(ev) {
                        _t.clearParams();
                        _t.initSound(ev.target.result);
                    };
                    this.removeClass(this.object, 'b-error');
                    reader.readAsArrayBuffer(file);
                }
            }

        },
        renderSong:function(tags){
            _t.metadata = tags;
            _t.loadSongInfo();
            _t.toggleElements(false);
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
                ID3v2.parseFile(_t.file,_t.renderSong);
                _t.show(_t.getByClass('b-song')[0]);
            }, function(e) {
                _t.removeClass(_t.dropZone, 'drop');
                _t.error('Формат данного файла не поддерживается!');
                _t.toggleElements(false);
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
            if(val)
            {
                this.show(this.spinner);
                this.hide(this.getByClass('b-mainblock__text')[0]);
            }
            else
            {
                this.hide(this.spinner);
                this.show(this.getByClass('b-mainblock__text')[0]);
            }

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
            _t.clearVisualization();
            //первый тип  - только точки
            if(_t.visualizationType == 0)
            {
                for (var i = 0; i < Math.round(_t.amplitudeArray.length); i++) {
                    var value = _t.amplitudeArray[i] / 256;
                    var y = _t.canvasHeight - (_t.canvasHeight * value) - 1;
                    _t.visulization.fillStyle = _t.visualizationColor;
                    _t.visulization.fillRect(i, y, 1, 1);
                }
            }
            //второй тип  - волнообразная масса
            if(_t.visualizationType == 1)
            {
                for (var i = 0; i < Math.round(_t.amplitudeArray.length); i++) {
                    var value = _t.amplitudeArray[i] / 256;
                    var y = _t.canvasHeight - (_t.canvasHeight * value) - 1;
                    _t.visulization.fillStyle = _t.visualizationColor;
                    _t.visulization.fillRect(i, _t.canvasHeight, 1, -y);
                }
            }
            if(_t.visualizationType == 2)
            {
                //Получаем кол-во полос в зависимости от ширины окна и ширины полоски
                var needElements = _t.canvasWidth / _t.visualizationWidth;
                //Получаем делитель
                var divedeNum = Math.round(_t.amplitudeArray.length/ needElements);

                for (var i = 0; i < Math.round(_t.amplitudeArray.length/ divedeNum); i++) {
                    var value = _t.amplitudeArray[i*divedeNum] / 256;
                    var y = _t.canvasHeight - (_t.canvasHeight * value);
                    _t.visulization.fillStyle = _t.visualizationColor;
                    _t.visulization.fillRect(i*_t.visualizationWidth, _t.canvasHeight, _t.visualizationWidth- 0.5, -y);
                }
            }
        },
        /*
         * Функция для отображения информации о файле
         * @void
         */
        loadSongInfo:function()
        {
            var name = "";
            if(typeof this.metadata == "object")
            {
                if(this.metadata.hasOwnProperty('Artist') && this.metadata.hasOwnProperty('Title'))
                {
                    if(this.metadata.Artist.trim().length > 0 && this.metadata.Title.trim().length > 0)
                        name = "Исполнитель : " + this.metadata.Artist + "; Название: " + this.metadata.Title;
                }
            }
            var data = "<div class='b-songinfo'>";
            data += "<span class='b-songinfo__name'>";
            data += this.file.name+"<br/>";
            if(name.length)
                data += name;
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
        hide:function(o)
        {
            o.style.display = 'none';
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

   /*
    * Служит для определения артиста по бинарному файлу
    */
    ID3v2 = {
        parseStream: function(stream, onComplete){

            var PICTURE_TYPES = {
                "0": "Other",
                "1": "32x32 pixels 'file icon' (PNG only)",
                "2": "Other file icon",
                "3": "Cover (front)",
                "4": "Cover (back)",
                "5": "Leaflet page",
                "6": "Media (e.g. lable side of CD)",
                "7": "Lead artist/lead performer/soloist",
                "8": "Artist/performer",
                "9": "Conductor",
                "A": "Band/Orchestra",
                "B": "Composer",
                "C": "Lyricist/text writer",
                "D": "Recording Location",
                "E": "During recording",
                "F": "During performance",
                "10": "Movie/video screen capture",
                "11": "A bright coloured fish", //<--- WTF?
                "12": "Illustration",
                "13": "Band/artist logotype",
                "14": "Publisher/Studio logotype",
            }

            //from: http://bitbucket.org/moumar/ruby-mp3info/src/tip/lib/mp3info/id3v2.rb
            //TODO: replace with something longer
            var TAGS = {
                "AENC": "Audio encryption",
                "APIC": "Attached picture",
                "COMM": "Comments",
                "COMR": "Commercial frame",
                "ENCR": "Encryption method registration",
                "EQUA": "Equalization",
                "ETCO": "Event timing codes",
                "GEOB": "General encapsulated object",
                "GRID": "Group identification registration",
                "IPLS": "Involved people list",
                "LINK": "Linked information",
                "MCDI": "Music CD identifier",
                "MLLT": "MPEG location lookup table",
                "OWNE": "Ownership frame",
                "PRIV": "Private frame",
                "PCNT": "Play counter",
                "POPM": "Popularimeter",
                "POSS": "Position synchronisation frame",
                "RBUF": "Recommended buffer size",
                "RVAD": "Relative volume adjustment",
                "RVRB": "Reverb",
                "SYLT": "Synchronized lyric/text",
                "SYTC": "Synchronized tempo codes",
                "TALB": "Album",
                "TBPM": "BPM",
                "TCOM": "Composer",
                "TCON": "Genre",
                "TCOP": "Copyright message",
                "TDAT": "Date",
                "TDLY": "Playlist delay",
                "TENC": "Encoded by",
                "TEXT": "Lyricist",
                "TFLT": "File type",
                "TIME": "Time",
                "TIT1": "Content group description",
                "TIT2": "Title",
                "TIT3": "Subtitle",
                "TKEY": "Initial key",
                "TLAN": "Language(s)",
                "TLEN": "Length",
                "TMED": "Media type",
                "TOAL": "Original album",
                "TOFN": "Original filename",
                "TOLY": "Original lyricist",
                "TOPE": "Original artist",
                "TORY": "Original release year",
                "TOWN": "File owner",
                "TPE1": "Artist",
                "TPE2": "Band",
                "TPE3": "Conductor",
                "TPE4": "Interpreted, remixed, or otherwise modified by",
                "TPOS": "Part of a set",
                "TPUB": "Publisher",
                "TRCK": "Track number",
                "TRDA": "Recording dates",
                "TRSN": "Internet radio station name",
                "TRSO": "Internet radio station owner",
                "TSIZ": "Size",
                "TSRC": "ISRC (international standard recording code)",
                "TSSE": "Software/Hardware and settings used for encoding",
                "TYER": "Year",
                "TXXX": "User defined text information frame",
                "UFID": "Unique file identifier",
                "USER": "Terms of use",
                "USLT": "Unsychronized lyric/text transcription",
                "WCOM": "Commercial information",
                "WCOP": "Copyright/Legal information",
                "WOAF": "Official audio file webpage",
                "WOAR": "Official artist/performer webpage",
                "WOAS": "Official audio source webpage",
                "WORS": "Official internet radio station homepage",
                "WPAY": "Payment",
                "WPUB": "Publishers official webpage",
                "WXXX": "User defined URL link frame"
            };

            var TAG_MAPPING_2_2_to_2_3 = {
                "BUF": "RBUF",
                "COM": "COMM",
                "CRA": "AENC",
                "EQU": "EQUA",
                "ETC": "ETCO",
                "GEO": "GEOB",
                "MCI": "MCDI",
                "MLL": "MLLT",
                "PIC": "APIC",
                "POP": "POPM",
                "REV": "RVRB",
                "RVA": "RVAD",
                "SLT": "SYLT",
                "STC": "SYTC",
                "TAL": "TALB",
                "TBP": "TBPM",
                "TCM": "TCOM",
                "TCO": "TCON",
                "TCR": "TCOP",
                "TDA": "TDAT",
                "TDY": "TDLY",
                "TEN": "TENC",
                "TFT": "TFLT",
                "TIM": "TIME",
                "TKE": "TKEY",
                "TLA": "TLAN",
                "TLE": "TLEN",
                "TMT": "TMED",
                "TOA": "TOPE",
                "TOF": "TOFN",
                "TOL": "TOLY",
                "TOR": "TORY",
                "TOT": "TOAL",
                "TP1": "TPE1",
                "TP2": "TPE2",
                "TP3": "TPE3",
                "TP4": "TPE4",
                "TPA": "TPOS",
                "TPB": "TPUB",
                "TRC": "TSRC",
                "TRD": "TRDA",
                "TRK": "TRCK",
                "TSI": "TSIZ",
                "TSS": "TSSE",
                "TT1": "TIT1",
                "TT2": "TIT2",
                "TT3": "TIT3",
                "TXT": "TEXT",
                "TXX": "TXXX",
                "TYE": "TYER",
                "UFI": "UFID",
                "ULT": "USLT",
                "WAF": "WOAF",
                "WAR": "WOAR",
                "WAS": "WOAS",
                "WCM": "WCOM",
                "WCP": "WCOP",
                "WPB": "WPB",
                "WXX": "WXXX"
            };

            //pulled from http://www.id3.org/id3v2-00 and changed with a simple replace
            //probably should be an array instead, but thats harder to convert -_-
            var ID3_2_GENRES = {
                "0": "Blues",
                "1": "Classic Rock",
                "2": "Country",
                "3": "Dance",
                "4": "Disco",
                "5": "Funk",
                "6": "Grunge",
                "7": "Hip-Hop",
                "8": "Jazz",
                "9": "Metal",
                "10": "New Age",
                "11": "Oldies",
                "12": "Other",
                "13": "Pop",
                "14": "R&B",
                "15": "Rap",
                "16": "Reggae",
                "17": "Rock",
                "18": "Techno",
                "19": "Industrial",
                "20": "Alternative",
                "21": "Ska",
                "22": "Death Metal",
                "23": "Pranks",
                "24": "Soundtrack",
                "25": "Euro-Techno",
                "26": "Ambient",
                "27": "Trip-Hop",
                "28": "Vocal",
                "29": "Jazz+Funk",
                "30": "Fusion",
                "31": "Trance",
                "32": "Classical",
                "33": "Instrumental",
                "34": "Acid",
                "35": "House",
                "36": "Game",
                "37": "Sound Clip",
                "38": "Gospel",
                "39": "Noise",
                "40": "AlternRock",
                "41": "Bass",
                "42": "Soul",
                "43": "Punk",
                "44": "Space",
                "45": "Meditative",
                "46": "Instrumental Pop",
                "47": "Instrumental Rock",
                "48": "Ethnic",
                "49": "Gothic",
                "50": "Darkwave",
                "51": "Techno-Industrial",
                "52": "Electronic",
                "53": "Pop-Folk",
                "54": "Eurodance",
                "55": "Dream",
                "56": "Southern Rock",
                "57": "Comedy",
                "58": "Cult",
                "59": "Gangsta",
                "60": "Top 40",
                "61": "Christian Rap",
                "62": "Pop/Funk",
                "63": "Jungle",
                "64": "Native American",
                "65": "Cabaret",
                "66": "New Wave",
                "67": "Psychadelic",
                "68": "Rave",
                "69": "Showtunes",
                "70": "Trailer",
                "71": "Lo-Fi",
                "72": "Tribal",
                "73": "Acid Punk",
                "74": "Acid Jazz",
                "75": "Polka",
                "76": "Retro",
                "77": "Musical",
                "78": "Rock & Roll",
                "79": "Hard Rock",
                "80": "Folk",
                "81": "Folk-Rock",
                "82": "National Folk",
                "83": "Swing",
                "84": "Fast Fusion",
                "85": "Bebob",
                "86": "Latin",
                "87": "Revival",
                "88": "Celtic",
                "89": "Bluegrass",
                "90": "Avantgarde",
                "91": "Gothic Rock",
                "92": "Progressive Rock",
                "93": "Psychedelic Rock",
                "94": "Symphonic Rock",
                "95": "Slow Rock",
                "96": "Big Band",
                "97": "Chorus",
                "98": "Easy Listening",
                "99": "Acoustic",
                "100": "Humour",
                "101": "Speech",
                "102": "Chanson",
                "103": "Opera",
                "104": "Chamber Music",
                "105": "Sonata",
                "106": "Symphony",
                "107": "Booty Bass",
                "108": "Primus",
                "109": "Porn Groove",
                "110": "Satire",
                "111": "Slow Jam",
                "112": "Club",
                "113": "Tango",
                "114": "Samba",
                "115": "Folklore",
                "116": "Ballad",
                "117": "Power Ballad",
                "118": "Rhythmic Soul",
                "119": "Freestyle",
                "120": "Duet",
                "121": "Punk Rock",
                "122": "Drum Solo",
                "123": "A capella",
                "124": "Euro-House",
                "125": "Dance Hall"
            };

            var tag = {
                pictures: []
            };


            var max_size = Infinity;

            function read(bytes, callback){
                stream(bytes, callback, max_size);
            }


            function encode_64(input) {
                var output = "", i = 0, l = input.length,
                    key = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
                    chr1, chr2, chr3, enc1, enc2, enc3, enc4;
                while (i < l) {
                    chr1 = input.charCodeAt(i++);
                    chr2 = input.charCodeAt(i++);
                    chr3 = input.charCodeAt(i++);
                    enc1 = chr1 >> 2;
                    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                    enc4 = chr3 & 63;
                    if (isNaN(chr2)) enc3 = enc4 = 64;
                    else if (isNaN(chr3)) enc4 = 64;
                    output = output + key.charAt(enc1) + key.charAt(enc2) + key.charAt(enc3) + key.charAt(enc4);
                }
                return output;
            }



            function parseDuration(ms){
                var msec = parseInt(cleanText(ms)) //leading nulls screw up parseInt
                var secs = Math.floor(msec/1000);
                var mins = Math.floor(secs/60);
                var hours = Math.floor(mins/60);
                var days = Math.floor(hours/24);

                return {
                    milliseconds: msec%1000,
                    seconds: secs%60,
                    minutes: mins%60,
                    hours: hours%24,
                    days: days
                };
            }


            function pad(num){
                var arr = num.toString(2);
                return (new Array(8-arr.length+1)).join('0') + arr;
            }

            function arr2int(data){
                if(data.length == 4){
                    if(tag.revision > 3){
                        var size = data[0] << 0x15;
                        size += data[1] << 14;
                        size += data[2] << 7;
                        size += data[3];
                    }else{
                        var size = data[0] << 24;
                        size += data[1] << 16;
                        size += data[2] << 8;
                        size += data[3];
                    }
                }else{
                    var size = data[0] << 16;
                    size += data[1] << 8;
                    size += data[2];
                }
                return size;
            }

            function parseImage(str){
                var TextEncoding = str.charCodeAt(0);
                str = str.substr(1);
                var MimeTypePos = str.indexOf('\0');
                var MimeType = str.substr(0, MimeTypePos);
                str = str.substr(MimeTypePos+1);
                var PictureType = str.charCodeAt(0);
                var TextPictureType = PICTURE_TYPES[PictureType.toString(16).toUpperCase()];
                str = str.substr(1);
                var DescriptionPos = str.indexOf('\0');
                var Description = str.substr(0, DescriptionPos);
                str = str.substr(DescriptionPos+1);
                var PictureData = str;
                var Magic = PictureData.split('').map(function(e){return String.fromCharCode(e.charCodeAt(0) & 0xff)}).join('');
                return {
                    dataURL: 'data:'+MimeType+';base64,'+encode_64(Magic),
                    PictureType: TextPictureType,
                    Description: Description,
                    MimeType: MimeType
                };
            }

            function parseImage2(str){
                var TextEncoding = str.charCodeAt(0);
                str = str.substr(1);
                var Type = str.substr(0, 3);
                str = str.substr(3);

                var PictureType = str.charCodeAt(0);
                var TextPictureType = PICTURE_TYPES[PictureType.toString(16).toUpperCase()];

                str = str.substr(1);
                var DescriptionPos = str.indexOf('\0');
                var Description = str.substr(0, DescriptionPos);
                str = str.substr(DescriptionPos+1);
                var PictureData = str;
                var Magic = PictureData.split('').map(function(e){return String.fromCharCode(e.charCodeAt(0) & 0xff)}).join('');
                return {
                    dataURL: 'data:img/'+Type+';base64,'+encode_64(Magic),
                    PictureType: TextPictureType,
                    Description: Description,
                    MimeType: MimeType
                };
            }

            var TAG_HANDLERS = {
                "APIC": function(size, s, a){
                    tag.pictures.push(parseImage(s));
                },
                "PIC": function(size, s, a){
                    tag.pictures.push(parseImage2(s));
                },
                "TLEN": function(size, s, a){
                    tag.Length = parseDuration(s);
                },
                "TCON": function(size, s, a){
                    s = cleanText(s);
                    if(/\([0-9]+\)/.test(s)){
                        var genre = ID3_2_GENRES[parseInt(s.replace(/[\(\)]/g,''))]
                    }else{
                        var genre = s;
                    }
                    tag.Genre = genre;
                }
            };

            function read_frame(){
                if(tag.revision < 3){
                    read(3, function(frame_id){
                        if(/[A-Z0-9]{3}/.test(frame_id)){
                            var new_frame_id = TAG_MAPPING_2_2_to_2_3[frame_id.substr(0,3)];
                            read_frame2(frame_id, new_frame_id);
                        }else{
                            onComplete(tag);
                            return;
                        }
                    })
                }else{
                    read(4, function(frame_id){
                        if(/[A-Z0-9]{4}/.test(frame_id)){
                            read_frame3(frame_id);
                        }else{
                            onComplete(tag);
                            return;
                        }
                    })
                }
            }


            function cleanText(str){
                if(str.indexOf('http://') != 0){
                    var TextEncoding = str.charCodeAt(0);
                    str = str.substr(1);
                }
                //screw it i have no clue
                return str.replace(/[^A-Za-z0-9\(\)\{\}\[\]\!\@\#\$\%\^\&\* \/\"\'\;\>\<\?\,\~\`\.\n\t]/g,'');
            }


            function read_frame3(frame_id){
                read(4, function(s, size){
                    var intsize = arr2int(size);
                    read(2, function(s, flags){
                        flags = pad(flags[0]).concat(pad(flags[1]));
                        read(intsize, function(s, a){
                            if(typeof TAG_HANDLERS[frame_id] == 'function'){
                                TAG_HANDLERS[frame_id](intsize, s, a);
                            }else if(TAGS[frame_id]){
                                tag[TAGS[frame_id]] = (tag[TAGS[frame_id]]||'') + cleanText(s)
                            }else{
                                tag[frame_id] = cleanText(s)
                            }
                            read_frame();
                        })
                    })
                })
            }

            function read_frame2(v2ID, frame_id){
                read(3, function(s, size){
                    var intsize = arr2int(size);
                    read(intsize, function(s, a){
                        if(typeof TAG_HANDLERS[v2ID] == 'function'){
                            TAG_HANDLERS[v2ID](intsize, s, a);
                        }else if(typeof TAG_HANDLERS[frame_id] == 'function'){
                            TAG_HANDLERS[frame_id](intsize, s, a);
                        }else if(TAGS[frame_id]){
                            tag[TAGS[frame_id]] = (tag[TAGS[frame_id]]||'') + cleanText(s)
                        }else{
                            tag[frame_id] = cleanText(s)
                        }
                        read_frame();
                    })
                })
            }


            read(3, function(header){
                if(header == "ID3"){
                    read(2, function(s, version){
                        tag.version = "ID3v2."+version[0]+'.'+version[1];
                        tag.revision = version[0];
                        read(1, function(s, flags){
                            //todo: parse flags
                            flags = pad(flags[0]);
                            read(4, function(s, size){
                                max_size = arr2int(size);
                                read(0, function(){}); //signal max
                                read_frame()
                            })
                        })
                    })
                }else{
                    onComplete(tag);
                    return false; //no header found
                }
            })
            return tag;
        },
        parseFile: function(file, onComplete){

            var reader = new FileReader();

            var pos = 0,
                bits_required = 0,
                handle = function(){},
                maxdata = Infinity;

            function read(bytes, callback, newmax){
                bits_required = bytes;
                handle = callback;
                maxdata = newmax;
                if(bytes == 0) callback('',[]);
            }
            function abortRead(reader) {
                reader.abort();
            }
            var responseText = '';
            reader.onloadend = function(ev) {
                if(reader.result){
                    responseText = reader.result;
                }

                    if(responseText.length > pos + bits_required && bits_required){
                        var data = responseText.substr(pos, bits_required);
                        var arrdata = data.split('').map(function(e){return e.charCodeAt(0) & 0xff});
                        pos += bits_required;
                        bits_required = 0;
                        if(handle(data, arrdata) === false){
                          reader.abort();
                        }
                    }

                setTimeout(arguments.callee, 0);
                return true;
            };
            reader.readAsBinaryString(file);
            return [reader, ID3v2.parseStream(read, onComplete)];
        }
    };
})(window);

playerSHRI(document.getElementById('palyer'),{
    eqDefault: 'rock',
    visualizationType: 0, //  варианты 0,1,2
    visualizationColor: '#3333FF'
});
//конец )

