/* ==========================================================================
   BUBBLO — Frontend configuration (single source of truth)
   --------------------------------------------------------------------------
   Edit values here only. Nothing else in the app hardcodes these.
   ========================================================================== */

window.BUBBLO_CONFIG = {
  brand: "BUBBLO",
  tagline: "Make Moments Magical.",

  /* --- Contact (exact business data — do not change) --------------------- */
  contact: {
    whatsappDisplay: "+91 95280 97342",
    whatsappNumber: "919528097342",
    whatsappUrl: "https://wa.me/919528097342",
    email: "mrvickybusines@gmail.com",
    emailUrl: "mailto:mrvickybusines@gmail.com",
    prefilledMessage:
      "Hi BUBBLO 👋\nI want more information about your bubble products. Please share the product details, price and available options."
  },

  /* --- Market ------------------------------------------------------------ */
  market: { country: "India", currency: "INR", currencySymbol: "₹", locale: "en-IN" },

  /* --- Payment ----------------------------------------------------------- */
  payment: { method: "COD", label: "Cash On Delivery", onlineEnabled: false },

  /* --- Order delivery ----------------------------------------------------
     Every order is emailed to the business inbox below, with no signup or
     server. `emailEndpoint` is a form-to-email relay (FormSubmit).
     IMPORTANT: the very first order sends an activation email to `email` —
     click "Activate" in it once, and every order after that is delivered
     automatically. To send orders elsewhere, change `email` AND the address
     inside `emailEndpoint`.
  ------------------------------------------------------------------------ */
  order: {
    email: "mrvickybusines@gmail.com",
    emailEndpoint: "https://formsubmit.co/ajax/mrvickybusines@gmail.com"
  },

  /* --- Campaign ----------------------------------------------------------
     "BUBBLE MEGA DAYS" / "LIMITED TIME BUBBLE DROP".
     CAMPAIGN_END is the ONE configurable campaign end timestamp. It is a fixed
     absolute instant (with the +05:30 IST offset), NOT generated per page load,
     so the countdown survives reloads and never resets.

     To run a real campaign, change `end` to the real campaign end time.
     To wire it to a backend, set it at runtime before app.js runs, e.g.:
        window.BUBBLO_CONFIG.campaign.end = "<ISO-8601 timestamp>";
  ------------------------------------------------------------------------ */
  campaign: {
    name: "BUBBLE MEGA DAYS",
    concept: "LIMITED TIME BUBBLE DROP",
    supporting: "Special launch prices for a limited time.",
    // Fixed campaign end instant — change this single value to reschedule.
    end: "2026-10-06T23:59:59+05:30"
  },

  /* --- Shipping ----------------------------------------------------------
     No shipping rule has been supplied, so no fee is invented. The cart shows
     a neutral "to be confirmed" state and the total equals the subtotal.
     If a real flat rate is provided later, set `flatRate` (in rupees).
  ------------------------------------------------------------------------ */
  shipping: { flatRate: null, note: "Shipping is confirmed when we call to confirm your COD order." },

  /* --- Storage keys ------------------------------------------------------ */
  storage: { cart: "bubblo_cart_v1", orders: "bubblo_orders_v1", lastOrder: "bubblo_last_order_v1" }
};
