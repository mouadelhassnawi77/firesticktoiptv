/**
 * Channel categories for /channels.
 * Deliberately generic: no third-party channel names, league names or logos on the site.
 * Brand names in marketing copy are what rights-holder monitoring tools search for, and naming them
 * implies licensing claims the site can't back up. Describe categories, never specific branded channels.
 */
export type ChannelGroup = { id: string; title: string; intro: string; channels: string[] };

export const channelGroups: ChannelGroup[] = [
  {
    id: "sports",
    title: "Sports",
    intro: "Pro and college sports from across the US.",
    channels: [
      "American football, pro and college",
      "Basketball, pro and college",
      "Baseball",
      "Hockey",
      "Soccer, US and international leagues",
      "Golf and tennis",
      "Motorsports",
      "Regional sports channels",
    ],
  },
  {
    id: "events",
    title: "Fight nights & events",
    intro: "Combat sports and big one-off events on dedicated event channels.",
    channels: ["MMA", "Boxing", "Pro wrestling", "Special event channels"],
  },
  {
    id: "local",
    title: "Network & local TV",
    intro: "The major broadcast networks and local stations from big US markets.",
    channels: ["Broadcast networks", "Local stations: New York, Los Angeles, Chicago, Dallas and more", "Public TV"],
  },
  {
    id: "news",
    title: "News & weather",
    intro: "National, business and international news, live 24/7.",
    channels: ["National news", "Business news", "International news", "Weather"],
  },
  {
    id: "movies",
    title: "Movies & premium",
    intro: "Premium movie channels plus a large on-demand library.",
    channels: ["Premium movie channels", "Classic movies", "Drama and series channels", "Movies & series on demand"],
  },
  {
    id: "entertainment",
    title: "Entertainment & lifestyle",
    intro: "Reality, food, home, history and documentary channels.",
    channels: ["Reality & lifestyle", "Food & home", "Documentary & science", "History", "Comedy"],
  },
  {
    id: "kids",
    title: "Kids & family",
    intro: "Cartoons and family programming for all ages.",
    channels: ["Preschool", "Cartoons", "Family movies", "Learning & nature"],
  },
  {
    id: "latino",
    title: "Latino & Spanish",
    intro: "Spanish-language channels from the US and Latin America.",
    channels: ["US Spanish-language networks", "Spanish-language sports", "Channels by Latin American country"],
  },
  {
    id: "international",
    title: "International",
    intro: "Channels for families from around the world.",
    channels: ["Canada", "UK & Ireland", "Europe", "Arabic", "Africa", "India & South Asia", "Caribbean", "Asia"],
  },
];
