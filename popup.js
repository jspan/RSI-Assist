jQuery(document).ready(function () {
        restore_options();

        jQuery('#disableBox').click(function () {
                chrome.runtime.sendMessage({messageType: "disable", value: jQuery('#disableBox').is(':checked')});
            }
        );
        jQuery('#insertSpaceBox').click(function () {
                chrome.runtime.sendMessage({messageType: "setInsertSpace", value: jQuery('#insertSpaceBox').is(':checked')});
            }
        );
        jQuery('#minchars').click(function () {
                chrome.runtime.sendMessage({messageType: "setMinChars", value: $('#minchars :selected').val()});
            }
        );
    }
);

// Restore saved options
function restore_options() {

    // Restores checkbox state using the value from background.js
    chrome.runtime.sendMessage(
        {messageType: "disable"},
        function (value) {
            jQuery('#disableBox').prop('checked', value.reply);
        }
    );
    chrome.runtime.sendMessage(
        {messageType: "setInsertSpace"},
        function (value) {
            jQuery('#insertSpaceBox').prop('checked', value.reply);
        }
    );
    chrome.runtime.sendMessage(
        {messageType: "setMinChars"},
        function (value) {
            jQuery('#minchars').val(value.reply).change();
        }
    );
}
