importScripts('jquery-nodom.js');
var potentialSentences = [];
var currentString = '', keyboard, layout, potentialWords = '';
var possibilitySentences = [];
var words = [];
var TheWord;
var sentence = "";
//--Dwell-free technique--//

//--Definition for the Trie Node--//
class TrieNode {
    constructor(time) //default constructor
    {
        if (time === "1")
            return;
        switch (arguments.length) {
            case 0: this.constructorNoParam();
                break;
            case 1: this.constructorOneParam(arguments[0]);
                break;
        }
    }

    //--Trie node has a child?--//
    constructorOneParam(c) {
        this.children = new TrieNode("1");
        this.c = c;
        this.isLeaf;
    }

    constructorNoParam() {
        this.children = new TrieNode("1");
        this.c;
        this.isLeaf;
    }
}

//--Definition for the Trie tree--//
class Trie {
    constructor() {
        this.count = 1;
        this.root = new TrieNode(); //--root node--//
    }

    //--inserting a word in the Trie tree--//
    insert(word) {
        var children = this.root.children;

        for (var i = 0; i < word.length; i++) {
            var c = word.charAt(i).toLowerCase();

            var t;
            if (children[c]) {
                t = children[c];
            } else {
                t = new TrieNode(c);
                children[c] = t;//.children
            }

            children = t.children;

            //--is this the last letter? - set as leaf node--//
            if (i == (word.length - 1))
                t.isLeaf = true;
        }
    }

    traverseLeaf(node, string, number) {
        var children = node.children;

        string += node.c;

        number++;
        for (var child in children) {
            this.traverseLeaf(children[child], string, number);
        }
    }

    traverseTree(node) {
        var children = node.children;

        if (children.length > 1)
            this.count += (children.length - 1);

        for (var value in children) {
            this.traverseTree(value);
        }
    }

    startsWith(prefix) {
        if (this.searchNode(prefix) == null)
            return false;
        else
            return true;
    }

    searchNode(str) {
        var children = this.root.children;
        var t = null;
        for (var i = 0; i < str.length; i++) {
            var c = str.charAt(i);
            if (children[c]) {
                t = children[c];
                children = t.children;
            } else {
                return null;
            }
        }
        return t;
    }

    search(word) {
        var t = this.searchNode(word);

        if (t != null && t.isLeaf)
            return true;
        else
            return false;
    }
}

//--Tree Matching--//
class TreeMatching {
    constructor() //--default constructor--//
    { }

    //--create Trie tree: this method is called once upon loading the web worker--//
    createTree() {
        var deferred = $.Deferred();
        var self = this;
        var list_Dictionary;
        this.loadWordList = $.get("../assets/10000w.txt", function (data) {
            list_Dictionary = data.split("\n");//--split the wordlist into words--//

            //--insert each word from the wordlist in the Trie tree--//
            for (var i = 0; i < list_Dictionary.length; i++) {
                var string = list_Dictionary[i];
                TreeMatching.tree.insert(string);
                deferred.resolve();
            }
        });
        console.log("Tree created!")
        return deferred.promise();
    }

    //--calculates potential words--//
    getCandidateWords(seq) {
        this.createLetterList(seq);
        var matching = new TreeMatching();

        var bestPath = new Array(TreeMatching.listSeq.length + 1);
        for (var i = 0; i < bestPath.length; i++) {
            bestPath[i] = "";
        }

        var scoreArray = [];
        for (var i = 0; i < TreeMatching.listSeq.length + 1; i++) {
            scoreArray[i] = "0";
        }

        matching.traverseLeaf(TreeMatching.tree.root, "", 0, scoreArray, bestPath);

        var numberSort = function (a, b) {
            return b - a;
        }

        //--Sorting potential words--//
        TreeMatching.mapScore.sort(function (a, b) { return b.score - a.score; }); //sorting in descending order of score
        //console.log(TreeMatching.mapScore); /*remove*/

        var list_candidateWords = "";
        var noOfWords = 6;
        //--inserting top-6 words in 'list_candidateWords'--//
        for (var listCount = 0; listCount < noOfWords; listCount++) {
            //list_candidateWords += TreeMatching.mapScore[listCount].word + "\r\n";
            console.log(TreeMatching.mapScore[listCount].word);
            potentialSentences[listCount] = sentence + TreeMatching.mapScore[listCount].word;
        }
    
        var dataString = "{queries:[\""


for (var i = 0; i < noOfWords; i++) {
    if (i == noOfWords - 1) {
        dataString += potentialSentences[i] + "\"";
    }
    else { dataString += potentialSentences[i] + "\",\""; }
}
dataString += "]} ";
var params = {
    // Request parameters
    "model": "body",
    "order": "5",
};
//Ajax Call for MS API
$.ajax({
    url: "https://westus.api.cognitive.microsoft.com/text/weblm/v1.0/calculateJointProbability?" + $.param(params),
    beforeSend: function (xhrObj) {
        // Request headers
        xhrObj.setRequestHeader("Content-Type", "application/json");
        xhrObj.setRequestHeader("Ocp-Apim-Subscription-Key", "12ae943fd3ce406591097dfaaa569811");
    },
    type: "POST",
    async: false,
    // Request body
    data: dataString
})
    .done(function (data) {
        console.log(data);
        possibilitySentences = data.results;
        console.log(possibilitySentences[0].probability);
        possibilitySentences.sort(function (a, b) { return b.probability > a.probability });
        possibilitySentences.sort();
        console.log(possibilitySentences);
        for (var listCount = 0; listCount < noOfWords; listCount++) {
            if (possibilitySentences[listCount].words.indexOf(' ') > 0) {
                var x = possibilitySentences[listCount].words.split(" ");
                words[listCount] = x[x.length - 1];
            }
            else {
                words[listCount] = possibilitySentences[listCount].words;

            }
            list_candidateWords += words[listCount] + "\r\n";
        }
       // sentence = sentence + " " + words[0];
        TheWord = list_candidateWords;

        //resolve(list_candidateWords);
    })
    .fail(function () {
        console.log("fail");
        reject("Could not generate strings");
    });

return list_candidateWords;
    }

//--seperates input string into <letter, frequency> tuples--//
createLetterList(seq) {
    TreeMatching.totalFrequency = seq.length;
    TreeMatching.listSeq = [];
    TreeMatching.listFreq = [];

    var seqs = seq.toLowerCase().split("");
    var currentLetter = seqs[0];
    var count = 1;

    for (var i = 1; i < seqs.length; i++) {

        var Nextletter = seqs[i];

        if (currentLetter == Nextletter) {
            count++;
        }
        else {
            if (count > TreeMatching.thresholdPoints) {
                TreeMatching.listSeq.push(currentLetter);
                TreeMatching.listFreq.push(count);
            }
            currentLetter = Nextletter;
            count = 1;
        }

        if (i == seqs.length - 1) {
            if (count > TreeMatching.thresholdPoints) {
                TreeMatching.listSeq.push(currentLetter);
                TreeMatching.listFreq.push(count);

            }
        }
    }
}

//--traverse Trie tree: this core method compares the inputted string with words in the wordlist and assigns potential scores--//
traverseLeaf(node, string, number, scoreArray, bestPath) {
    var children = node.children;
    var flag = true;
    var isNeighbour = false, neighbours = [];
    if (number > 0) {
        var letter = node.c + "";

        string += letter;
        if (number > 1)
            if (letter == (string.substring(number - 2, number - 1))) {
                flag = false;
            }
        if (flag == true)
            for (var j = 0; j < TreeMatching.listSeq.length; j++) {
                var tempFreq = 0.0;

                //--is current letter the same as the intended letter?--//
                if (letter.toLowerCase() == (TreeMatching.listSeq[j].toLowerCase())) {
                    tempFreq = TreeMatching.listFreq[j];
                }
                else {
                    neighbours = getNeighbourLetters(letter.toUpperCase());
                    for (var k = 0; k < neighbours.length; k++) {
                        //--is current letter a neighbour to the intended letter?--//
                        if (TreeMatching.listSeq[j].toLowerCase() == neighbours[k].toLowerCase()) {
                            isNeighbour = true;
                        }
                    }
                    //--assign a neighbouring weight if the letter from the input string is a neighbour to the current letter in the wordlist--//
                    if (isNeighbour)
                        tempFreq = TreeMatching.listFreq[j] * TreeMatching.neighborWeight;
                }

                if (parseInt(scoreArray[j] + tempFreq, 10) > parseInt(scoreArray[j + 1], 10)) {
                    scoreArray[j + 1] = parseInt(scoreArray[j] + tempFreq);
                    bestPath[j + 1] = bestPath[j] + number + ",";
                }
                else {
                    scoreArray[j + 1] = scoreArray[j + 1];
                    bestPath[j + 1] = bestPath[j + 1];
                }
            }
    }

    if (flag == true)
        number++;

    if (node.isLeaf) {
        var path = bestPath[TreeMatching.listSeq.length];
        var num = path.split(",");

        var temp = num[0];
        var size = 1;

        for (var i = 1; i < num.length; i++) {
            if (!(temp == (num[i]))) {
                temp = num[i];
                size++;
            }
        }

        var wordScore = size / number;
        var matrixScore = scoreArray[TreeMatching.listSeq.length] / TreeMatching.totalFrequency;
        TreeMatching.mapScore.push({ 'word': string, 'score': (wordScore + matrixScore) * 100 });
    }

    //--iterate through the remaining words--//
    for (var child in children) {
        this.traverseLeaf(children[child], string, number, jQuery.extend(true, {}, scoreArray), jQuery.extend(true, {}, bestPath));
    }
}
}
TreeMatching.thresholdPoints = 0;
TreeMatching.neighborWeight = 0.4;
TreeMatching.totalFrequency = 0.0;
TreeMatching.listSeq = [];
TreeMatching.listFreq = [];
TreeMatching.mapScore = [];
TreeMatching.tree = new Trie();
//--End of dwell-free technique--//

//--create tree ONCE--//
var tree = new TreeMatching();
tree.createTree();


//--calculate neighbouring letters--//
function getNeighbourLetters(l) {
    var neighbourLetters = [''], count = 0, row, column, colspan, rowspan, tillRow, tillColumn;

    //--finding row, column, rowspan and colspan values of 'l'--//
    for (var i = 0; i < keyboard.length; i++) {
        if (keyboard[i].value == l) {
            row = parseInt(keyboard[i].row);
            column = parseInt(keyboard[i].column);
            rowspan = parseInt(keyboard[i].rowspan);
            colspan = parseInt(keyboard[i].colspan);
            break;
        }
    }

    //--Character has rowspan and colspan greater than 1? Find all neighbours--//
    if (rowspan > 1 || colspan > 1) {
        tillRow = row + rowspan - 1;
        tillColumn = column + colspan - 1;

        for (var r = row; r <= tillRow; r++) {
            for (var c = column; c <= tillColumn; c++) {
                for (var i = 0; i < keyboard.length; i++) {
                    if ((keyboard[i].row == r && keyboard[i].column == tillColumn + 1) || (keyboard[i].row == r && keyboard[i].column == column - keyboard[i].colspan) || (keyboard[i].row == row - keyboard[i].rowspan && keyboard[i].column == c) || (keyboard[i].row == tillRow + 1 && keyboard[i].column == c)) {
                        if ($.inArray((keyboard[i].value), neighbourLetters) == -1) {
                            neighbourLetters[count] = keyboard[i].value;
                            count++;
                        }
                    }

                    if ((r + 1) > tillRow) {
                        if ((keyboard[i].row == tillRow + 1 && keyboard[i].column == c)) {
                            if ($.inArray((keyboard[i].value), neighbourLetters) == -1) {
                                neighbourLetters[count] = keyboard[i].value;
                                count++;
                            }
                        }
                    }

                    if ((c + 1) > tillColumn) {
                        if ((keyboard[i].row == r && keyboard[i].column == tillColumn + 1)) {
                            if ($.inArray((keyboard[i].value), neighbourLetters) == -1) {
                                neighbourLetters[count] = keyboard[i].value;
                                count++;
                            }
                        }
                    }
                }
            }
        }
    }
    else //--Character has rowspan and colspan equal to 1? Find all neighbours--//
    {
        for (var i = 0; i < keyboard.length; i++) {
            //--Character is a neighbour to 'l'--//
            if ((keyboard[i].row == row - 1 && keyboard[i].column == column) || (keyboard[i].row == row && keyboard[i].column == column + 1) || (keyboard[i].row == row && keyboard[i].column == column - 1) || (keyboard[i].row == row + 1 && keyboard[i].column == column)) {
                if ($.inArray((keyboard[i].value), neighbourLetters) == -1) {
                    neighbourLetters[count] = keyboard[i].value;
                    count++;
                }
            } else if (keyboard[i].colspan > 1 || keyboard[i].rowspan > 1)//--Character is not an immediate neighbour to 'l', but check whether with rowspan and colspan it becomes a neighbour--//
            {
                var tillColumn2, tillRow2;
                tillRow2 = parseInt(keyboard[i].row) + parseInt(keyboard[i].rowspan) - 1;
                tillColumn2 = parseInt(keyboard[i].column) + parseInt(keyboard[i].colspan) - 1;
                for (var r = keyboard[i].row; r <= tillRow2; r++) {
                    for (var c = keyboard[i].column; c <= tillColumn2; c++) {
                        for (var k = 0; k < keyboard.length; k++) {
                            if ((keyboard[k].row == r && keyboard[k].column == tillColumn2 + 1) || (keyboard[k].row == r && keyboard[k].column == c - 1) || (keyboard[k].row == r - 1 && keyboard[k].column == c) || (keyboard[k].row == tillRow2 + 1 && keyboard[k].column == c)) {
                                if (keyboard[k].value == l) {
                                    if ($.inArray((keyboard[i].value), neighbourLetters) == -1) {
                                        neighbourLetters[count] = keyboard[i].value;
                                        count++;
                                    }
                                }
                            }

                            if ((r + 1) > tillRow2) {
                                if ((keyboard[k].row == tillRow2 + 1 && keyboard[k].column == c)) {
                                    if ((keyboard[k].row == row - 1 && keyboard[k].column == column) || (keyboard[k].row == row && keyboard[k].column == column + 1) || (keyboard[k].row == row && keyboard[k].column == column - 1) || (keyboard[k].row == row + 1 && keyboard[k].column == column)) {
                                        if (keyboard[k].value == l) {
                                            if ($.inArray((keyboard[i].value), neighbourLetters) == -1) {
                                                neighbourLetters[count] = keyboard[i].value;
                                                count++;
                                            }
                                        }
                                    }
                                }
                            }

                            if ((c + 1) > tillColumn2) {
                                if ((keyboard[k].row == r && keyboard[k].column == tillColumn2 + 1)) {
                                    if (keyboard[k].value == l) {
                                        if ($.inArray((keyboard[i].value), neighbourLetters) == -1) {
                                            neighbourLetters[count] = keyboard[i].value;
                                            count++;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return neighbourLetters;
}
onmessage = function (e) {
    potentialWords = '';
    var data;
    var message = e.data;
    var semicolon = message.split(";");
    for (var i = 0; i < semicolon.length; i++) {
        var colon = semicolon[i].split(":");
        for (var j = 0; j < colon.length; j++) {
            if (colon[j] == "Keyboard") {
                layout = colon[j + 1];
                //--load keyboard layout--//
                loadedKeyboard = $.getJSON('../assets/keyboard-layouts.json', function (results) {
                    keyboard = results[layout];
                });
            }

            //--was input string submitted to calculate potential words?--//
            if (colon[j] == "calculatePotential") {
                currentString = colon[j + 1];
                loadedKeyboard.done(function () {
                    //tree.createTree().done(function()
                    {
                        potentialWords = tree.getCandidateWords(currentString); //"caaaaaafarrrrrr"
                        TreeMatching.mapScore = [];
                        
                        //--send potential words to plugin--//
                        postMessage(potentialWords);
                    }//);
                });
            }
            if (colon[j] == "sentence") {
                sentence = colon[j + 1];
            }
        }
    }
};