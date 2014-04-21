// Initialize a trie object that contains the word dictionary
var trie = new Trie();
trie.loadDictionaryFile();

// Boolean controlling the functioning of the extension
var assistDisabled = false;

/**
 * Add a listener to listen for messages from foreground.js
 */
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.messageType == "suggestion") {
            if (!assistDisabled)
                sendResponse({reply: trie.getSuggestions(request.phrase)});
        }
        if (request.messageType == "toggle") {

            // Set the value of assistDisabled
            if (request.value !== undefined) {
                assistDisabled = request.value;
                return;
            }

            // If request.value is not defined then return the value of assistDisabled. This is to tell the front end what the value of assistDisabled is.
            // Used in foreground.js as well as popup.js
            sendResponse({reply: assistDisabled});
        }
    }
);


function Trie() {

    // The root node for the entire trie. All nodes stem from the rootNode
    this.rootNode = new Node();
    var self = this;


    /**
     * Loads dictionary.txt using an XMLHttpRequest and sends that result to populateTrieFromDictionary()
     */
    this.loadDictionaryFile = function () {

        var xhr = new XMLHttpRequest();
        xhr.onload = function () {
            if (this.readyState == 4 && this.status == 200)
                self.populateTrieFromDictionary(this.responseText);
        };

        xhr.open("GET", chrome.extension.getURL('/includes/dictionary.txt'), true);
        xhr.send();
    };


    /**
     * Parses a string containing the dictionary into the rootNode. This function essentially initiates the trie.
     * See dictionary.txt for the format of the dictionary
     */
    this.populateTrieFromDictionary = function (dictionary) {

        var dictionaryArray = dictionary.split("\n");
        for (var i = 0; i < dictionaryArray.length; i++) {
            var phrase = dictionaryArray[i].split(" ");
            this.insertPhraseIntoTrie(phrase[0], "global", phrase[1]);
        }
    };


    /**
     * inputPhrase is a string that is either a single word or multiple words(phrase)
     * Frequency should be a number representing the relative frequency that the phrase is used in the english language(global) or by the user(local)
     * Insert type can be "global" or "local". This feature is not yet implemented
     * @param inputPhrase
     * @param insertType
     * @param frequency
     */
    this.insertPhraseIntoTrie = function (inputPhrase, insertType, frequency) {
        this.rootNode.insertPhrase(inputPhrase, insertType, frequency);
    };


    /**
     * Returns a sorted array of suggestions from the given inputPhrase
     */
    this.getSuggestions = function (inputPhrase) {

        // Only return suggestions if we have the first 2+ characters of the phrase
        if (inputPhrase.length < 2)
            return;

        // Query the trie for suggestions
        var deepestNode = this.rootNode.getDeepestNode(inputPhrase);

        // If there are no suggestions then return
        if (!deepestNode)
            return;

        var suggestedPhrases = deepestNode.getPhrases();

        if (suggestedPhrases) {

            // Sort the suggestions by frequency
            function compare(a, b) {
                if (parseFloat(a.frequency) < parseFloat(b.frequency))
                    return 1;
                if (parseFloat(a.frequency) > parseFloat(b.frequency))
                    return -1;
                return 0;
            }

            return suggestedPhrases.sort(compare);
        }
    }
}


function Node() {

    // A single character that this node represents
    this.character;

    // The relative frequency that this phrase is used in the english language.
    // Note this value is undefined except when this node represents the lat character of a phrase
    this.frequency;
    this.parentNode;
    this.childNodes = [];


    /**
     * Travels down the trie until it reaches the deepest node sequence that matches the inputPhrase.
     * Note that this function is used recursively and inputPhrase is reduced by the leading character at each subsequent call
     * @param inputPhrase
     */
    this.getDeepestNode = function (inputPhrase) {

        // If we are at the deepest node for the given inputPhrase
        if (inputPhrase.length == 0)
            return this;

        // If there is not a child node that represents the first character of the inputPhrase then return
        if (!this.getChildNode(inputPhrase[0]))
            return;

        // Get the next deepest node of the trie
        var nextNode = this.getChildNode(inputPhrase[0]);
        return nextNode.getDeepestNode(inputPhrase.substring(1, inputPhrase.length));

    };

    /**
     * Returns the child node of this that represents the character passed to the function
     */
    this.getChildNode = function (character) {

        for (var i = 0; i < this.childNodes.length; i++) {
            if (this.childNodes[i].character == character)
                return this.childNodes[i];
        }
    };

    /**
     * Adds new phrases to the trie.
     * @param phrase, the phrase as a string
     * @param insertType, either global or local
     * @param frequency, the relative frequency of the phrase
     */
    this.insertPhrase = function (phrase, insertType, frequency) {

        // This is for the case of a phrase that is a sub-phrase of another phrase. A node having a frequency value indicates that it is the last node of a complete phrase.
        // For example 'Hell' is a sub-phrase of 'Hello'
        if (phrase.length == 0) {
            this.frequency = frequency;
            return;
        }
        else {
            for (var i = 0; i < this.childNodes.length; i++) {
                if (this.childNodes[i].character == phrase[0]) {
                    this.childNodes[i].insertPhrase(phrase.substring(1, phrase.length), insertType, frequency);
                    return;
                }
            }

            // If there are 0 nodes who's character value is equal to the first character of the phrase then create one
            if (phrase.length > 0) {
                var newNode = new Node();
                newNode.character = phrase[0];

                if (phrase.length == 1)
                    newNode.frequency = frequency;


                newNode.parentNode = this;
                newNode.insertPhrase(phrase.substring(1, phrase.length), insertType, frequency);
                this.childNodes.push(newNode);
            }
        }
    };


    /**
     * Returns phrases that this node is a member of.
     * The function follows the node down to the bottom of all possible paths and returns the phrases represented by those paths.
     */
    this.getPhrases = function () {
        var phrases = [];

        for (var i = 0; i < this.childNodes.length; i++) {

            var childPhrases = this.childNodes[i].getPhrases();

            // Flatten the returned phrases into this.phrases
            for (var k = 0; k < childPhrases.length; k++) {
                phrases.push(childPhrases[k]);
            }
        }

        // This is for the case of sub-phrases. Such as 'Hell' and 'Hello'
        if (this.frequency)
            phrases.push({phrase: this.getPhrase(), frequency: this.frequency});


        // If this is the bottom most node then return its phrase
        if (this.childNodes.length == 0) {
            return [
                {phrase: this.getPhrase(), frequency: this.frequency}
            ];
        }

        return phrases;
    }


    /**
     * Returns the sum of all the node's parent node character. This means that it returns the phrase that make up the path to this node.
     * This function is called recursively
     */
    this.getPhrase = function () {

        var phrase = arguments[0] ? arguments[0] : "";

        // Recursively travel up the trie and concat all the nodes characters
        if (this.parentNode.character)
            return this.parentNode.getPhrase(this.character + phrase);

        // If this is the root node then return the concated phrase
        else
            return this.character + phrase;
    }
}