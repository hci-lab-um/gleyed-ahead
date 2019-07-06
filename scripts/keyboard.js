// Script to load keyboard
$(document).ready(function () {
    getKeyboardJson();
    loadTree();
    voices = synth.getVoices();

})
var index = 0;
var inputString = ""; //the typed word for processing
var layout = "qwerty";
var layouts;
var firstSpace = false;
var returnedFromWorker, sendToWorker;
var myWorker;
var ready = false;
var genWords = {}; // an object to store the list of generated words and their suggestions
var sentence = "";
var dwellFree = true;
var SubmitString = "";
var synth = window.speechSynthesis;
var voices;
var TTSvoice;

//get array of keyboard layout
function getKeyboardJson() {

    $.getJSON('assets/keyboard-layouts.json', function (data) {
        console.log(data[layout]);
        layouts = data;
        console.log(layouts[layout]);
        loadKeyboard(layouts[layout]);
    });
}

//create keys on screen
function loadKeyboard(keyboard) {
    var row = 0;
    $("#keys").empty().append('<div class="suggestions" id="suggestions"></div>');

    $.each(keyboard, function (index, item) {
        if (item.row > row) {
            $("#keys").append('<br />');
            row++;
        }
        console.log(item);
        $("#keys").append('<div class="keyBtn" value="' + item.characterValue + '">' + item.characterValue + '</div>');
    });
    $("#keys").append('<br />').append('<div class="spaceBtn"><i class="fas fa-spinner-third fa-spin" id="load"></i><i class="fas fa-check" id="loaded"></i></div>');
    $("#keyboard").append('<br /><br /><div class="backSpace"><i class="fas fa-arrow-alt-to-left"></i> Delete </div>').append('<br /><br /><div class="dwellFree on" id = "df"> Dwell Free </div>').append('<br /><br /><div class="clear" id = "clear"> <i class="fas fa-times style="font-weigth: 700"></i> <span>Clear</span></div>').append('<br /><br /><div class="Submit" id = "submit"> Submit </div>').append('<br /><br /><div class="voice" id = "voice">Change Voice</div>');
    ready = true;
    //initialiseing all functions
    addToString();
    inputSpace();
    backSpace();
    toggleDwellFree();
    readText();
    SumbitSentence();
    ClearSentence();
    scrollUp();
    scrollDown();
    populateVoices();
    ChangeVoice();
    chooseVoice();
    exitVoiceChange();
    populateTheme();
    changeTheme();
    chooseTheme();
    exitThemeChange();
}

//add letters to the string sequence for processing
function addToString() {
    $(".keyBtn").hover(function () {
        var btn = $(this);
        this.letters = setInterval(function () {
            console.log(btn.text());

            if (!(dwellFree)) {
                $(".suggested").remove();
                $("#suggestions").empty();
                var chosen = $(".chosen");
                if (chosen.length > 0)
                    chosen.removeClass("chosen").after('<span class="word chosen" data-ind="' + index + '">' + btn.text() + '</span>');
                else
                    $("#textInput").append('<span class="word chosen" data-ind="' + index + '">' + btn.text() + '</span>');
            } else {
                inputString += btn.text();
            }
        }, (dwellFree) ? 60 : 800)

    }, function () {
        clearInterval(this.letters);
    })
}

function loadTree() {
    returnedFromWorker = true;
    sendToWorker = '';
    myWorker = new Worker("scripts/web-worker.js");

}
//on pressing space the input string is sent for processing and reset
function inputSpace() {
    $(".spaceBtn").hover(function () {

        console.log(inputString);
        if (dwellFree) {
            if (ready) {
                if (firstSpace == true && inputString != "") {
                    firstSpace = false;
                }
                if (inputString != '') //calculate potential words only once
                {

                    if (returnedFromWorker == true) {
                        // returnedFromWorker = false;
                        $("#loaded").css("display", "none");
                        $("#loaded").css("visibility", "hidden");
                        $("#load").css("display", "inline-block");
                        $("#load").css("visibility", "visible");
                        $(".keyBtn").off().css("color", "grey");
                        console.log('posting message ' + inputString);

                        var children = $("#textInput").children();
                        sentence = "";
                        for (var i = 0; i < children.length; i++) {
                            sentence += children[i].innerHTML.replace("&nbsp;", " ");
                            console.log(children[i]);
                        }
                        console.log(sentence);
                        //--Submit to web worker--//
                        myWorker.postMessage('Keyboard:' + layout + ';calculatePotential:' + inputString + ';sentence:' + sentence);
                        inputString = '';
                    } else //--Add tuple to buffer--//
                    {
                        sendToWorker += 'Keyboard:' + layout + ';calculatePotential:' + inputString + ' - ' + ';sentence:' + sentence;
                        inputString = '';
                    }

                    //--Web worker returned?--//

                    myWorker.onmessage = function (e) {
                        console.log('returned message');
                        var popUpValues = '';
                        var string = e.data;
                        console.log(string);
                        string = string.split("\r\n");
                        for (var i = 1; i < string.length; i++) {
                            inputString = "";
                        }
                        genWords[index.toString()] = string;
                        displaySententence(string, 0);
                        suggestions(index - 1);
                        nextWord();
                    }
                }
            }
        } else {
            inputString = '';
            var chosen = $(".chosen");
            //check if current word has at least one letter or check if chosen is a completed word, as only those have ids
            if ($("[data-ind='" + (chosen.attr("data-ind") || "-1") + "']").length > 0 || !(chosen.attr("id"))) {
                var combinedWord = $("[data-ind='" + index + "']").text();
                if (combinedWord.length == 0) {
                    return;
                }
                combinedWord += "&nbsp;";
                $("#suggestions").empty();
                if (chosen.length > 0)
                    chosen.removeClass("chosen").after('<span class="word chosen" id = "' + index + '" data-ind ="' + index + '">' + combinedWord + '</span>');
                else
                    $("#textInput").append('<span class="word chosen" id = "' + index + '" data-ind ="' + index + '">' + combinedWord + '</span>');
                $("[data-ind='" + index + "']").not("[id='" + index + "']").remove();
                changeWord();
                index++;
                nextWord();
                ////if current index is empty or index is 0;
                //if ($("[data-ind='" + index + "']").length == 0 || index == 0) {
                //    index++;
                //}
            }
        }

    })
}
//function to display returned words on the screen
function displaySententence(words, start) {
    if (!(words)) {
        return;
    }
    $("#suggestions").empty();
    $(".suggested").remove();
    $("#suggestions").append('<p class="text">Other Suggestions</p>');
    for (var i = start; i < words.length - 1; i++) {
        if (i == 0) {
            var chosen = $(".chosen");
            if (chosen.length > 0)
                chosen.removeClass("chosen").after('<span class="word chosen" id ="' + index + '">' + words[i] + ' </span>');
            else
                $("#textInput").append(('<span class="word chosen" id ="' + index + '">' + words[i] + ' </span>'));
        }
        else {
            $("#suggestions").append('<span class="suggestionBox">' + words[i] + '</span>');
        }
    }

    if (start == 0) {
        changeWord();
        index++;
    }
    if ($(".TTS").hasClass("disabled")) {
        $(".TTS").removeClass("disabled").addClass("enabledTTS").find("i").removeClass("fa-volume-off").addClass("fa-volume-up");
    }
    $('#textInput').animate({ scrollTop: $('#textInput').prop('scrollHeight') }, 300);
    $("#load").css("display", "none");
    $("#loaded").css("display", "inline-block");
    $("#loaded").css("visibility", "visible");
    $(".keyBtn").off();
    addToString();
    $(".keyBtn").css("color", "black");
    setTimeout(function () {
        // returnedFromWorker = false;
        $("#loaded").css("display", "none");
        $("#loaded").css("visibility", "hidden");
    }, 1500)
}

//function to replace first word with a suggested word
function suggestions(index) {
    var prevWord = $("#" + index).find().prev();
    var suggestion = $(".suggestionBox").hover(function () {
        var sug = $(this);
        clearInterval(this.sugWord);
        this.sugWord = setInterval(function () {
            var text = sug.text();
            if (!(genWords[index])) {
                $("#suggestions").empty();
                clearInterval(sug[0].sugWord);
                return;
            }
            for (var i = 1; i < genWords[index].length; i++) {
                if (genWords[index][i] == text.trim()) {
                    genWords[index][i] = $("#" + index).text().trim();
                    sug.text(genWords[index][i]);
                    genWords[index][0] = text.trim();
                    break;
                }
            }
            $("#" + index).text(text.trim() + " ");
            clearInterval(sug[0].sugWord);
            $(".suggested").remove();
            nextWord();
            $('#textInput').animate({ scrollTop: $('#textInput').prop('scrollHeight') }, 300);
        }, 800)
    }, function () {
        clearInterval(this.sugWord);
    });
}

//function to select a word and display its respective suggestions
function changeWord(currentIndex) {
    if (!(currentIndex))
        currentIndex = index;
    $("#" + currentIndex).hover(function () {
        var element = $(this);
        var elem = element.attr('id');
        var suggested = element.is(".suggested");
        if (suggested)
            index++;
        this.word = setInterval(function () {
            $(".chosen").removeClass("chosen");
            element.addClass("chosen").removeClass("suggested");
            var ind = parseInt(elem);
            var wordArray = genWords["" + ind + ""];
            displaySententence(wordArray, 1);
            suggestions(ind);
            clearInterval($("#" + currentIndex)[0].word);
            if (suggested) {
                nextWord();
            }
            $('#textInput').animate({ scrollTop: $('#textInput').prop('scrollHeight') }, 300);
        }, 800)
    }, function () {
        clearInterval(this.word);
    })
}
function backSpace() {
    $(".backSpace").hover(function () {
        this.delete = setInterval(function () {
            var chosen = $(".chosen");
            var elem = chosen.attr('id');
            //checks if there is a selected word to delete
            if (!(elem) && dwellFree) {
                clearInterval($(".backSpace")[0].delete);
                return;
            }
            //sets the previous word as selected
            var nextChosen = chosen.prev();
            nextChosen.addClass("chosen");


            //checks is there is a previous word else sets the next word as selected
            if (nextChosen.length == 0) {
                nextChosen = chosen.next().addClass("chosen");
            }
            if (nextChosen.length == 0) {
                //clears suggestion bar
                $("#suggestions").empty();
            }
            else {
                //sets suggestions of the next selected word
                var id = nextChosen.attr('id');
                if (dwellFree) {
                    var array = genWords[id];
                    displaySententence(array, 1);

                }
            }

            chosen.remove();
            if (dwellFree) {
                genWords[elem.toString()] = undefined;
            }

            if ($(".word").length != 0) {
                var id = nextChosen.attr('id');
                suggestions(id);
            }

            if ($("#textInput").children().length == 0) {
                $("#suggestions").empty();
                if ($(".TTS").hasClass("enabledTTS")) {
                    $(".TTS").removeClass("enabledTTS").addClass("disabled").find("i").removeClass("fa-volume-up").addClass("fa-volume-off");
                }
            }
            clearInterval($(".backSpace")[0].delete);
        }, 800)

    }, function () {
        clearInterval(this.delete);
    })
}

function toggleDwellFree() {
    $("#df").hover(function () {
        $(".dwellFree").addClass("dwellFreeHover");
        this.dwellfree = setInterval(function () {
            dwellFree = !dwellFree;
            inputString = '';
            $(".dwellFree").removeClass("dwellFreeHover");
            if (dwellFree) {
                $(".keyBtn").removeClass("dwellBased");
                $(".dwellFree").addClass("on");
            } else {
                $(".keyBtn").addClass("dwellBased");
                $(".dwellFree").removeClass("on");
            }

            console.log(dwellFree);
            clearInterval($("#df")[0].dwellfree);
        }, 800)
    }, function () {
        clearInterval(this.dwellfree);
        $(".dwellFree").removeClass("dwellFreeHover");
    })
}

function TextToSpeech() {
    var tts = new SpeechSynthesisUtterance($("#textInput").text());
    tts.voice = TTSvoice;
    tts.pitch = 1;
    tts.rate = 1;
    window.speechSynthesis.speak(tts);

}
function readText() {
    $(".TTS").hover(function () {
        if ($(".TTS").hasClass("disabled") == false) {
            this.tts = setTimeout(function () {
                if ($("#textInput").children().last().is(".suggested")) {
                    $("#textInput").children().last().remove();
                }
                TextToSpeech();
            }, 1100)
        }
    }, function () {
        clearTimeout(this.tts);

    })

}
function populateTheme() {
    //Sets the first one as default if none are chosen else sets the preferred one
    if (localStorage.getItem("themeID") == null) {
        localStorage.setItem("themeID", "t1");
        $("#t1").prepend(' <i class="fas fa-check"></i> ');
    }
    else {
        var theme = localStorage.getItem("themeID");
        $("#" + theme).prepend(' <i class="fas fa-check"></i> ');
        if (theme == "t2") {
            $(".keyBtn").addClass("darkTheme");
			$(".keyboard").addClass("darkTheme");
		}
        if (theme == "t3") {
            $(".keyboard").removeClass("darkTheme");
            $(".keyBtn:contains('a')").addClass("colourTheme");
            $(".keyBtn:contains('e')").addClass("colourTheme");
            $(".keyBtn:contains('i')").addClass("colourTheme");
            $(".keyBtn:contains('o')").addClass("colourTheme");
            $(".keyBtn:contains('u')").addClass("colourTheme");
        }
    }
}
function changeTheme() {
    $(".color").hover(function () {
        this.clr = setInterval(function () {
            $(".themeChooser").css("display", "block");
            $(".cover").css("display", "block");
            clearInterval($(".color")[0].clr);
        }, 1100)
    }, function () {
        clearInterval(this.clr);

    })

}
function chooseTheme() {
    $(".themeDiv").hover(function () {
        var choice = this;
        this.themeChoice = setInterval(function () {
            var id = $(choice).attr("id");
            localStorage.setItem("themeID", "" + id + "");
            $(".themeDiv i").remove();
            $(".darkTheme").removeClass("darkTheme");
            $(".keyboard").removeClass("darkTheme");
            $(".colourTheme").removeClass("colourTheme");
            if (id == "t2") {
                $(".keyBtn").addClass("darkTheme");
                $(".keyboard").addClass("darkTheme");
            }
                
            if (id == "t3") {
                $(".keyboard").removeClass("darkTheme");
                $(".keyBtn:contains('a')").addClass("colourTheme");
                $(".keyBtn:contains('e')").addClass("colourTheme");
                $(".keyBtn:contains('i')").addClass("colourTheme");
                $(".keyBtn:contains('o')").addClass("colourTheme");
                $(".keyBtn:contains('u')").addClass("colourTheme");
            }
            $(choice).prepend(' <i class="fas fa-check"></i> ');

            clearInterval(choice.themeChoice);
        }, 2000)
    }, function () {
        clearInterval(this.themeChoice);
    })
}
function exitThemeChange() {
    $(".themeChooser .exit").hover(function () {

        this.exit = setInterval(function () {
            $(".themeChooser").css("display", "none");
            $(".cover").css("display", "none");
            clearInterval($(".exit")[0].exit);
        }, 1500)
    }, function () {
        clearInterval(this.exit);
    })
}
function SumbitSentence() {
    $(".Submit").hover(function () {
        this.submit = setInterval(function () {
            //to exclude the suggested word from the sumbit
            if ($("#textInput").children().last().is(".suggested")) {
                $("#textInput").children().last().remove();
            }
            //to save the string to sumit
            SubmitString = $("#textInput").text();
            //clears the text
            $("#textInput").empty();
            //clears suggestion bar
            $("#suggestions").empty();
            console.log(SubmitString);
            $(".TTS").removeClass("enabledTTS").addClass("disabled").find("i").removeClass("fa-volume-up").addClass("fa-volume-off");
            clearInterval($("#submit")[0].tts);
        }, 1100)
    }, function () {
        clearInterval(this.submit);
    })

}
function populateVoices() {
    voices = synth.getVoices();
    console.log(voices);
    for (i = 0; i < 6; i++) {
        var choice = document.createElement('div');
        var VoiceDiv = $(".voiceChanger");
        choice.textContent = voices[i].name + ' (' + voices[i].lang + ')';
        $(choice).addClass("voiceDiv").attr("id", i);

        //pick only those that are english
        if (voices[i].lang == "en-US" || voices[i].lang == "en-GB") {
            VoiceDiv.append(choice);
            if (i == parseInt(localStorage.getItem("synthVoiceNum"))) {
                $(choice).prepend(' <i class="fas fa-check"></i> ');
            }
        }

    }
    //Sets the first one as default if none are chosen else sets the preferred one
    if (localStorage.getItem("synthVoiceNum") == null) {
        localStorage.setItem("synthVoiceNum", "0");
        TTSvoice = voices[0];
    }
    else {
        var voiceStored = parseInt(localStorage.getItem("synthVoiceNum"));
        TTSvoice = voices[voiceStored];
    }
    //appends exit button
    VoiceDiv.append('<div class="exit"><i class="fas fa-caret-circle-left"></i> Back</div>');
}
function ChangeVoice() {
    $(".voice").hover(function () {

        this.voice = setInterval(function () {
            $(".voiceChanger").css("display", "block");
            $(".cover").css("display", "block");
            clearInterval($("#voice")[0].tts);
        }, 1000)
    }, function () {
        clearInterval(this.voice);
    })

}
function chooseVoice() {
    $(".voiceDiv").hover(function () {
        var choice = this;
        this.voiceChoice = setInterval(function () {
            var id = $(choice).attr("id");
            console.log(id);
            localStorage.setItem("synthVoiceNum", "" + id + "");
            TTSvoice = voices[id];
            console.log(TTSvoice);
            $(".voiceChanger i").eq(0).remove();
            if (id < 3) {
                $(".voiceDiv").eq(id).prepend(' <i class="fas fa-check"></i> ');
            }
            else {
                $(".voiceDiv").eq(id - 1).prepend(' <i class="fas fa-check"></i> ');
            }

            clearInterval($(".voiceDiv")[0].voiceChoice);
        }, 2000)
    }, function () {
        clearInterval(this.voiceChoice);
    })
}
function exitVoiceChange() {
    $(".voiceChanger .exit").hover(function () {

        this.exit = setInterval(function () {
            $(".voiceChanger").css("display", "none");
            $(".cover").css("display", "none");
            clearInterval($(".exit")[0].exit);
        }, 1500)
    }, function () {
        clearInterval(this.exit);
    })
}
function ClearSentence() {
    $(".clear").hover(function () {
        this.clear = setInterval(function () {
            //clears the text
            $("#textInput").empty();
            //clears suggestion bar
            $("#suggestions").empty();
            console.log(SubmitString);
            $(".TTS").removeClass("enabledTTS").addClass("disabled").find("i").removeClass("fa-volume-up").addClass("fa-volume-off");
            clearInterval($("#clear")[0].tts);
        }, 1100)
    }, function () {
        clearInterval(this.clear);
    })

}
function nextWord() {
    var sen = $($(".chosen").next().prevAll().get().reverse()).text();
    if (sen == "") {
        sen = $("#textInput").text();
    }
    var params = {
        // Request parameters
        "model": "body",
        "words": sen,
        "order": "5",
        "maxNumOfCandidatesReturned": "6",
    };

    console.log(params);
    $.ajax({
        url: "https://westus.api.cognitive.microsoft.com/text/weblm/v1.0/generateNextWords?" + $.param(params),
        beforeSend: function (xhrObj) {
            // Request headers
            xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key", "12ae943fd3ce406591097dfaaa569811");
        },
        type: "POST",
        // Request body
        data: "",
    })
        .done(function (data) {
            if (data.candidates.length == 0) return;
            genWords[index] = [];
            console.log(data);
            for (var i = 0; i < data.candidates.length; i++) {
                genWords[index][i] = data.candidates[i].word;
            }
            genWords[index].push("");
            window.suggestionDisplay = setInterval(function () {
                var chosen = $(".chosen");
                if (chosen.length != 0) {
                    chosen.after('<span class="word suggested" id ="' + (index) + '">' + data.candidates[0].word + ' </span>');
                    clearInterval(window.suggestionDisplay);
                    changeWord(index);
                    console.log("suggestion displayed");
                }
            }, 10);
        })
        .fail(function () {
        });
}

function scrollUp() {
    $(".scroll-up").hover(function () {
        this.su = setInterval(function () {

            $("#textInput").animate({ scrollTop: -55 + "px" }, 1000);


            clearInterval($(".scroll-up")[0].su);
        }, 800)
    }, function () {
        clearInterval(this.su);
    })

}
function scrollDown() {
    $(".scroll-down").hover(function () {
        this.sd = setInterval(function () {
            $('#textInput').animate({ scrollTop: $('#textInput').prop('scrollHeight') }, 1000);
            clearInterval($(".scroll-down")[0].sd);
        }, 800)
    }, function () {
        clearInterval(this.sd);
    })

}