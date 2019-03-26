var DefaultDateTime = {
    dashboard: null,

    /**
     * Retrieves the settings for a dashboard
     * If dashboardName is null (default), retrieves the settings for all dashboards
     */
    getSettings(dashboardName = null)
    {
        // get the extension settings from the workbook
        let settingsString = tableau.extensions.settings.get("defaultdatetime");
        
        if (typeof(settingsString) === "undefined")
        {
            return dashboardName == null ? {} : [];
        } else {
            let allDashboardsSettings = JSON.parse(settingsString);
            if (dashboardName == null)
            {
                return allDashboardsSettings;
            }
            if (typeof(allDashboardsSettings[dashboardName]) === "undefined")
            {
                return [];
            } else {
                return allDashboardsSettings[dashboardName];
            }
        }
    },

    /**
     * Saves a dashboard's settings
     * If dashboardName is null, saves the settings for all dashboards
     */
    saveSettings(settings, dashboardName = null)
    {
        if (dashboardName != null)
        {
            let allSettings = DefaultDateTime.getSettings();
            allSettings[dashboardName] = settings;
            settings = allSettings;
        }

        settings = JSON.stringify(settings);
        tableau.extensions.settings.set("defaultdatetime", settings);

        if (tableau.extensions.environment.mode == "authoring")
        {
            tableau.extensions.settings.saveAsync();
        }
    },

    /**
     * Returns if the parameter is a valid date/datetime and can be updated by this extension
     */
    parameterValid(parameter)
    {
        return typeof(parameter) !== "undefined" && (parameter.dataType == "date" || parameter.dataType == "date-time");
    },

    /**
     * Removes settings for parameters that don't exist or aren't datetime/date
     * Only cleans current dashboard's settings
     */
    cleanSettings: async function()
    {
        var dashboardSettings = DefaultDateTime.getSettings(DefaultDateTime.dashboard.name);

        var parametersToRemove = [];
        for (let index = 0;  index < dashboardSettings.length; index++)
        {
            let parameter = await DefaultDateTime.dashboard.findParameterAsync(dashboardSettings[index].parameter);
            if (!DefaultDateTime.parameterValid(parameter))
            {
                parametersToRemove.push(index);
            }
        }

        // remove settings for parameters that no longer exist
        var counter = 0;
        parametersToRemove.forEach((index) => {
            dashboardSettings.splice(index - counter, 1);
            counter++;
        });
        if (counter > 0)
        {
            DefaultDateTime.saveSettings(dashboardSettings, DefaultDateTime.dashboard.name);
        }
    },

    /**
     * Finds new parameters that are date/datetime
     * Only applies to current dashboard
     */
    findNewParameters: async function()
    {
        var dashboardSettings = DefaultDateTime.getSettings(DefaultDateTime.dashboard.name);

        var allParameters = await DefaultDateTime.dashboard.getParametersAsync();
        var validParameterNames = [];

        //get all the valid parameters from Tableau
        allParameters.forEach((param) => {
            if (DefaultDateTime.parameterValid(param))
            {
                validParameterNames.push(param.name);
            }
        }, this);

        //remove all the parameters from the list that we already know about
        dashboardSettings.forEach((setting, index) => {
            validParameterNames = validParameterNames.filter(val => val !== setting.parameter);
        }, this);

        //add the new parameters to the settings then save
        validParameterNames.forEach((name) => {
            dashboardSettings.push({
                parameter: name,
                expression: ""
            });
        });

        DefaultDateTime.saveSettings(dashboardSettings, DefaultDateTime.dashboard.name);
    },

    /**
     * Updates the value of the parameters via moment.js
     * Only applies current dashboard's settings
     */
    applyParameterValues: async function()
    {
        var dashboardSettings = DefaultDateTime.getSettings(DefaultDateTime.dashboard.name);

        for (let index = 0; index < dashboardSettings.length; index++)
        {
            let setting = dashboardSettings[index];
            let parameter = await DefaultDateTime.dashboard.findParameterAsync(setting.parameter);

            if (!DefaultDateTime.parameterValid(parameter) || setting.expression.trim() == "")
            {
                continue;
            }

            let newValue = eval("moment" + setting.expression);
            if (typeof(newValue) === "object")
            {
                parameter.changeValueAsync(newValue.toDate());
            }
        }
    },

    refreshUI()
    {
        var dashboardSettings = DefaultDateTime.getSettings(DefaultDateTime.dashboard.name);
        var newElement = $("<tbody>");
        var hasSetting = false;

        // add a row for each datetime parameter
        dashboardSettings.forEach((setting, index) => {
            hasSetting = true;

            let row = $("<tr>");
            let paramNameCol = $("<td>").html(setting.parameter);
            let paramValueCol = $("<td>");
            let paramValueInput = $("<input>").attr("type", "text").attr("param-name", setting.parameter).val(setting.expression);
            paramValueCol.append(paramValueInput);
            row.append(paramNameCol).append(paramValueCol);
            newElement.append(row);
        }, this);

        $("#parameterTable tbody").remove();
        $("#parameterTable").append(newElement);

        if (!hasSetting)
        {
            $("#addParameterWarning").removeClass('hidden');
            $("#form").addClass("hidden");
        } else {
            $("#addParameterWarning").addClass('hidden');
            $("#form").removeClass("hidden");
        }
    },

    // saves the form data from the UI
    // only applies to the current dashboard
    saveUIForm()
    {
        var dashboardSettings = DefaultDateTime.getSettings(DefaultDateTime.dashboard.name);

        $("input[param-name]").each((index, element) => {
            //loop through dashboardsettings and set the expression
            dashboardSettings.some((setting, settingIndex) => {
                if (setting.parameter == $(element).attr("param-name"))
                {
                    dashboardSettings[settingIndex].expression = $(element).val();
                    return true;
                }
                return false;
            }, this);
        });

        DefaultDateTime.saveSettings(dashboardSettings, DefaultDateTime.dashboard.name);
    },

    // called when save button clicked
    saveButtonClicked: async function()
    {
        DefaultDateTime.saveUIForm();
        await DefaultDateTime.findNewParameters();
        await DefaultDateTime.cleanSettings();
        DefaultDateTime.applyParameterValues();
        DefaultDateTime.refreshUI();
    },

    // called when tableau initialization succeeded
    initialized: async function()
    {
        DefaultDateTime.dashboard = tableau.extensions.dashboardContent.dashboard;

        await DefaultDateTime.findNewParameters();
        await DefaultDateTime.cleanSettings();
        DefaultDateTime.applyParameterValues();
        DefaultDateTime.refreshUI();

        $("#loading").addClass("hidden");
    },

    // called when there is an error during tableau initialization
    initializedError(err)
    {
        // something went wrong in initialization
        $("#resultBox").html("Error while Initializing: " + err.toString());
    },
};

$(document).ready(function() {
    tableau.extensions.initializeAsync().then(DefaultDateTime.initialized, DefaultDateTime.initializedError);
    $("#saveButton").on("click", DefaultDateTime.saveButtonClicked);
});