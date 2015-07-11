<!DOCTYPE html>
<html>
<head>
    <script>
        //Step 1
        var context;
        function initContext() {
            try {
                context = new webkitAudioContext();
                alert("context created"); //test
            }
            catch(e) {
                alert('Sorry, your browser does not support the Web Audio API.');
            }
        }

        //Step 2
        var myAudioBuffer = null;

        //Steps 3 and 4
        var url = "mysound.mp3";
        function loadSound(url) {
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'arraybuffer';
            // . . . step 3 code above this line, step 4 code below
            request.onload = function() {
                alert("sound loaded"); //test
                context.decodeAudioData(request.response, function(buffer) {
                    myAudioBuffer = buffer;
                    alert("sound decoded"); //test
                });
            }
            request.send();
        }

        //Step 5
        var source = null;
        function playSound(anybuffer) {
            source = context.createBufferSource();
            source.buffer = anybuffer;
            source.connect(context.destination);
            source.start();
            //source.noteOn(0); //see note in Step 6 text
        }

        //Step 6
        function stopSound() {
            if (source) {
                source.stop();
                //source.noteOff(0); //see note in Step 6 text
            }
        }
    </script>
</head>

<body>
<p>Web audio API example: load a sound file and play/stop it on a button click.</p>
<button onclick="initContext()">Init</button>
<button onclick="loadSound(url)">Load</button>
<button onclick="playSound(myAudioBuffer)">Play</button>
<button onclick="stopSound()">Stop</button>
</body>
</html>