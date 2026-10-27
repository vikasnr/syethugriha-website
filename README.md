# Syethugriha website

Static renovation and interiors website deployed to GitHub Pages. Open `index.html` locally to preview it. Pushing to `main` triggers the existing deployment workflow; feature branches do not deploy automatically.

## Google Forms enquiries

Use [the setup guide](docs/google-forms-setup.md) to create the agreed ten-question enquiry form and linked **Syethugriha — Enquiries** spreadsheet. The owner-run [Google Apps Script](scripts/create-enquiry-form.gs) creates six required questions (name, mobile, services, property type, home size and locality), four optional project questions, validation and the confirmation message. The guide covers business account ownership, owner notifications and signed-out submission tests.

Set `googleFormResponderUrl` in `site-config.js` to the full public Google Forms responder URL ending in `/viewform`. Expand a shortened `forms.gle` link first. Do not use the form editor or response spreadsheet URL.

The optional `googleFormEmbedUrl` must refer to the same public form. When omitted, the site derives it by adding `embedded=true` to the responder URL. With missing or invalid configuration, visitors see working WhatsApp and call links instead of an empty form. An external form link remains visible when the form is configured, including if embedding is blocked.

Before launch, open the form while signed out and verify that the intended audience can respond. Review form questions, any sign-in requirements and response access in Google Forms. Configure response notifications there if needed; embedding does not enable them. Send a clearly labelled test enquiry and confirm it appears in the response list. Google Forms owns validation and the submission confirmation.

## Content

Existing images are presented as design concepts, not verified completed renovations. Add before-and-after photography, testimonials, pricing or warranties only when the business supplies verified details and publication permission.

## Local checks

With Node.js 22+ and Chrome installed, run:

```powershell
node scripts/check-site.cjs
node scripts/check-enquiry-setup.cjs
```

The dependency-free check opens a temporary headless Chrome session, checks responsive widths, routes, contact links, the menu, galleries, reduced motion and Google Forms configuration branches. Screenshots are written to a temporary directory printed by the script. It does not submit an enquiry or deploy the site.

The enquiry setup check runs the Apps Script against local service doubles to verify its questions, validation, Sheet linkage and repeat-run behaviour. It does not authenticate to Google, create real files or verify actual notification delivery.
