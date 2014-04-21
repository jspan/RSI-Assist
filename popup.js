jQuery(document).ready(function () {
        restore_options();

        // Send toggle value to background.js to enable/disable the extension
        jQuery('#assistToggle').click(function () {
                chrome.runtime.sendMessage({messageType: "toggle", value: jQuery('#assistToggle').is(':checked')});
            }
        );
    }
);

// Restore saved options
function restore_options() {

    // Restores checkbox state using the value from background.js
    chrome.runtime.sendMessage(
        {messageType: "toggle"},
        function (value) {
            jQuery('#assistToggle').prop('checked', value.reply);
        }
    );
}