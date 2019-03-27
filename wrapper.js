$(document).ready(function() {
    function configure() { 
        const defaultIntervalInMin = 5;
        const popupUrl = "http://localhost:8765/defaultdatetime.html";

        tableau.extensions.ui.displayDialogAsync(popupUrl, defaultIntervalInMin, { height: 500, width: 500 }).then((closePayload) => {
            // The close payload is returned from the popup extension via the closeDialog() method.
        }).catch((error) => {
            // code for error handling
        });
    }

    tableau.extensions.initializeAsync({'configure': configure});
    $("#configure").on("click", configure);
});