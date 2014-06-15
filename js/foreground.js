jQuery(document).ready(
    function () {
        jQuery(document).click(processEvent);
        jQuery(document).keyup(processEvent);
    }
);


// Do not modify without attendant changes in background.js
// This function sends a message to background.js asking it for suggestions
var getSuggestionsFromBackground = function (phrase, callback, e) {

    chrome.runtime.sendMessage(
        {messageType: "suggestion", phrase: phrase},
        function (response) {
            callback(response.reply, response.prefs, e);
        }
    );
}


/**
 * Takes an array of sorted suggestion objects and displays them.
 * @param suggestions
 */
var displaySuggestions = function (suggestions, prefs) {

    // Remove the previous suggestion area
    if (jQuery('#suggestion-area').length) {
        jQuery('#suggestion-area').remove();
    }

    // Create suggestion-area
    jQuery('body').append(RSIAssist.suggetionsArrayToUL(suggestions));

    // Position the suggestion area
    jQuery('#suggestion-area').offset({left: RSIAssist.getCaretCoordinates().x, top: RSIAssist.getCaretCoordinates().y + 20});
}


/**
 * Inserts the suggestion into the text/input area at the location of the cursor.
 * @param suggestions
 * @param e
 */
var insertSuggestion = function (suggestions, prefs, e) {

    if (!suggestions) return;

    var caretPosition = jQuery(':focus').caret();
    var inputArea = jQuery(':focus');
    var suggestionToAdd = suggestions[parseInt(String.fromCharCode(e.keyCode - 1)) ];
    var inputAreaTxt = jQuery(':focus').val();
    var currentPhrase = RSIAssist.parseCurrentPhrase(inputAreaTxt.substr(0, caretPosition));
    var newCaratPosition =  caretPosition - currentPhrase.length + suggestionToAdd.length;
    
    if (prefs.insertSpace) 
        newCaratPosition += 1;

    // If we are editing a content editable area
    if (jQuery(':focus').attr('contentEditable')) {
        inputAreaTxt = jQuery(':focus').html();
        currentPhrase = RSIAssist.parseCurrentPhrase(inputAreaTxt.substr(0, caretPosition));

        // Insert the suggestion into the element at the correct position
        inputArea.html(inputAreaTxt.substring(0, caretPosition - currentPhrase.length) + suggestionToAdd + "&nbsp;" + inputAreaTxt.substring(caretPosition, inputAreaTxt.length));
    }
    else {
        // Insert the suggestion into the element at the correct position
        inputArea.val(inputAreaTxt.substring(0, caretPosition - currentPhrase.length) + suggestionToAdd + " " + inputAreaTxt.substring(caretPosition, inputAreaTxt.length));
    }

    // Move the caret to the new position. 
    jQuery(':focus').caret(newCaratPosition);
}

/**
 * A function to handle keyup and click events
 * @param e
 */
function processEvent(e) {

    // If the item currently focused is an editable area
    if (RSIAssist.isGenericInputArea(jQuery(':focus'))) {

        var inputArea = e.target;
        var cursorPosition = jQuery(inputArea).caret();
        var fulltext = jQuery(inputArea).val();

        if (jQuery(':focus').attr('contentEditable')) {
            fulltext = jQuery(inputArea).html();
            console.log("postion: " + cursorPosition);
        }

        var currentPhrase = RSIAssist.parseCurrentPhrase(fulltext.substr(0, cursorPosition));

        // If a number was pressed insert the phrase into the input field
        // Number 1 to 4
        if (e.keyCode > 48 && e.keyCode < 54) {
            getSuggestionsFromBackground(currentPhrase.substring(0, currentPhrase.length - 1), 
                                        insertSuggestion, 
                                        e);
        }
        // Get suggestions and display them
        else {
            getSuggestionsFromBackground(currentPhrase, displaySuggestions);
        }

    }
    else {
        if (jQuery('#suggestion-area').length) {
            jQuery('#suggestion-area').remove();
        }
    }
}


/**
 * A helper namespace for the extension
 * @type {{function: *}}
 */
(function (RSIAssist) {

    /**
     * Takes an element and determines if its an area that accepts input
     * @param element
     */
    RSIAssist.isGenericInputArea = function (element) {
        if (element.attr('contentEditable') || element.is('input:text') || element.is('textarea')) {
            return true;
        }
        return false;
    };


    /**
     * This function takes all(or some) of the text preceding the cursor and returns only the preceding phrase.
     * @param text
     * @returns {*}
     */
    RSIAssist.parseCurrentPhrase = function (text) {
        // Replace &nbsp;
        //text = text.replace(/\s+/g, " ");

        var textArray = text.split(" ");
        return textArray[textArray.length - 1];
    };


    /**
     * Returns x,y coordinates of the cursor.
     * @returns {{x: *, y: *}}
     */
    RSIAssist.getCaretCoordinates = function () {
        var absoluteCaretXPosition;
        var absoluteCaretYPosition;
        var inputArea = jQuery(':focus');

        if (jQuery(':focus').is('textarea')) {
            absoluteCaretXPosition = jQuery(inputArea).textareaHelper('caretPos').left + jQuery(inputArea).offset().left;
            absoluteCaretYPosition = jQuery(inputArea).textareaHelper('caretPos').top + jQuery(inputArea).offset().top;
        }
        else if (jQuery(':focus').is('input:text')) {
            absoluteCaretXPosition = jQuery(inputArea).getCursorPosition().left;
            absoluteCaretYPosition = jQuery(inputArea).getCursorPosition().top;
        }
        else if (jQuery(':focus').attr('contentEditable')) {
            absoluteCaretXPosition = RSIAssist.getSelectionCoords().x;
            absoluteCaretYPosition = RSIAssist.getSelectionCoords().y;
        }

        return {x: absoluteCaretXPosition, y: absoluteCaretYPosition};
    };


    /**
     * Returns the coordinates of the caret for contentEditable areas
     * See: http://stackoverflow.com/questions/6846230/javascript-text-selection-page-coordinates
     * @returns {{x: number, y: number}}
     */
    RSIAssist.getSelectionCoords = function () {
        var sel = document.selection, range;
        var x = 0, y = 0;
        if (sel) {
            if (sel.type != "Control") {
                range = sel.createRange();
                range.collapse(true);
                x = range.boundingLeft;
                y = range.boundingTop;
            }
        } else if (window.getSelection) {
            sel = window.getSelection();
            if (sel.rangeCount) {
                range = sel.getRangeAt(0).cloneRange();
                if (range.getClientRects) {
                    range.collapse(true);
                    var rect = range.getClientRects()[0];
                    x = rect.left;
                    y = rect.top;
                }
            }
        }
        return { x: x, y: y };
    };


    /**
     * Creates the HTML of the suggestion area that is to be displayed
     * @param suggestions
     * @returns {string}
     */
    RSIAssist.suggetionsArrayToUL = function (suggestions) {

        if (!suggestions)
            return;

        var suggestionString = "<ul id=\"suggestion-area\">";

        for (var i = 0; i < suggestions.length; ++i) {
            suggestionString += "<li>" + (i + 1) + ": &nbsp;" + suggestions[i] + "</li>";
        }

        suggestionString += "</ul>";
        return suggestionString;
    };


}(window.RSIAssist = window.RSIAssist || {}));
