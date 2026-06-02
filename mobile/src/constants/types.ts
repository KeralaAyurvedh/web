export type Role = "ADMIN" | "MANAGER" | "BETA_MANAGER" | "LEVEL_1" | "LEVEL_2" | "CUSTOMER";

export type User = {
  id: string;
  name: string;
  phone: string;
  role: Role;
  status: string;
  referralCode: string;
  profileUnlocked?: boolean;
  sponsorId?: string | null;
  placementType?: string;
  betaManagerEligibility?: {
    confirmedCustomers: number;
    requiredCustomers: number;
    canCreateBetaManager: boolean;
    hasBetaManager: boolean;
  };
};

export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  shortDescription: string;
  fullDescription: string;
  usageInstructions: string;
  benefits: string;
  size: string;
  price: string;
  discountPrice?: number;
  imageUrl?: string;
  stock?: number;
  availability: ProductAvailability;
  isActive: boolean;
};

export type StockAdjustment = {
  id: string;
  type: "ADD" | "REMOVE" | "CORRECTION";
  quantity: number;
  beforeStock: number;
  afterStock: number;
  reason: string;
  createdAt: string;
  product?: { id: string; name: string; category: string; stock: number };
  actor?: { id: string; name: string; phone: string; role: Role };
};

export type Commission = {
  id: string;
  amount: string;
  type: string;
  status: string;
  createdAt: string;
  receiver?: { id: string; name: string; phone: string; role: Role };
  sourceUser?: { id: string; name: string; phone: string; role: Role };
};

export type Handover = {
  id: string;
  amount: string;
  status: PaymentHandoverStatusValue;
  proofUrl?: string | null;
  proofFile?: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt?: string;
  } | null;
  fromUserId?: string;
  toUserId?: string;
  createdAt: string;
  fromUser?: { id: string; name: string; phone: string; role: Role };
  toUser?: { id: string; name: string; phone: string; role: Role };
  order?: { id: string; totalAmount: string; status: string; paymentStatus: string };
  notes?: string | null;
};

export type Matrix = {
  id: string;
  status: string;
  confirmedCustomers: number;
  requiredCustomers: number;
  pendingAmount: string;
  completionAmount: string;
  rootManager?: { name: string; phone: string };
  betaManager?: { name: string; phone: string };
};

export type Order = {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  customer?: { id: string; name: string; phone: string; role: Role };
  items?: Array<{ product?: { id: string; name: string }; quantity: number }>;
};

export type ProductAvailability = "AVAILABLE" | "OUT_OF_STOCK" | "COMING_SOON";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TERMINATED";
export type OrderStatus = "CREATED" | "MONEY_COLLECTED_BY_LEVEL_2" | "MONEY_TRANSFERRED_TO_LEVEL_1" | "MONEY_TRANSFERRED_TO_MANAGER" | "MONEY_RECEIVED_BY_COMPANY" | "PRODUCT_RELEASED_BY_COMPANY" | "PRODUCT_RECEIVED_BY_MANAGER" | "PRODUCT_RECEIVED_BY_LEVEL_1" | "PRODUCT_RECEIVED_BY_LEVEL_2" | "DELIVERED_TO_CUSTOMER" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PARTIALLY_RECEIVED" | "RECEIVED_BY_COMPANY" | "DISPUTED" | "CANCELLED";
export type PaymentHandoverStatusValue = "PENDING" | "HANDED_OVER" | "RECEIVED" | "DISPUTED" | "CANCELLED";
export type CommissionStatusValue = "PENDING" | "APPROVED" | "PAID" | "CANCELLED" | "ADJUSTED";

export type Session = {
  token: string;
  user: User;
};

export type TabKey = "dashboard" | "products" | "network" | "more" | "admin" | "tree" | "commissions" | "payments" | "profile" | "security" | "help" | "cart" | "my-orders";

export type AdminStats = {
  totalUsers: number;
  totalProducts: number;
  activeProducts: number;
  comingSoonProducts: number;
  outOfStockProducts: number;
  lowStockCount?: number;
  lowStockProducts?: Product[];
  pendingUserPayments: number;
  pendingOrderPayments: number;
  pendingApplications: number;
  commissions: Array<{ status: string; count: number; amount: string | number }>;
  matrices: Matrix[];
};

export type RoleDashboardStats = {
  role: Role;
  directDownline: number;
  activeDirectDownline: number;
  customerDownline: number;
  orders: number;
  pendingOrders: number;
  handovers: number;
  pendingHandovers: number;
  commissionCount: number;
  commissionTotal: string | number;
  pendingCommissionTotal: string | number;
  approvedCommissionTotal: string | number;
  matrix?: {
    status: string;
    confirmedCustomers: number;
    requiredCustomers: number;
    pendingAmount: string | number;
    completionAmount: string | number;
  } | null;
};

export type CountAmountRow = {
  status?: string;
  type?: string;
  role?: string;
  count: number;
  amount?: string | number;
};

export type AdminReport = {
  filters: { from?: string | null; to?: string | null };
  users: {
    byRole: CountAmountRow[];
    byStatus: CountAmountRow[];
  };
  orders: {
    byStatus: CountAmountRow[];
    byPaymentStatus: CountAmountRow[];
    recent: Order[];
  };
  commissions: {
    byStatus: CountAmountRow[];
    byType: CountAmountRow[];
    recent: Commission[];
  };
  payments: {
    handoversByStatus: CountAmountRow[];
  };
  stock: {
    totalStock: number;
    lowStockCount: number;
    lowStockProducts: Product[];
    products: Product[];
  };
};

export type DatabaseTableStat = {
  tableName: string;
  totalSizeBytes: number;
  totalSizePretty: string;
  tableSizePretty: string;
  indexSizePretty: string;
  toastSizePretty?: string;
  estimatedRows: number;
  liveRows: number;
  deadRows: number;
  lastVacuum?: string | null;
  lastAutovacuum?: string | null;
  lastAnalyze?: string | null;
  lastAutoanalyze?: string | null;
};

export type DatabaseStats = {
  database: {
    name: string;
    sizeBytes: number;
    sizePretty: string;
    storageLimitMb: number | null;
    usedPercent: number | null;
    status: "healthy" | "warning" | "critical" | "limit_not_configured" | string;
    postgresVersion: string;
    checkedAt: string;
    serverUptime?: string | null;
    activeConnections: number;
    maxConnections?: number | null;
    health: string;
  };
  tables: DatabaseTableStat[];
  businessCounts: Record<string, number | null>;
  activity: Record<string, number | null>;
  warnings: string[];
};

export type UploadStorageStats = {
  storage: {
    storageProvider?: string;
    totalBytes: number;
    totalPretty: string;
    fileCount: number;
    fileAssetCount?: number;
    sensitiveFileCount?: number;
    aadhaarUploads: number;
    panUploads: number;
    paymentProofUploads: number;
    applicationUploads: number;
    productUploads: number;
    localStorage: boolean;
    largestFiles: Array<{ relativeName: string; category: string; sizeBytes: number }>;
  };
  warnings: string[];
};

export type SystemHealth = {
  health: {
    apiStatus: string;
    databaseStatus: string;
    prismaStatus: string;
    environment: string;
    appVersion: string;
    serverTime: string;
    uptimeSeconds: number;
    uptimePretty: string;
    memory: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
    nodeVersion: string;
    lastReadinessCheck: string;
  };
};

export type BackupStatus = {
  backup: {
    directory: string;
    fileCount: number;
    latestBackup?: {
      fileName: string;
      sizeBytes: number;
      createdAt: string;
      modifiedAt: string;
    } | null;
    latestAgeHours?: number | null;
    maxAgeHours: number;
    status: "healthy" | "warning" | "critical" | string;
    recentFiles: Array<{
      fileName: string;
      sizeBytes: number;
      createdAt: string;
      modifiedAt: string;
    }>;
  };
  warnings: string[];
};

export type AdminUserDetail = User & {
  email?: string | null;
  placementType?: string;
  companyPaymentConfirmedAt?: string | null;
  commissionProcessedAt?: string | null;
  sponsor?: User | null;
  downline?: User[];
  orders?: Order[];
  collectedOrders?: Order[];
  commissions?: Commission[];
  commissionSources?: Commission[];
};

export type TreePerson = Omit<User, "role"> & {
  role: Role | "COMPANY";
  companyPaymentConfirmedAt?: string | null;
  commissionProcessedAt?: string | null;
  childrenCount?: number;
  sponsorName?: string;
};

export type TreeLayoutNode = {
  person: TreePerson;
  x: number;
  y: number;
  width: number;
  depth: number;
  children: TreeLayoutNode[];
  collapsedChildrenCount: number;
};

export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: unknown;
  createdAt: string;
  actor?: { name: string; phone: string; role: Role };
};

export type AdminRequest = {
  id: string;
  status: string;
  reason?: string;
  fromRole?: Role;
  toRole?: Role;
  targetSponsorId?: string;
  toSponsorId?: string;
  requester?: User;
  subjectUser?: User;
  aadhaarNumber?: string | null;
  panNumber?: string | null;
  privacyConsentAcceptedAt?: string | null;
};

export type MemberApplication = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  requestedRole: Role;
  sponsorPhone?: string | null;
  aadhaarNumber?: string | null;
  panNumber?: string | null;
  privacyConsentAcceptedAt?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  rejectionReason?: string | null;
  approvedUser?: User | null;
  createdAt: string;
};

export type ApplicationStatusResult = Pick<MemberApplication, "id" | "name" | "phone" | "requestedRole" | "status" | "rejectionReason" | "createdAt"> & {
  decidedAt?: string | null;
};

export type PaymentVerificationStatus = "PENDING_VERIFICATION" | "APPROVED" | "REJECTED";

export type PaymentVerification = {
  id: string;
  applicantData: {
    name: string;
    phone: string;
    email?: string | null;
    sponsorReferralCode?: string | null;
    sponsorPhone?: string | null;
    aadhaarNumber?: string | null;
    panNumber?: string | null;
    privacyConsentAccepted?: boolean;
    password?: string | null;
  };
  addedByUserId?: string | null;
  roleApplyingFor: Role;
  transactionId?: string | null;
  screenshotUrl?: string | null;
  amount: number;
  status: PaymentVerificationStatus;
  rejectionReason?: string | null;
  submittedAt: string;
  verifiedAt?: string | null;
  verifiedByAdminId?: string | null;
};

export type AdminSection = "overview" | "applications" | "users" | "orders" | "payments" | "commissions" | "reports" | "help" | "system" | "matrix" | "audit" | "security" | "payment-verifications";
export type MoreMenuItem = { key: TabKey | "logout" | "update"; title: string; description: string; icon: string; adminOnly?: boolean; danger?: boolean };
export type HelpStep = { icon: string; title: string; text: string; route?: TabKey; action?: string };
export type HelpGuide = { role: Role; title: string; message: string; steps: HelpStep[]; nextActions: HelpStep[] };
export type HelpTopic = { id: string; title: string; keywords: string[]; text: string; steps: string[]; category?: HelpTopicCategory; route?: TabKey; action?: string };
export type AppGuideStep = { title: string; text: string; icon: string };
export type HelpTopicRole = "ALL" | Role;
export type HelpTopicCategory = "MY_WORK" | "PRODUCTS" | "NETWORK" | "PAYMENTS" | "EARNINGS" | "ADMIN" | "SUPPORT" | "FAQ";
export type BackendHelpTopic = {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  role: HelpTopicRole;
  category: HelpTopicCategory;
  steps: unknown;
  relatedRoute?: string | null;
  videoUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};
