// FUNC | INITIALIZE ADD-ON
function init(event) {
    /* S | FETCH SCRIPT PROPERTIES */
    var scriptProperties = PropertiesService.getScriptProperties();
    var xForwardProperties = scriptProperties.getProperties();
    /* E | FETCH SCRIPT PROPERTIES */

    /* S | GENERATE CARD UI */
    var card = CardService.newCardBuilder();

    /* S | GENERATE HEADER,ACTION SECTION */
    var actionSection = CardService.newCardSection();
    actionSection.addWidget(CardService.newTextParagraph()
        .setText('<font color="#000000"><b>Forwarding Rules</b></font><br>'));
    actionSection.addWidget(CardService.newTextParagraph()
        .setText('<font color="#AAAAAA">Only unread emails will be forwarded.</font><br>'));
    var newRuleAction = CardService.newAction().setFunctionName('createNewRuleUI');
    var newRuleButton = CardService.newTextButton().setText('Create Rule').setOnClickAction(newRuleAction);
    var forwardMailsAction = CardService.newAction().setFunctionName('forwardMails');
    var forwardMailsButton = CardService.newTextButton().setText('Forward EMails').setOnClickAction(forwardMailsAction);
    actionSection.addWidget(CardService.newButtonSet().addButton(newRuleButton).addButton(forwardMailsButton));
    card.addSection(actionSection);
    /* E | GENERATE HEADER,ACTION SECTION */

    if (xForwardProperties.forwardRules) {
        /* S | GENERATE FORWARD RULE LIST SECTION */
        var forwardRulesObj = JSON.parse(xForwardProperties.forwardRules);

        var listSection = CardService.newCardSection();
        for (var rule in forwardRulesObj) {
            var obj = forwardRulesObj[rule];
            var widgetText = CardService.newTextParagraph()
                .setText('<font color="#2980b9">Email From :</font>\n' + obj.from + '\n<font color="#2980b9">Forward To :</font>\n' + obj.to);
            listSection.addWidget(widgetText);

            var deleteAction = CardService.newAction().setFunctionName('deleteRule').setParameters({
                id: rule
            });
            var deleteButton = CardService.newTextButton().setText('Delete').setOnClickAction(deleteAction);
            listSection.addWidget(deleteButton);
        }
        card.addSection(listSection);
        /* E | GENERATE FORWARD RULE LIST SECTION */
    } else {
        Logger.log("NO RULES");
    }
    /* E | GENERATE CARD UI */
    return (card.build());
}

// FUNC | GENERATE NEW CARD FOR ADDING FORWARD RULE
function createNewRuleUI() {
    /* S | GENERATE CARD UI */
    var card = CardService.newCardBuilder();

    /* S | GENERATE HEADER,ACTION SECTION */
    var actionSection = CardService.newCardSection();
    actionSection.addWidget(CardService.newTextParagraph()
        .setText('<font color="#000000"><b>Create New Rule</b></font><br>'));
    var saveRuleAction = CardService.newAction().setFunctionName('saveRule');
    var saveRuleButton = CardService.newTextButton().setText('Save Rule').setOnClickAction(saveRuleAction);
    actionSection.addWidget(CardService.newButtonSet().addButton(saveRuleButton));
    card.addSection(actionSection);
    /* E | GENERATE HEADER,ACTION SECTION */

    /* S | GENERATE INPUT FORM SECTION */
    var formSection = CardService.newCardSection();
    var widgetFrom = CardService.newTextInput()
        .setFieldName('inp_from')
        .setTitle('From : (Email Address)');
    formSection.addWidget(widgetFrom);
    var widgetTo = CardService.newTextInput()
        .setFieldName('inp_to')
        .setTitle('To : (Email Address)');
    formSection.addWidget(widgetTo);
    card.addSection(formSection);
    /* E | GENERATE INPUT FORM SECTION */

    // ADD FORM CARD INTO NAVIGATION STACK
    var nav = CardService.newNavigation().pushCard(card.build());
    return CardService.newActionResponseBuilder()
        .setNavigation(nav)
        .build();
    /* E | GENERATE CARD UI */
}

// FUNC | SAVE FORWARD RULE INTO SCRIPT PROPERTIES
function saveRule(e) {
    /* S | GET VALUES FROM PARAMETER */
    var input = e['formInput'];
    var from = input['inp_from'];
    var to = input['inp_to'];
    /* E | GET VALUES FROM PARAMETER */

    if (from !== "" && to !== "") {
        /* S | FETCH SCRIPT PROPERTIES */
        var scriptProperties = PropertiesService.getScriptProperties();
        var xForwardProperties = scriptProperties.getProperties();
        /* E | FETCH SCRIPT PROPERTIES */

        var forwardRulesObj = {};
        if (xForwardProperties.forwardRules) {
            forwardRulesObj = JSON.parse(xForwardProperties.forwardRules);
        }

        var start = new Date();
        var startTime = Number(start.getTime()).toFixed(0);
        var ruleObj = {
            from: from,
            to: to
        };
        forwardRulesObj[startTime] = ruleObj;

        // ADD NEW RULE & UPDATE SCRIPT PROPERTIES
        scriptProperties.setProperty("forwardRules", JSON.stringify(forwardRulesObj));

        // REMOVE FORM CARD FROM NAVIGATION STACK & UPDATE LIST CARD
        var nav = CardService.newNavigation().popCard().updateCard(init());
        return CardService.newActionResponseBuilder()
            .setNavigation(nav)
            .build();
    } else {
        Logger.log("EMPTY VALUES");
    }
}

// FUNC | DELETE FORWARD RULE FROM SCRIPT PROPERTIES
function deleteRule(e) {
    /* S | GET VALUES FROM PARAMETER */
    var id = e.parameters.id;
    /* E | GET VALUES FROM PARAMETER */

    /* S | FETCH SCRIPT PROPERTIES */
    var scriptProperties = PropertiesService.getScriptProperties();
    var xForwardProperties = scriptProperties.getProperties();
    /* E | FETCH SCRIPT PROPERTIES */

    var forwardRules = JSON.parse(xForwardProperties.forwardRules);
    var forwardRulesObj = {};
    for (var rule in forwardRules) {
        var obj = forwardRules[rule];
        if (rule != id) {
            var ruleObj = {
                from: obj.from,
                to: obj.to
            };
            forwardRulesObj[rule] = ruleObj;
        }
    }

    // DELETE SELECTED RULE & UPDATE SCRIPT PROPERTIES
    scriptProperties.setProperty("forwardRules", JSON.stringify(forwardRulesObj));

    // UPDATE LIST CARD
    var nav = CardService.newNavigation().updateCard(init());
    return CardService.newActionResponseBuilder()
        .setNavigation(nav)
        .build();
}

// FUNC | FORWARD MAILS USING FORWARD RULES FROM SCRIPT PROPERTIES
function forwardMails() {
    /* S | FETCH SCRIPT PROPERTIES */
    var scriptProperties = PropertiesService.getScriptProperties();
    var xForwardProperties = scriptProperties.getProperties();
    /* E | FETCH SCRIPT PROPERTIES */

    if (xForwardProperties.forwardRules) {
        var forwardRulesObj = JSON.parse(xForwardProperties.forwardRules);
        for (var rule in forwardRulesObj) {
            var obj = forwardRulesObj[rule];
            var fromEmail = obj.from;
            var toEmail = obj.to;

            var threads = GmailApp.search('is:unread from:(' + fromEmail + ')');
            for (var i = 0; i < threads.length; i++) {
                var messages = threads[i].getMessages();
                for (var j = 0; j < messages.length; j++) {
                    var message = messages[j];
                    Logger.log(message.getSubject());
                    message.forward(toEmail);
                    message.markRead();
                }
            }
        }
    }
}