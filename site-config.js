// Configure public Google Forms URLs here. Use the full docs.google.com/forms/
// responder URL (ending in /viewform), not an editor or response-sheet link.
// The embed URL is optional; when empty it is derived from the responder URL.
// Until configured, the consultation page shows working WhatsApp and call links.
// Create the business-owned form with scripts/create-enquiry-form.gs, then copy
// the public configuration it prints. See docs/google-forms-setup.md for setup,
// owner notifications and the signed-out submission checks required for launch.
const SITE_CONFIG = Object.freeze({
  googleFormResponderUrl: "",
  googleFormEmbedUrl: ""
});
