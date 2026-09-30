import { site, formatPrice } from "./site";
import { trial, lowestMonthly, plans } from "./shop";

export type Faq = { q: string; a: string };

/**
 * Keep every answer true to the real offer (price, trial, devices, refunds).
 * The first 6 are shown on the homepage and marked up as FAQPage schema there.
 */
export const faqs: Faq[] = [
  {
    q: "What is an IPTV service?",
    a: "IPTV (Internet Protocol Television) delivers live TV over your internet connection instead of cable, satellite or an antenna. You install a player app on your Firestick, Smart TV or phone, sign in with the login we send you, and all channels load inside the app.",
  },
  {
    q: "How does the free IPTV trial work?",
    a: `Message us on WhatsApp through the free trial button, tell us your device, and we send you a ${trial.hours}-hour test login. The trial includes the full channel list, costs nothing and ends on its own. No card needed.`,
  },
  {
    q: "How much does your IPTV subscription cost?",
    a: `Plans start at ${formatPrice(plans[0].price)} for 1 month. The 12-month plan costs ${formatPrice(plans[plans.length - 1].price)}, which works out to about ${formatPrice(lowestMonthly)} per month. You pay once for the period you pick. Nothing renews automatically.`,
  },
  {
    q: "Does it include US sports?",
    a: "Yes. The lineup covers pro and college football, basketball, baseball, hockey, soccer and combat sports, alongside US local, news, movie, kids and international channels.",
  },
  {
    q: "Does it work on Amazon Firestick?",
    a: "Yes, the Firestick is the device most of our customers use. It works on every Fire TV Stick and Fire TV Cube, and also on Samsung and LG Smart TVs, Android TV, Google TV, iPhone, iPad, Apple TV, MAG boxes and computers.",
  },
  {
    q: "What internet speed do I need?",
    a: `At least ${site.minSpeedMbps} Mbps for smooth HD and 4K. A wired connection or 5 GHz Wi-Fi works best. Below ${site.minSpeedMbps} Mbps the picture can buffer or drop, and we can't take responsibility for interruptions caused by a slower connection.`,
  },
  {
    q: "Can I get a refund?",
    a: `Yes. If the service doesn't work for you, or you simply change your mind, ask for a refund within ${site.refundDays} days of your purchase. Just send us a message on WhatsApp.`,
  },
  {
    q: "How many devices can I use at the same time?",
    a: `Each subscription streams on ${site.connections} device at a time. You can install the app on several devices and switch between them, as long as only one is playing.`,
  },
  {
    q: "How fast do I get my login after paying?",
    a: "Usually within minutes. We send your login details on WhatsApp together with setup steps for your device, and we can walk you through the installation if you need help.",
  },
  {
    q: "Does my subscription renew automatically?",
    a: "No. Your plan simply ends after the period you paid for. We remind you before it runs out, and you decide whether to renew.",
  },
];
