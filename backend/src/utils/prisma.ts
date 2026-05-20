// Lightweight Prisma stub to allow the server to run in development
// without a configured database. This avoids constructing the
// PrismaClient at import time which prevents startup errors when
// Prisma v7 configuration or DATABASE_URL is not provided.

const stubAsync = async () => null;

const noop = () => stubAsync;

const prisma = {
	user: {
		findUnique: async () => null,
		create: async (data: any) => ({ id: 'stub-id', ...data }),
		findMany: async () => [],
		count: async () => 0,
	},
	product: {
		findMany: async () => [],
		findUnique: async () => null,
	},
	order: {
		create: async (data: any) => ({ id: 'stub-order', ...data }),
		findUnique: async () => null,
		update: async () => null,
		aggregate: async () => ({ _sum: { totalAmount: 0 } }),
	},
	commission: {
		create: async (data: any) => ({ id: 'stub-commission', ...data }),
		aggregate: async () => ({ _sum: { amount: 0 } }),
		findMany: async () => [],
	},
	$queryRaw: async () => [],
};

export default prisma as any;
