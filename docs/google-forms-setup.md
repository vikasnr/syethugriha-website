# Google Forms enquiry setup

The website embed is ready, but a real form has not yet been created or connected. The setup script creates the form and response Sheet in the Google account that runs it. No Google credentials belong in the website repository.

## Create the form and response Sheet

1. Sign in with the business Google account that should own enquiries. Open [Google Apps Script](https://script.google.com/) and create a new standalone project named **Syethugriha enquiry setup**.
2. Replace the starter code with the complete contents of [create-enquiry-form.gs](../scripts/create-enquiry-form.gs).
3. Save, select `createEnquiryForm`, and run it. Review Google's authorization prompt for Forms and Sheets access under the intended account.
4. The execution log prints the public responder URL, private editor and spreadsheet URLs, and a public `SITE_CONFIG` block. Keep the private links within the business team.
5. Copy the generated public configuration into [site-config.js](../site-config.js). The optional embed URL is derived automatically; do not paste an editor or response-Sheet URL.

Keep this Apps Script project. Repeating a successful run prints the existing URLs without creating duplicate files or overwriting later form edits. An interrupted setup reuses its saved form and Sheet and resumes question creation. Do not clear its script properties or rerun from a new project unless a separate form is intended. If a saved file was deleted or access was revoked, restore access before rerunning; the script deliberately does not silently create a replacement.

The script uses Google's documented [Forms service](https://developers.google.com/apps-script/reference/forms/form) and [validation builders](https://developers.google.com/apps-script/reference/forms/text-validation-builder). It creates the form unpublished, adds its questions and response destination, then publishes it. Actual access remains subject to your Google Workspace account policies.

## Questions created

Questions appear in this order, without default answers or branching:

| Question | Type and choices | Required |
| --- | --- | --- |
| Name | Short answer | Yes |
| Mobile number | Short answer; `^[6-9][0-9]{9}$`; omit +91 and spaces | Yes |
| Services needed | Checkboxes: Renovation; Home interiors; Kitchens and wardrobes; Living/bedroom design; Custom furniture; 3D planning; Experience centre visit; Other with free text. Select at least one. | Yes |
| Property type | Dropdown: Apartment; Independent house; Villa; Other | Yes |
| Home size | Dropdown: Studio/1 RK; 1 BHK; 2 BHK; 3 BHK; 4+ BHK; Other/not applicable | Yes |
| Property locality | Short answer; area and city, e.g. Whitefield, Bangalore | Yes |
| Approximate area | Optional number greater than zero; square feet | No |
| Planned budget | Dropdown: Below ₹5 lakh; ₹5–10 lakh; ₹10–20 lakh; Above ₹20 lakh; Not decided | No |
| Planned start | Multiple choice: Immediately; Within 1–3 months; After 3 months; Exploring options | No |
| Tell us about your project | Paragraph | No |

Form title: **Syethugriha — Home Enquiry**. The linked spreadsheet is **Syethugriha — Enquiries**. Budget choices describe the visitor's spending plans, not advertised prices. Google Forms manages validation, submission and confirmation; the website does not maintain duplicate fields.

## Finish owner settings

- In **Responses → More → Get email notifications for new responses**, enable notifications while signed in as the owner. The script does not enable this setting or install an email-sending trigger. Native setup instructions: [manage responses](https://support.google.com/docs/answer/139706?hl=en).
- Set the theme to forest green (`#2F3B32`) with a light background through the Forms theme controls. Google controls the embedded form's typography and available background shades.
- Check responder access is **anyone with the link**, with no organization-only restriction. Email collection and the one-response limit should be off; do not add file uploads. The script disables email collection, the one-response limit and public response summaries. Verify these settings in [Google Forms publishing controls](https://support.google.com/docs/answer/2839588?hl=en).
- Keep editor and spreadsheet sharing restricted to the business team. Verify permissions on both files separately.
- Confirmation text is **“Thank you for your enquiry. The Syethugriha team will contact you to discuss your home.”** No promised callback time or automated customer email is added.

## Verify before launch

1. Open the published responder URL in a signed-out/private browser. Confirm there is no sign-in requirement and all ten questions appear with exactly six marked required.
2. Try submitting empty required fields, a nine-digit mobile, a mobile with `+91`, zero/negative/non-numeric area, and no selected service. Verify helpful validation errors. Leave optional fields blank and verify they do not block submission.
3. Submit **TEST — minimal enquiry** using a business-controlled mobile and only required answers. Submit **TEST — detailed enquiry** using all fields, multiple services and the Other service option.
4. Confirm each submission appears once in the linked Sheet with the correct columns and selections. Check the owner's notification inbox. These are real test responses; do not use customer data.
5. On the website, verify the embed, confirmation and external fallback link at 360px, 390px, 768px and 1440px. If embedding is blocked, the external link and phone/WhatsApp contacts must remain usable. An unpublished or restricted form must be fixed in Forms; the website cannot read its cross-origin error state.
6. Run the local provisioning checks and browser checks described in the README. Review the branch before merging; pushing to `main` deploys the website.

Until a valid public URL is configured, the consultation page retains its working phone/WhatsApp fallback. Signed-out access, real submissions, theme and notification delivery remain account-level checks and cannot be established by local tests.
