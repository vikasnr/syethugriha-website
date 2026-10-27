/**
 * Run createEnquiryForm in a standalone Google Apps Script project owned by the
 * business Google account. This is an owner-run setup script, not website code.
 * Native response notifications and theme colours are configured in Forms UI.
 */
function createEnquiryForm() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var properties = PropertiesService.getScriptProperties();
    var formId = properties.getProperty('SYETHUGRIHA_FORM_ID');
    var form = formId
      ? FormApp.openById(formId)
      : FormApp.create('Syethugriha — Home Enquiry', false);
    if (!formId) properties.setProperty('SYETHUGRIHA_FORM_ID', form.getId());

    // Keep the same project to reuse the form and preserve all responses.
    // A completed rerun prints the URLs without changing owner customisations.
    if (properties.getProperty('SYETHUGRIHA_SETUP_COMPLETE') !== 'true') {
      form.setDescription('Share a few details about your home. Our team will contact you to discuss your requirements.');
      form.setConfirmationMessage('Thank you for your enquiry. The Syethugriha team will contact you to discuss your home.');
      form.setCollectEmail(false);
      form.setLimitOneResponsePerUser(false);
      form.setPublishingSummary(false);
      form.setAllowResponseEdits(false);
      form.setShuffleQuestions(false);
      form.setProgressBar(false);

      // Recover an interrupted setup without duplicating existing questions.
      function question(title, method, cast) {
        var matches = form.getItems().filter(function(item) { return item.getTitle() === title; });
        if (matches.length > 1) throw new Error('Duplicate question: ' + title + '. Review the form before rerunning.');
        return matches.length ? matches[0][cast]() : form[method]().setTitle(title);
      }
      question('Name', 'addTextItem', 'asTextItem').setRequired(true);
      question('Mobile number', 'addTextItem', 'asTextItem')
        .setHelpText('Enter your 10-digit Indian mobile number without +91 or spaces.')
        .setRequired(true)
        .setValidation(FormApp.createTextValidation()
          .requireTextMatchesPattern('^[6-9][0-9]{9}$')
          .setHelpText('Enter a valid 10-digit Indian mobile number without +91 or spaces.').build());
      question('Services needed', 'addCheckboxItem', 'asCheckboxItem')
        .setChoiceValues(['Renovation', 'Home interiors', 'Kitchens and wardrobes', 'Living/bedroom design', 'Custom furniture', '3D planning', 'Experience centre visit'])
        .showOtherOption(true).setRequired(true)
        .setValidation(FormApp.createCheckboxValidation().requireSelectAtLeast(1)
          .setHelpText('Select at least one service.').build());
      question('Property type', 'addListItem', 'asListItem')
        .setChoiceValues(['Apartment', 'Independent house', 'Villa', 'Other']).setRequired(true);
      question('Home size', 'addListItem', 'asListItem')
        .setChoiceValues(['Studio/1 RK', '1 BHK', '2 BHK', '3 BHK', '4+ BHK', 'Other/not applicable']).setRequired(true);
      question('Property locality', 'addTextItem', 'asTextItem')
        .setHelpText('Area and city, e.g. Whitefield, Bangalore').setRequired(true);
      question('Approximate area', 'addTextItem', 'asTextItem')
        .setHelpText('Area in square feet, if known.').setRequired(false)
        .setValidation(FormApp.createTextValidation().requireNumberGreaterThan(0)
          .setHelpText('Enter a number greater than zero, in square feet.').build());
      question('Planned budget', 'addListItem', 'asListItem')
        .setHelpText('Your planned spending; these ranges are not service prices.')
        .setChoiceValues(['Below ₹5 lakh', '₹5–10 lakh', '₹10–20 lakh', 'Above ₹20 lakh', 'Not decided']).setRequired(false);
      question('Planned start', 'addMultipleChoiceItem', 'asMultipleChoiceItem')
        .setChoiceValues(['Immediately', 'Within 1–3 months', 'After 3 months', 'Exploring options']).setRequired(false);
      question('Tell us about your project', 'addParagraphTextItem', 'asParagraphTextItem').setRequired(false);

      var sheetId = properties.getProperty('SYETHUGRIHA_SHEET_ID');
      var sheet = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.create('Syethugriha — Enquiries');
      if (!sheetId) properties.setProperty('SYETHUGRIHA_SHEET_ID', sheet.getId());
      if (form.getDestinationId() !== sheet.getId()) {
        form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());
      }
      form.setPublished(true);
      form.setAcceptingResponses(true);
      properties.setProperty('SYETHUGRIHA_SETUP_COMPLETE', 'true');
    }

    var responderUrl = form.getPublishedUrl();
    console.log('Public responder URL: ' + responderUrl);
    console.log('Private form editor: ' + form.getEditUrl());
    console.log('Private response spreadsheet: https://docs.google.com/spreadsheets/d/' + form.getDestinationId() + '/edit');
    console.log('Copy this public configuration into site-config.js:\n' +
      'const SITE_CONFIG = Object.freeze(' + JSON.stringify({
        googleFormResponderUrl: responderUrl,
        googleFormEmbedUrl: ''
      }, null, 2) + ');');
    console.log('Finish in Forms: enable owner response notifications, choose the theme, and verify signed-out responder access.');
    return { responderUrl: responderUrl, formId: form.getId(), spreadsheetId: form.getDestinationId() };
  } finally {
    lock.releaseLock();
  }
}
