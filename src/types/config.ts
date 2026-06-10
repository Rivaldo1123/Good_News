export interface ServiceItem {
  day: string;
  time: string;
  name: string;
  desc: string;
}

export interface EventItem {
  month: string;
  day: string;
  title: string;
  desc: string;
  color: string;
}

export interface MinistryItem {
  icon: string;
  name: string;
  desc: string;
}

export interface ChurchConfig {
  name: string;
  tagline: string;
  badge: string;
  navCtaText: string;

  heroType: string;
  heroColor: string;
  heroImage: string;
  heroGradFrom: string;
  heroGradTo: string;
  heroOverlay: number;
  heroHeading: string;
  heroSub: string;
  heroCta1: string;
  heroCta1Link: string;
  heroCta2: string;
  heroCta2Link: string;

  showInfoBar: boolean;
  infoAddress: string;
  infoService: string;
  infoPhone: string;

  showAbout: boolean;
  aboutHeading: string;
  aboutSub: string;
  aboutBody: string;
  aboutImage: string;
  aboutImageAlt: string;

  showServices: boolean;
  servicesHeading: string;
  servicesSub: string;
  services: ServiceItem[];

  showEvents: boolean;
  eventsHeading: string;
  eventsSub: string;
  events: EventItem[];

  showPastor: boolean;
  pastorTitle: string;
  pastorName: string;
  pastorImage: string;
  pastorImageAlt: string;
  pastorBio: string;

  showMinistries: boolean;
  ministriesHeading: string;
  ministriesSub: string;
  ministries: MinistryItem[];

  showMap: boolean;
  mapHeading: string;
  mapAddress: string;
  mapEmbedUrl: string;

  showContact: boolean;
  contactHeading: string;
  contactSub: string;
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  contactWeb: string;
  formspreeId: string;

  facebook: string;
  instagram: string;
  youtube: string;
  twitter: string;
  footerText: string;

  accent: string;
  headingFont: string;

  siteUrl: string;
  metaDesc: string;
  ogImage: string;
  favicon: string;
  logoUrl: string;

  donationUrl: string;
  donationText: string;
  privacyPolicyUrl: string;
  cookieNotice: string;
  announcementBanner: string;
}

export const DEFAULTS: ChurchConfig = {
  name: "Grace Community Church",
  tagline: "A Place to Belong, Believe & Grow",
  badge: "Non-Denominational",
  navCtaText: "Join Us Sunday",

  heroType: "color",
  heroColor: "#1a1a4e",
  heroImage: "",
  heroGradFrom: "#1a1a4e",
  heroGradTo: "#4a0e6e",
  heroOverlay: 0.45,
  heroHeading: "Welcome Home",
  heroSub: "You don't have to be perfect to worship here. Come as you are.",
  heroCta1: "Join Us Sunday",
  heroCta1Link: "#services",
  heroCta2: "Learn More",
  heroCta2Link: "#about",

  showInfoBar: true,
  infoAddress: "123 Faith Ave, Springfield, IL",
  infoService: "Sundays at 9 AM & 11 AM",
  infoPhone: "(555) 123-4567",

  showAbout: true,
  aboutHeading: "About Our Church",
  aboutSub: "Faith · Community · Purpose",
  aboutBody: "We are a vibrant, welcoming community of believers committed to making faith real and relevant. Whether you're exploring Christianity for the first time or have been a believer for decades, there is a place for you here.\n\nFounded in 1987, our congregation has grown into a family of over 800 members spanning all generations.",
  aboutImage: "",
  aboutImageAlt: "",

  showServices: true,
  servicesHeading: "Join Us for Worship",
  servicesSub: "Everyone is welcome — come as you are",
  services: [
    { day: "Sunday", time: "9:00 AM", name: "Morning Worship", desc: "Traditional service with hymns" },
    { day: "Sunday", time: "11:00 AM", name: "Contemporary", desc: "Modern music, same great message" },
    { day: "Wednesday", time: "7:00 PM", name: "Bible Study", desc: "Midweek deep dive into scripture" },
  ],

  showEvents: true,
  eventsHeading: "Upcoming Events",
  eventsSub: "Stay connected with your church family",
  events: [
    { month: "JUN", day: "15", title: "Summer BBQ", desc: "Family fun for the whole congregation. Bring a dish to share!", color: "#e8507a" },
    { month: "JUN", day: "22", title: "Youth Night", desc: "An evening for teens and young adults. Live music & games.", color: "#6c4ecb" },
    { month: "JUL", day: "4", title: "Prayer Vigil", desc: "A powerful night of corporate prayer and worship.", color: "#20b2aa" },
  ],

  showPastor: true,
  pastorTitle: "Meet Our Pastor",
  pastorName: "Pastor John Smith",
  pastorImage: "",
  pastorImageAlt: "",
  pastorBio: "Pastor John has been leading Grace Community Church for over 15 years with a heart for people and a passion for the Word. He and his wife Jane have three children and are deeply rooted in this community.",

  showMinistries: true,
  ministriesHeading: "Our Ministries",
  ministriesSub: "Find your place to serve and grow",
  ministries: [
    { icon: "👶", name: "Children's Ministry", desc: "Safe, engaging programs for ages 0–12" },
    { icon: "🎯", name: "Youth Ministry", desc: "Empowering teens to live out their faith" },
    { icon: "🎵", name: "Worship Arts", desc: "Choir, band, and creative arts teams" },
    { icon: "🤝", name: "Community Outreach", desc: "Serving the needs of our city" },
    { icon: "📖", name: "Bible Study", desc: "Small groups meeting throughout the week" },
    { icon: "💑", name: "Marriage & Family", desc: "Strengthening homes and relationships" },
  ],

  showMap: true,
  mapHeading: "Find Us",
  mapAddress: "123 Faith Ave, Springfield, IL 62701",
  mapEmbedUrl: "",

  showContact: true,
  contactHeading: "Get In Touch",
  contactSub: "We'd love to hear from you",
  contactAddress: "123 Faith Ave, Springfield, IL 62701",
  contactPhone: "(555) 123-4567",
  contactEmail: "info@gracechurch.org",
  contactWeb: "",
  formspreeId: "",

  facebook: "",
  instagram: "",
  youtube: "",
  twitter: "",
  footerText: "",

  accent: "#6c4ecb",
  headingFont: "'Playfair Display', serif",

  siteUrl: "",
  metaDesc: "",
  ogImage: "",
  favicon: "",
  logoUrl: "",

  donationUrl: "",
  donationText: "Give",
  privacyPolicyUrl: "",
  cookieNotice: "",
  announcementBanner: "",
};
