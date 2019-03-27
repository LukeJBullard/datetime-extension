$(document).ready(function() {
    DefaultDateTime.setDashboard();
    DefaultDateTime.applyParameterValues();
    
    function configure() { 
        const defaultIntervalInMin = 5;
        const popupUrl = "https://lukejbullard.github.io/datetime-extension/defaultdatetime.html";

        tableau.extensions.ui.displayDialogAsync(popupUrl, defaultIntervalInMin, { height: 500, width: 500 }).then((closePayload) => {
            // The close payload is returned from the popup extension via the closeDialog() method.
        }).catch((error) => {
            // code for error handling
        });
    }

    tableau.extensions.initializeAsync({'configure': configure});
    $("#configure").on("click", configure);
});