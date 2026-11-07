/*
 * ─────────────────────────────────────────────────────────────────────────
 *  SITE CONFIG: the only file you need to edit for links, handles and photos.
 *  Anything left as "" shows a friendly "coming soon" state on the site.
 *  Search this file for "PLACEHOLDER" to find everything still to fill in.
 * ─────────────────────────────────────────────────────────────────────────
 */
window.SITE_CONFIG = {
  kids: [
    {
      id: "vera",
      name: { en: "Vera", ru: "Вера", ruGenitive: "Веры" },
      // Used only for the calculator and the "next birthday" countdown.
      // The site shows month and day only, never the year.
      birthday: { year: 2014, month: 5, day: 2 },

      // PLACEHOLDER: Vera's official contribution link. In the Trump Accounts app:
      // open Vera's account → QR icon (top left) → Share link. Paste the URL here.
      contributeUrl: "",

      // PLACEHOLDER: optional QR code image saved from the app, e.g. "assets/qr/vera-qr.png".
      qrImage: "",

      photo: {
        webp: "assets/photos/vera.webp",
        jpg: "assets/photos/vera.jpg",
        // CSS object-position: which part of the photo stays visible when cropped.
        focus: "50% 30%",
      },
    },
    {
      id: "alisa",
      name: { en: "Alisa", ru: "Алиса", ruGenitive: "Алисы" },
      birthday: { year: 2016, month: 8, day: 28 },

      // PLACEHOLDER: Alisa's official contribution link (same steps as above).
      contributeUrl: "",

      // PLACEHOLDER: optional QR code image, e.g. "assets/qr/alisa-qr.png".
      qrImage: "",

      photo: {
        webp: "assets/photos/alisa.webp",
        jpg: "assets/photos/alisa.jpg",
        focus: "50% 35%",
      },
    },
  ],

  // For relatives outside the US. Misha receives the gift and adds it to the girl's account.
  abroad: {
    // PLACEHOLDER: Wise. Paste a Wise payment link (wise.com/pay/me/...) and/or the @Wisetag.
    wise: { url: "", handle: "" },
    // PLACEHOLDER: PayPal. Paste a paypal.me link and/or the PayPal email.
    paypal: { url: "", handle: "" },
  },

  // PLACEHOLDER (optional): how relatives can reach Misha with questions.
  // Leave "" to hide. Example: "mailto:you@example.com" or "https://t.me/username".
  contactUrl: "",

  // Assumptions used by the growth calculator (illustrative only).
  calculator: {
    defaultAmount: 100,
    defaultReturn: 7,
    inflation: 3,
    annualLimit: 5000,
  },
};
