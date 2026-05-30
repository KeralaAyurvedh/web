import { prisma } from "./utils/prisma";

async function main() {
  const products = await prisma.product.findMany();
  console.log("Total products:", products.length);
  for (const p of products) {
    console.log(`Product ID: ${p.id}, Name: ${p.name}, ImageUrl: ${p.imageUrl}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
