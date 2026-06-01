import {
  Role,
  User,
  Product,
  HelpStep,
  HelpGuide,
  HelpTopic,
  AppGuideStep,
  HelpTopicRole,
  HelpTopicCategory,
  BackendHelpTopic,
  TabKey,
  AdminSection
} from "./types";

export const defaultCategories = ["All", "Weight Management", "Digestive Care", "Skin Care"];
export const availabilityOptions = ["AVAILABLE", "COMING_SOON", "OUT_OF_STOCK"] as const;
export const userStatusOptions = ["ACTIVE", "INACTIVE", "SUSPENDED", "TERMINATED"] as const;
export const orderStatusOptions = [
  "CREATED",
  "MONEY_COLLECTED_BY_LEVEL_2",
  "MONEY_TRANSFERRED_TO_LEVEL_1",
  "MONEY_TRANSFERRED_TO_MANAGER",
  "MONEY_RECEIVED_BY_COMPANY",
  "PRODUCT_RELEASED_BY_COMPANY",
  "PRODUCT_RECEIVED_BY_MANAGER",
  "PRODUCT_RECEIVED_BY_LEVEL_1",
  "PRODUCT_RECEIVED_BY_LEVEL_2",
  "DELIVERED_TO_CUSTOMER",
  "CANCELLED"
] as const;
export const paymentStatusOptions = ["PENDING", "PARTIALLY_RECEIVED", "RECEIVED_BY_COMPANY", "DISPUTED", "CANCELLED"] as const;
export const commissionStatusOptions = ["PENDING", "APPROVED", "PAID", "CANCELLED", "ADJUSTED"] as const;

export const trustCards = [
  { icon: "A", title: "Authentic Ayurvedic methodology" },
  { icon: "B", title: "Balanced botanical blend for daily support" },
  { icon: "Q", title: "Quality checked products" },
  { icon: "V", title: "Designed to support natural vitality and balance" }
];

export const wellnessHighlights = [
  "Researched & crafted by experts",
  "New-age formulations",
  "Traditional wellness approach",
  "Non habit forming"
];

export const customerReviews = [
  {
    name: "Satyaraj",
    location: "Coimbatore",
    text: "The product bundle felt easy to include in my daily wellness routine, and the ordering flow was simple."
  },
  {
    name: "Durga",
    location: "Hyderabad",
    text: "I liked the clear product information and the traditional wellness approach behind the range."
  },
  {
    name: "Zain",
    location: "Kochi",
    text: "Kerala Ayurvedh feels trustworthy and focused on natural daily balance."
  }
];

export const treeRoleFilters: Array<Role | "ALL" | "ACTIVE_ONLY"> = ["ALL", "MANAGER", "BETA_MANAGER", "LEVEL_1", "LEVEL_2", "CUSTOMER", "ACTIVE_ONLY"];

export const adminSections: Array<{ key: AdminSection; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "applications", label: "Applications" },
  { key: "payment-verifications", label: "Payment Verifications" },
  { key: "users", label: "Users" },
  { key: "orders", label: "Orders" },
  { key: "payments", label: "Payments" },
  { key: "commissions", label: "Commissions" },
  { key: "reports", label: "Reports" },
  { key: "help", label: "Help Manager" },
  { key: "system", label: "System Monitor" },
  { key: "matrix", label: "Matrix" },
  { key: "audit", label: "Audit" },
  { key: "security", label: "Security" }
];

export const helpGuides: Record<Role, HelpGuide> = {
  ADMIN: {
    role: "ADMIN",
    title: "Company Admin Work",
    message: "You control users, products, orders, payments and reports.",
    steps: [
      { icon: "1", title: "Check Applications", text: "People who want login will appear here.", route: "admin", action: "Open Admin" },
      { icon: "2", title: "Approve Members", text: "Check details. Create login only after payment confirmation.", route: "admin", action: "Open Applications" },
      { icon: "3", title: "Add Products", text: "Add product name, price, image and details.", route: "products", action: "Open Products" },
      { icon: "4", title: "Update Stock", text: "Keep stock correct so users know what is available.", route: "products", action: "Open Products" },
      { icon: "5", title: "Check Orders", text: "See new orders and update their status.", route: "admin", action: "Open Orders" },
      { icon: "6", title: "Confirm Payments", text: "Confirm payment only after money reaches company.", route: "payments", action: "Open Payments" },
      { icon: "7", title: "Release Commissions", text: "Mark commission paid after payout is done.", route: "commissions", action: "Open Earnings" },
      { icon: "8", title: "Check Reports", text: "Use reports to see users, orders, stock and commission.", route: "admin", action: "Open Reports" },
      { icon: "9", title: "Check System Monitor", text: "Check app and database health from Company Admin.", route: "admin", action: "Open System Monitor" },
      { icon: "10", title: "Support Users", text: "Help users when payment, order or login is confusing.", route: "help", action: "Open Help" }
    ],
    nextActions: [
      { icon: "A", title: "Check pending applications", text: "Open Company Admin and review new requests.", route: "admin", action: "Open Admin" },
      { icon: "P", title: "Check pending payments", text: "Confirm only after payment reaches company.", route: "payments", action: "Open Payments" },
      { icon: "S", title: "Check low stock products", text: "Open Products and update stock if needed.", route: "products", action: "Open Products" },
      { icon: "C", title: "Check pending commissions", text: "Open Earnings and update payout status.", route: "commissions", action: "Open Earnings" }
    ]
  },
  MANAGER: {
    role: "MANAGER",
    title: "Manager Work",
    message: "You grow your team and track confirmed customers.",
    steps: [
      { icon: "1", title: "Add Representative", text: "Add your Representative member from Network.", route: "network", action: "Open Network" },
      { icon: "2", title: "Help Your Team", text: "Help Representatives add customer members.", route: "tree", action: "Open Structure" },
      { icon: "3", title: "Track Network", text: "See your team and customer progress.", route: "tree", action: "Open Structure" },
      { icon: "4", title: "Check Payment", text: "Check if member payment is confirmed.", route: "payments", action: "Open Payments" },
      { icon: "5", title: "Check Earnings", text: "Your commission appears after company confirmation.", route: "commissions", action: "Open Earnings" },
      { icon: "6", title: "Complete 216 Customers", text: "Only confirmed customers count for this target.", route: "dashboard", action: "Open Home" },
      { icon: "7", title: "Unlock Beta Manager", text: "After 216 confirmed customers, Beta Manager can be added.", route: "network", action: "Open Network" },
      { icon: "8", title: "Follow Payment Handover", text: "Give collected money to the correct higher level.", route: "payments", action: "Open Payments" }
    ],
    nextActions: [
      { icon: "1", title: "Add your Representative member", text: "Open Network and create your next member.", route: "network", action: "Open Network" },
      { icon: "2", title: "Check 216 customer progress", text: "Open Home to see Beta Manager progress.", route: "dashboard", action: "Open Home" },
      { icon: "3", title: "Open Structure", text: "See your team clearly.", route: "tree", action: "Open Structure" }
    ]
  },
  BETA_MANAGER: {
    role: "BETA_MANAGER",
    title: "Beta Manager Work",
    message: "You track your matrix and confirmed customer progress.",
    steps: [
      { icon: "1", title: "Understand Matrix", text: "Your matrix target is 216 confirmed customers.", route: "tree", action: "Open Structure" },
      { icon: "2", title: "Add Customers", text: "Customers are added through your network.", route: "network", action: "Open Network" },
      { icon: "3", title: "Track Confirmed Customers", text: "Only confirmed customers count.", route: "dashboard", action: "Open Home" },
      { icon: "4", title: "Representative Commission", text: "Representative gets customer commission after confirmation.", route: "commissions", action: "Open Earnings" },
      { icon: "5", title: "Held Amount", text: "Manager amount is held until target is complete.", route: "commissions", action: "Open Earnings" },
      { icon: "6", title: "Complete 216", text: "Complete all 216 confirmed customers.", route: "tree", action: "Open Structure" },
      { icon: "7", title: "Check Released Amount", text: "Released payment appears after completion.", route: "payments", action: "Open Payments" }
    ],
    nextActions: [
      { icon: "M", title: "Check matrix progress", text: "Open Structure and see progress.", route: "tree", action: "Open Structure" },
      { icon: "C", title: "Track confirmed customers", text: "Only confirmed customers count.", route: "dashboard", action: "Open Home" }
    ]
  },
  LEVEL_1: {
    role: "LEVEL_1",
    title: "Representative Work",
    message: "You onboard partners, build your team and check your earnings.",
    steps: [
      { icon: "1", title: "Add Team Member", text: "Add Representative member from Network.", route: "network", action: "Open Network" },
      { icon: "2", title: "Check Network", text: "See your Representatives and customers.", route: "tree", action: "Open Structure" },
      { icon: "3", title: "Check Payment Status", text: "Payments update after confirmation.", route: "payments", action: "Open Payments" },
      { icon: "4", title: "Check Commission", text: "Commission appears after company confirmation.", route: "commissions", action: "Open Earnings" },
      { icon: "5", title: "Help Team Member", text: "Help Representatives add customers correctly.", route: "network", action: "Open Network" }
    ],
    nextActions: [
      { icon: "1", title: "Add Representative member", text: "Open Network and create Representative.", route: "network", action: "Open Network" },
      { icon: "2", title: "Check earnings", text: "Open Earnings to see commission.", route: "commissions", action: "Open Earnings" }
    ]
  },
  LEVEL_2: {
    role: "LEVEL_2",
    title: "Representative Work",
    message: "You add customers and earn after confirmation.",
    steps: [
      { icon: "1", title: "Add Customer", text: "Add customer from Network.", route: "network", action: "Add Customer" },
      { icon: "2", title: "Help Customer Choose", text: "Open Products and show product details.", route: "products", action: "Select Product" },
      { icon: "3", title: "Place Order", text: "Add products to Cart and proceed to Checkout.", route: "cart", action: "Place Order" },
      { icon: "4", title: "Complete Payment", text: "Follow company payment handover rule.", route: "payments", action: "Complete Payment" },
      { icon: "5", title: "Check Order Status", text: "Order status updates after confirmation.", route: "my-orders", action: "Check Order Status" },
      { icon: "6", title: "Check Commission", text: "Your commission appears after confirmation.", route: "commissions", action: "Check Earnings" }
    ],
    nextActions: [
      { icon: "1", title: "Add customer", text: "Open Network and create customer.", route: "network", action: "Open Network" },
      { icon: "2", title: "Check customer order status", text: "Open My Orders to see order details.", route: "my-orders", action: "Open My Orders" }
    ]
  },
  CUSTOMER: {
    role: "CUSTOMER",
    title: "Customer Work",
    message: "You can view products and place orders.",
    steps: [
      { icon: "1", title: "Open Products", text: "See all available products.", route: "products", action: "Open Products" },
      { icon: "2", title: "Select Product", text: "Open details and read price, size and usage.", route: "products", action: "Select Product" },
      { icon: "3", title: "Place Order", text: "Add products to Cart and proceed to Checkout.", route: "cart", action: "Place Order" },
      { icon: "4", title: "Complete Payment", text: "Follow company payment rule.", route: "payments", action: "Complete Payment" },
      { icon: "5", title: "Check Order Status", text: "Order status updates after confirmation.", route: "my-orders", action: "Check Order Status" },
      { icon: "6", title: "Contact Support", text: "Ask for help if payment or order is confusing.", route: "help", action: "Contact Support" }
    ],
    nextActions: [
      { icon: "1", title: "View products", text: "Open Products and choose item.", route: "products", action: "Open Products" },
      { icon: "2", title: "Check order status", text: "Open My Orders to see orders.", route: "my-orders", action: "Open My Orders" }
    ]
  }
};

export const commonHelpTopics: HelpTopic[] = [
  { id: "login", title: "How to login", keywords: ["login", "password", "phone"], text: "Use your phone number and password given by company/admin.", steps: ["Open the app", "Enter phone number", "Enter password", "Tap Sign in"], route: "profile", action: "Open Profile" },
  { id: "password", title: "How to change login details", keywords: ["password", "security", "login", "phone"], text: "Change password when you want a new secure password. Company Admin can also change the admin login phone number from Security.", steps: ["Open More", "Open Security", "Enter current password", "Enter new password or admin login phone", "Tap the relevant change button"], route: "security", action: "Open Security" },
  { id: "products", title: "How to view products", keywords: ["products", "stock", "price"], text: "Products page shows product details, price and availability.", steps: ["Open Products", "Search or select product", "Read details", "Check price and availability"], route: "products", action: "Open Products" },
  { id: "order", title: "How payment & order flow works", keywords: ["order", "product", "quantity", "flow", "status"], text: "Placing and tracking customer orders follows a defined 11-stage process. You can browse products under the Products tab, select the items and quantities, and tap 'Place Order' to initialize the request. The order will progress through the following statuses: (1) CREATED: Order is logged. (2) MONEY_COLLECTED_BY_LEVEL_2: Representative collects customer funds. (3) MONEY_TRANSFERRED_TO_LEVEL_1: Funds handed over to direct Representative upline. (4) MONEY_TRANSFERRED_TO_MANAGER: Funds handed over to team Manager. (5) MONEY_RECEIVED_BY_COMPANY: Admin confirms funds in bank. (6) PRODUCT_RELEASED_BY_COMPANY: Package shipped from warehouse. (7) PRODUCT_RECEIVED_BY_MANAGER: Manager receives package. (8) PRODUCT_RECEIVED_BY_LEVEL_1: Representative upline receives package. (9) PRODUCT_RECEIVED_BY_LEVEL_2: Representative receives package. (10) DELIVERED_TO_CUSTOMER: Customer receives their order. (11) CANCELLED: Order is terminated. Orders can be cancelled at any point before the company releases products.", steps: ["Open the Products tab to view the Ayurvedic catalog", "Select the product, set the quantity, and tap 'Place Order'", "Note the Order ID and share it with your sponsor/upline", "Track the 11-stage order status in your orders history list", "Verify each physical handover and receive stage as the product travels to the customer"], route: "products", action: "Open Products" },
  { id: "payment", title: "How payment handover works", keywords: ["payment", "handover", "pending", "receipt", "rules"], text: "All order payments are processed through a strictly monitored multi-tier manual handover sequence. (1) Customers pay their direct Representative via cash or UPI. (2) The Representative transfers/hands over the collected funds to their direct Representative upline. (3) The Representative upline consolidates and transfers the funds to their team Manager. (4) The Manager transfers the funds directly to the Company. For every handover, you MUST log the transaction in the Payments tab, enter the amount, select the corresponding Order ID, and upload a valid transaction receipt (image or PDF). The status will remain PENDING until the recipient verifies the funds and marks it as RECEIVED. Only received payments will trigger order processing and commission payouts.", steps: ["Collect payment (cash/UPI) from your customer or direct representative", "Navigate to the Payments tab inside the app", "Tap 'Record Payment Handover' to log the transaction", "Enter the exact amount and select the correct Order ID", "Upload a clear photo or PDF proof of the payment/transaction receipt", "Submit the handover and wait for the recipient to verify and approve it"], route: "payments", action: "Open Payments" },
  { id: "commission", title: "How commission & passive earnings work", keywords: ["commission", "earning", "earnings", "employee id", "passive", "beta", "matrix"], text: "Kerala Ayurvedh offers rewarding commissions for active members and team builders: (1) Direct Referral: Representative advisors earn a flat Rs 1,000 commission for each Representative they directly recruit. (2) Passive Earnings: Representative advisors earn a passive Rs 500 commission whenever their active Representatives onboard new customers or sell products. (3) Manager Commissions: Managers earn Rs 1,000 for each direct Representative member, and Rs 500 for each Representative that joins their team. (4) Beta Matrix: Capped at 216 confirmed customers. For every customer added within a Manager's Beta Matrix, Rs 500 is held as pending. Once the matrix is fully completed with 216 confirmed customers, the Manager receives a major lump-sum payout of Rs 108,000. All commissions are updated to PENDING instantly and are approved/paid after payment confirmation.", steps: ["Recruit members using your unique Employee ID from the Profile tab", "Ensure new representatives enter your Employee ID when applying", "Help your Representative team onboard customers to earn Rs 500 passive gains", "Track normal customer counts to unlock the Beta Matrix upgrade", "Monitor your Earnings ledger for pending, approved, and paid commissions"], route: "commissions", action: "Open Earnings" },
  { id: "tree", title: "How Structure works", keywords: ["tree", "network", "manager", "customer"], text: "Structure shows your team and customers.", steps: ["Open Structure", "Zoom or move the tree", "Tap a person", "Read details"], route: "tree", action: "Open Structure" },
  { id: "support", title: "How to contact support", keywords: ["support", "help", "confused", "email"], text: "Our customer and representative support desk assists with payment disputes, order delays, role upgrades, or system usage questions by email only. Official support hours are Monday to Saturday, from 9:00 AM to 6:00 PM. Contact support@keralaayurvedh.com with your User ID, Order ID if applicable, and screenshots.", steps: ["Open the Help tab inside the app", "Tap the Email button in the Need help section", "Include your User ID and Order ID if the question is about an order or payment", "Attach screenshots or receipt proof when useful", "Wait for the support team to reply by email"], route: "help", action: "Open Help" },
  { id: "privacy", title: "Privacy and Aadhaar consent", keywords: ["privacy", "aadhaar", "consent", "identity"], text: "Kerala Ayurvedh collects Aadhaar numbers only for identity verification, application review, fraud prevention, business compliance, and legal recordkeeping. Aadhaar images are not collected. Payment proofs are private and visible only through authorized secure links.", steps: ["Read the consent text before submitting an application or upgrade request", "Submit Aadhaar numbers only when the applicant has consented", "Do not upload Aadhaar images", "Email support@keralaayurvedh.com for privacy questions or correction requests"], route: "help", action: "Open Help" },
  { id: "cancelled", title: "What if order is cancelled", keywords: ["cancelled", "order"], text: "Cancelled order means the order will not continue.", steps: ["Open Products", "Check order status", "Ask admin if you do not understand"], route: "products", action: "Open Products" },
  { id: "beta", title: "What are 216 confirmed customers", keywords: ["216", "beta", "manager", "matrix"], text: "Only customers confirmed by company count for the 216 target.", steps: ["Add customers through the correct flow", "Wait for company confirmation", "Track progress", "Beta Manager unlocks after target rules are met"], route: "dashboard", action: "Open Home" }
];

export function catalogCategories(products: Product[]) {
  return Array.from(new Set([...defaultCategories, ...products.map((product) => product.category).filter(Boolean)]));
}

export function parseHelpSteps(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [];
    } catch {
      return value.split("\n").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

export function routeFromHelpTopic(route?: string | null): TabKey | undefined {
  const validRoutes: TabKey[] = ["dashboard", "products", "network", "more", "admin", "tree", "commissions", "payments", "profile", "security", "help"];
  return route && validRoutes.includes(route as TabKey) ? route as TabKey : undefined;
}

export function canAccessTab(role: Role, tab: TabKey) {
  if (tab === "admin") return role === "ADMIN";
  if (tab === "network" || tab === "tree" || tab === "commissions") return role !== "CUSTOMER";
  return true;
}

export function safeDefaultTab(role: Role, tab: TabKey) {
  return canAccessTab(role, tab) ? tab : "dashboard";
}

export function visiblePrimaryTabs(role: Role): Array<{ key: TabKey; label: string; icon: string }> {
  if (role === "CUSTOMER") {
    return [
      { key: "dashboard", label: "Home", icon: "🏠" },
      { key: "products", label: "Shop", icon: "🛒" },
      { key: "my-orders", label: "Orders", icon: "📦" },
      { key: "payments", label: "Payments", icon: "💳" },
      { key: "profile", label: "Profile", icon: "👤" }
    ];
  }
  return [
    { key: "dashboard", label: "Home", icon: "H" },
    { key: "products", label: "Products", icon: "P" },
    { key: "network", label: "Network", icon: "N" },
    { key: "more", label: "More", icon: "M" }
  ];
}

export function filterHelpTopicsForRole(topics: HelpTopic[], role: Role) {
  return topics.filter((topic) => {
    if (role !== "ADMIN" && topic.category === "ADMIN") return false;
    return !topic.route || canAccessTab(role, topic.route);
  });
}

export function backendTopicToHelpTopic(topic: BackendHelpTopic): HelpTopic {
  const route = routeFromHelpTopic(topic.relatedRoute);
  return {
    id: topic.id,
    title: topic.title,
    keywords: [topic.title, topic.shortDescription, topic.category, topic.role],
    text: topic.shortDescription || topic.content,
    steps: parseHelpSteps(topic.steps),
    category: topic.category,
    route,
    action: route ? `Open ${topic.relatedRoute?.replaceAll("_", " ")}` : undefined
  };
}

export const helpTopicRoleOptions = ["ALL", "CUSTOMER", "LEVEL_2", "LEVEL_1", "BETA_MANAGER", "MANAGER", "ADMIN"] as const;

export const helpTopicCategoryOptions = ["MY_WORK", "PRODUCTS", "NETWORK", "PAYMENTS", "EARNINGS", "ADMIN", "SUPPORT", "FAQ"] as const;

export const helpRouteOptions = [
  { id: "", label: "No related screen" },
  { id: "dashboard", label: "Home" },
  { id: "products", label: "Products" },
  { id: "network", label: "Network" },
  { id: "more", label: "More" },
  { id: "admin", label: "Company Admin" },
  { id: "tree", label: "Structure" },
  { id: "commissions", label: "Earnings" },
  { id: "payments", label: "Payments" },
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "help", label: "Help" }
];

export function firstTimeGuideKey(userId: string) {
  return `hasSeenFirstTimeGuide:${userId}`;
}

export function buildFirstTimeGuideSteps(role: Role): AppGuideStep[] {
  const commonSteps: AppGuideStep[] = [
    { icon: "1", title: "Welcome", text: role === "CUSTOMER" ? "This app helps you view Kerala Ayurvedh products and your order details." : "This app helps you use Kerala Ayurvedh products and business tools." },
    { icon: "2", title: "Home", text: "See important updates and quick options here." },
    { icon: "3", title: "Products", text: "Open Products to view and order products." },
    ...(role === "CUSTOMER"
      ? [{ icon: "4", title: "Payments", text: "Check your payment and order status here." }]
      : [
          { icon: "4", title: "Network", text: "See your team and customers here." },
          { icon: "5", title: "Payments and Earnings", text: "Check payment status and commission here." }
        ]),
    { icon: "6", title: "Help", text: "Open Help anytime if you do not know what to do." }
  ];

  const roleSteps: Record<Role, AppGuideStep[]> = {
    ADMIN: [
      { icon: "A", title: "Admin Work", text: "Check applications, approve members and add products." },
      { icon: "P", title: "Payments", text: "Confirm payments only after money reaches company." },
      { icon: "R", title: "Reports", text: "Check reports and system monitor inside Company Admin." }
    ],
    MANAGER: [
      { icon: "M", title: "Manager Work", text: "Add Level 1 members and track your network." },
      { icon: "216", title: "216 Customers", text: "Track confirmed customers to unlock Beta Manager." },
      { icon: "E", title: "Earnings", text: "Check your commission after company confirmation." }
    ],
    BETA_MANAGER: [
      { icon: "B", title: "Matrix", text: "Track matrix progress and confirmed customers." },
      { icon: "P", title: "Payments", text: "Check released payment after target completion." }
    ],
    LEVEL_1: [
      { icon: "L1", title: "Level 1 Work", text: "Add Representative members and check your network." },
      { icon: "E", title: "Earnings", text: "Check commission after payment confirmation." }
    ],
    LEVEL_2: [
      { icon: "L2", title: "Representative Work", text: "Add customers and help them choose products." },
      { icon: "C", title: "Commission", text: "Check commission after company confirmation." }
    ],
    CUSTOMER: [
      { icon: "C", title: "Customer Work", text: "View products, place order and check order status." }
    ]
  };

  return [...commonSteps, ...roleSteps[role]];
}

export function defaultCreateRole(role: Role): Role {
  if (role === "ADMIN") return "MANAGER";
  if (role === "MANAGER") return "LEVEL_1";
  if (role === "BETA_MANAGER") return "LEVEL_1";
  if (role === "LEVEL_1") return "LEVEL_2";
  return "CUSTOMER";
}

export function createRoleOptions(role: Role): Role[] {
  if (role === "ADMIN") return ["MANAGER", "BETA_MANAGER", "LEVEL_1", "LEVEL_2", "CUSTOMER"];
  if (role === "MANAGER") return ["LEVEL_1", "BETA_MANAGER"];
  if (role === "BETA_MANAGER") return ["LEVEL_1"];
  if (role === "LEVEL_1") return ["LEVEL_2"];
  if (role === "LEVEL_2") return ["CUSTOMER"];
  return [];
}

export function getSponsorOptions(role: Role, users: User[]) {
  if (role === "BETA_MANAGER") {
    return users.filter((user) => user.role === "MANAGER" && user.betaManagerEligibility?.canCreateBetaManager);
  }
  if (role === "LEVEL_1") {
    return users.filter((user) => user.role === "MANAGER" || user.role === "BETA_MANAGER");
  }
  if (role === "LEVEL_2") {
    return users.filter((user) => user.role === "LEVEL_1");
  }
  if (role === "CUSTOMER") {
    return users.filter((user) => user.role === "LEVEL_2");
  }
  return [];
}

export function betaEligibilityLabel(user: User) {
  const eligibility = user.betaManagerEligibility;
  if (!eligibility) return "0/216 customers";
  return `${eligibility.confirmedCustomers}/${eligibility.requiredCustomers} customers`;
}
