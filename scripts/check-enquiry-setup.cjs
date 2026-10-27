// Local behavioural tests only. These doubles cannot prove Google permissions,
// signed-out access, email delivery or actual Forms submission behaviour.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'create-enquiry-form.gs'), 'utf8');

function environment({ failSheetOnce = false } = {}) {
  const state = { forms: [], sheets: [], properties: new Map(), logs: [], released: 0, publishSnapshots: [] };
  class Item {
    constructor(kind) { this.kind = kind; }
    getTitle() { return this.title; }
    setTitle(value) { this.title = value; return this; }
    setRequired(value) { this.required = value; return this; }
    setHelpText(value) { this.help = value; return this; }
    setChoiceValues(value) { this.choices = [...value]; return this; }
    showOtherOption(value) { this.other = value; return this; }
    setValidation(value) { this.validation = value; return this; }
  }
  for (const kind of ['Text', 'Checkbox', 'List', 'MultipleChoice', 'ParagraphText']) {
    Item.prototype[`as${kind}Item`] = function() { assert.equal(this.kind, kind); return this; };
  }
  class Form {
    constructor(title, published) { this.title = title; this.published = published; this.items = []; }
    getId() { return 'form-1'; }
    getItems() { return this.items; }
    getPublishedUrl() { return 'https://docs.google.com/forms/d/e/public-test/viewform'; }
    getEditUrl() { return 'https://docs.google.com/forms/d/form-1/edit'; }
    getDestinationId() { return this.destination || null; }
    setDestination(type, id) { assert.equal(type, 'SPREADSHEET'); this.destination = id; return this; }
    setPublished(value) { state.publishSnapshots.push([this.items.length, this.destination]); this.published = value; return this; }
  }
  for (const method of ['Description', 'ConfirmationMessage', 'CollectEmail', 'LimitOneResponsePerUser', 'PublishingSummary', 'AllowResponseEdits', 'ShuffleQuestions', 'ProgressBar', 'AcceptingResponses']) {
    Form.prototype[`set${method}`] = function(value) { this[method] = value; return this; };
  }
  for (const kind of ['Text', 'Checkbox', 'List', 'MultipleChoice', 'ParagraphText']) {
    Form.prototype[`add${kind}Item`] = function() { const item = new Item(kind); this.items.push(item); return item; };
  }
  function validator() {
    const data = {};
    const builder = { build: () => ({ ...data }) };
    for (const method of ['requireTextMatchesPattern', 'requireNumberGreaterThan', 'requireSelectAtLeast', 'setHelpText']) {
      builder[method] = value => { data[method] = value; return builder; };
    }
    return builder;
  }
  const context = vm.createContext({
    console: { log: message => state.logs.push(message) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => state.released++ }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => state.properties.get(key) || null,
      setProperty: (key, value) => state.properties.set(key, value)
    }) },
    FormApp: {
      create: (title, published) => { assert.equal(published, false); const form = new Form(title, published); state.forms.push(form); return form; },
      openById: id => { assert.equal(id, 'form-1'); if(!state.forms[0]) throw new Error('Saved form unavailable'); return state.forms[0]; },
      createTextValidation: validator, createCheckboxValidation: validator,
      DestinationType: { SPREADSHEET: 'SPREADSHEET' }
    },
    SpreadsheetApp: {
      create: title => {
        if(failSheetOnce) { failSheetOnce = false; throw new Error('Simulated interrupted setup'); }
        const sheet = { title, getId: () => 'sheet-1' }; state.sheets.push(sheet); return sheet;
      },
      openById: id => { assert.equal(id, 'sheet-1'); return state.sheets[0]; }
    }
  });
  vm.runInContext(source, context);
  return { state, run: () => context.createEnquiryForm() };
}

const setup = environment();
const urls = setup.run();
const form = setup.state.forms[0];
assert.equal(form.title, 'Syethugriha — Home Enquiry');
assert.deepEqual(form.items.map(item => item.title), ['Name', 'Mobile number', 'Services needed', 'Property type', 'Home size', 'Property locality', 'Approximate area', 'Planned budget', 'Planned start', 'Tell us about your project']);
assert.equal(form.items.filter(item => item.required).length, 6);
assert.ok(form.items.slice(0, 6).every(item => item.required));
assert.ok(form.items.slice(6).every(item => !item.required));
assert.ok(form.items.every(item => item.defaultValue === undefined));
const mobile = new RegExp(form.items[1].validation.requireTextMatchesPattern);
assert.ok(mobile.test('9876543210'));
for(const invalid of ['', '987654321', '+919876543210', '98765 43210', '1234567890', 'abcdefghij']) assert.ok(!mobile.test(invalid));
assert.equal(form.items[2].validation.requireSelectAtLeast, 1);
assert.equal(form.items[2].other, true);
assert.equal(form.items[2].choices.length, 7);
assert.ok(form.items[3].choices.includes('Villa'));
assert.ok(form.items[4].choices.includes('Other/not applicable'));
assert.equal(form.items[6].validation.requireNumberGreaterThan, 0);
assert.ok(form.items[7].choices.includes('Not decided'));
assert.ok(form.items[8].choices.includes('Exploring options'));
for(const setting of ['CollectEmail', 'LimitOneResponsePerUser', 'PublishingSummary', 'ShuffleQuestions', 'AllowResponseEdits']) assert.equal(form[setting], false);
assert.equal(form.AcceptingResponses, true);
assert.deepEqual(setup.state.publishSnapshots, [[10, 'sheet-1']]);
assert.equal(setup.state.sheets[0].title, 'Syethugriha — Enquiries');
assert.equal(urls.spreadsheetId, 'sheet-1');
assert.ok(setup.state.logs.some(line => line.includes('const SITE_CONFIG = Object.freeze(') && line.includes(urls.responderUrl)));

form.Description = 'Owner customisation';
setup.run();
assert.equal(setup.state.forms.length, 1); assert.equal(setup.state.sheets.length, 1);
assert.equal(form.items.length, 10); assert.equal(form.Description, 'Owner customisation');
assert.equal(setup.state.released, 2);

const interrupted = environment({ failSheetOnce: true });
assert.throws(interrupted.run, /Simulated interrupted setup/);
assert.equal(interrupted.state.forms[0].published, false);
assert.equal(interrupted.state.released, 1);
interrupted.run();
assert.equal(interrupted.state.forms.length, 1); assert.equal(interrupted.state.sheets.length, 1);
assert.equal(interrupted.state.forms[0].items.length, 10);
assert.equal(interrupted.state.forms[0].published, true);

const missing = environment();
missing.state.properties.set('SYETHUGRIHA_FORM_ID', 'form-1');
assert.throws(missing.run, /Saved form unavailable/);
assert.equal(missing.state.forms.length, 0); assert.equal(missing.state.released, 1);
console.log('Passed enquiry setup checks: question schema, validation, publication order, Sheet linkage, repeat runs, interrupted setup recovery and missing-file handling.');
